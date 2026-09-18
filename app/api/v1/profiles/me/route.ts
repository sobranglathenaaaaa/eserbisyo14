import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  return ok({
    id: auth.profile.id,
    fullName: auth.profile.full_name,
    firstName: auth.profile.first_name,
    middleName: auth.profile.middle_name,
    lastName: auth.profile.last_name,
    suffix: auth.profile.suffix,
    sex: auth.profile.sex,
    civilStatus: auth.profile.civil_status,
    citizenship: auth.profile.citizenship,
    birthdate: auth.profile.birthdate,
    address: auth.profile.address,
    addressLine: auth.profile.address_line,
    province: auth.profile.province,
    city: auth.profile.city,
    barangay: auth.profile.barangay,
    contactNumber: auth.profile.phone,
    idType: auth.profile.id_type,
    idNumber: auth.profile.id_number,
    idFileName: auth.profile.id_file_name,
    idFilePath: auth.profile.id_file_path,
    termsAcceptedAt: auth.profile.terms_accepted_at,
    privacyAcceptedAt: auth.profile.privacy_accepted_at,
    email: auth.profile.email,
    role: auth.profile.role,
    locale: auth.profile.locale,
    isVerified: auth.profile.is_verified,
    approvalStatus: auth.profile.approval_status,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as
    | {
      fullName?: string;
      phone?: string;
      address?: string;
      birthdate?: string;
      sex?: string;
      civilStatus?: string;
      citizenship?: string;
      locale?: 'en' | 'fil';
    }
    | null;
  if (!body) {
    return fail('VALIDATION_ERROR', 'Invalid request body', 400);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.fullName === 'string') updates.full_name = body.fullName.trim();
  if (typeof body.phone === 'string') updates.phone = body.phone.trim();
  if (typeof body.address === 'string') updates.address = body.address.trim();
  if (typeof body.birthdate === 'string') {
    const birthdate = body.birthdate.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(birthdate)) {
      return fail('VALIDATION_ERROR', 'Birthdate must be in YYYY-MM-DD format', 400);
    }
    updates.birthdate = birthdate;
  }
  if (typeof body.sex === 'string') updates.sex = body.sex.trim();
  if (typeof body.civilStatus === 'string') updates.civil_status = body.civilStatus.trim();
  if (typeof body.citizenship === 'string') updates.citizenship = body.citizenship.trim();
  if (body.locale === 'en' || body.locale === 'fil') updates.locale = body.locale;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from('profiles').update(updates).eq('id', auth.userId).select('*').single();
  if (error || !data) {
    return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update profile', 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'profile.update',
    targetId: auth.userId,
    context: updates,
  });

  return ok(data);
}
