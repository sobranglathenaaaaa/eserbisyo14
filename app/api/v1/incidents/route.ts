import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  let query = admin
    .from('incident_reports')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });
  if (auth.role === 'resident') query = query.eq('resident_id', auth.userId);

  const status = request.nextUrl.searchParams.get('status');
  if (status) query = query.eq('status', status);

  const { data, error } = await query.limit(100);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok({ incidents: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'submit_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Resident access required', 403);
  }

  const body = (await request.json().catch(() => null)) as
    | {
        title: string;
        description: string;
        occurredAt: string;
        location: string;
        kind?: string;
        category?: string;
        otherCategoryText?: string;
      }
    | null;
  if (!body?.title || !body?.description || !body?.occurredAt || !body?.location) {
    return fail('VALIDATION_ERROR', 'Missing required incident fields', 400);
  }
  const selectedCategory = (body.category ?? body.kind ?? '').trim();
  if (!selectedCategory) {
    return fail('VALIDATION_ERROR', 'category is required', 400);
  }

  const admin = getSupabaseAdminClient();
  const { data: categoryRecord, error: categoryError } = await admin
    .from('incident_categories')
    .select('id,name,is_active')
    .eq('tenant_id', auth.tenantId)
    .ilike('name', selectedCategory)
    .maybeSingle();

  if (categoryError) return fail('INTERNAL_ERROR', categoryError.message, 500);
  if (!categoryRecord || !categoryRecord.is_active) {
    return fail('VALIDATION_ERROR', 'Selected category is not available', 400);
  }

  const normalizedCategoryName = categoryRecord.name;
  const isOthersCategory = normalizedCategoryName.trim().toLowerCase() === 'others';
  const otherCategoryText = body.otherCategoryText?.trim() ?? '';
  if (isOthersCategory && !otherCategoryText) {
    return fail('VALIDATION_ERROR', 'otherCategoryText is required when Others is selected', 400);
  }

  const normalizedCategoryKey = normalizedCategoryName.trim().toLowerCase();
  const reportKind = normalizedCategoryKey === 'blotter' ? 'blotter' : 'incident';
  const reportCategoryText = isOthersCategory ? otherCategoryText : normalizedCategoryKey === 'incident' || normalizedCategoryKey === 'blotter' ? null : normalizedCategoryName;

  const { data, error } = await admin
    .from('incident_reports')
    .insert({
      tenant_id: auth.tenantId,
      resident_id: auth.userId,
      kind: reportKind,
      other_category_text: reportCategoryText,
      title: body.title.trim(),
      details: body.description.trim(),
      location: body.location.trim(),
      date_of_incident: body.occurredAt.slice(0, 10),
      status: 'pending',
    })
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to create incident', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'incidents.create',
    targetId: data.id,
  });

  return ok(data, { status: 201 });
}
