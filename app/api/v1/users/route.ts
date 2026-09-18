import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient, RESIDENT_ID_UPLOADS_BUCKET } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

const ID_PREVIEW_SIGNED_URL_TTL_SECONDS = 60 * 5;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const registrationQueue = searchParams.get('registrationQueue');

  const isAdmin = auth.role === 'admin';
  const isStaff = auth.role === 'staff';

  if (!isAdmin && !(isStaff && registrationQueue === 'staff')) {
    return fail('AUTH_FORBIDDEN', 'Access denied', 403);
  }

  const admin = getSupabaseAdminClient();
  let query = admin
    .from('profiles')
    .select(
      'id,full_name,first_name,middle_name,last_name,suffix,sex,civil_status,citizenship,birthdate,address,address_line,province,city,barangay,email,phone,id_type,id_number,id_file_name,id_file_path,id_file_name_back,id_file_path_back,role,is_deleted,is_verified,approval_status,staff_reviewed_by,staff_reviewed_at,staff_review_note,approval_reviewed_by,approval_reviewed_at,approval_review_note,created_at,updated_at'
    )
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });

  if (registrationQueue === 'staff') {
    query = query.eq('role', 'resident').eq('is_deleted', false).eq('approval_status', 'pending_staff_review');
  } else if (registrationQueue === 'admin') {
    if (!isAdmin) {
      return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
    }
    query = query.eq('role', 'resident').eq('is_deleted', false).eq('approval_status', 'staff_forwarded_to_admin');
  }

  // If caller didn't request a specific registration queue, hide residents
  // that are currently in the staff review queue from general search results.
  // Admins should still be able to see residents that were forwarded to admin.
  if (!registrationQueue) {
    query = query.neq('approval_status', 'pending_staff_review');
  }

  if (role && !registrationQueue) query = query.eq('role', role);
  if (status === 'active') query = query.eq('is_deleted', false);
  if (status === 'deleted') query = query.eq('is_deleted', true);
  if (search) query = query.ilike('full_name', `%${search}%`);

  const { data, error } = await query.limit(100);
  if (error) {
    return fail('INTERNAL_ERROR', error.message, 500);
  }

  const users = data ?? [];
  
  // We need to return signed URLs for ID previews NOT just for staff queue,
  // but also whenever we are fetching residents for review (e.g. on the Admin side)
  const isResidentList = role === 'resident' || registrationQueue === 'admin' || registrationQueue === 'staff';

  if (!isResidentList) {
    return ok({ users, nextCursor: null });
  }

    const usersWithIdPreview = await Promise.all(
    users.map(async (user) => {
      const idFileSourcePath = user.id_file_path?.trim() || user.id_file_name?.trim();
      const idFileSourcePathBack = user.id_file_path_back?.trim() || user.id_file_name_back?.trim();
      
      let id_file_url: string | null = null;
      let id_file_url_back: string | null = null;

      if (idFileSourcePath) {
        const { data: signedUrlData, error: signedUrlError } = await admin.storage
          .from(RESIDENT_ID_UPLOADS_BUCKET)
          .createSignedUrl(idFileSourcePath, ID_PREVIEW_SIGNED_URL_TTL_SECONDS);

        if (!signedUrlError) {
          id_file_url = signedUrlData.signedUrl;
        }
      }

      if (idFileSourcePathBack) {
        const { data: signedUrlDataBack, error: signedUrlErrorBack } = await admin.storage
          .from(RESIDENT_ID_UPLOADS_BUCKET)
          .createSignedUrl(idFileSourcePathBack, ID_PREVIEW_SIGNED_URL_TTL_SECONDS);

        if (!signedUrlErrorBack) {
          id_file_url_back = signedUrlDataBack.signedUrl;
        }
      }

      return { ...user, id_file_url, id_file_url_back };
    })
    );

    return ok({ users: usersWithIdPreview, nextCursor: null });
  } catch (error) {
    // Log full error for dev diagnostics and return a safe 500 message
    try {
      // eslint-disable-next-line no-console
      console.error('[users.GET] Unexpected error', error);
    } catch (e) {
      // ignore
    }
    return fail('INTERNAL_ERROR', (error as Error)?.message ?? 'Unexpected server error', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'manage_users');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const body = (await request.json().catch(() => null)) as
    | { email: string; password: string; fullName: string; role: 'staff' | 'resident' }
    | null;
  if (!body?.email || !body.password || !body.fullName || !body.role) {
    return fail('VALIDATION_ERROR', 'Missing required user fields', 400);
  }

  const admin = getSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: body.email.trim().toLowerCase(),
    password: body.password,
    email_confirm: true,
  });
  if (createError || !created.user?.id) {
    return fail('RESOURCE_CONFLICT', createError?.message ?? 'Unable to create user', 409);
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .insert({
      id: created.user.id,
      tenant_id: auth.tenantId,
      full_name: body.fullName,
      email: body.email.trim().toLowerCase(),
      role: body.role,
      locale: 'en',
      is_deleted: false,
      is_verified: true,
      approval_status: 'admin_approved',
      approval_reviewed_by: auth.userId,
      approval_reviewed_at: new Date().toISOString(),
      approval_review_note: null,
    })
    .select('*')
    .single();
  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(created.user.id);
    return fail('INTERNAL_ERROR', profileError?.message ?? 'Unable to create profile', 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'users.create',
    targetId: created.user.id,
    context: { role: body.role },
  });

  return ok(profile, { status: 201 });
}
