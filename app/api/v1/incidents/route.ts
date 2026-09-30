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
        streetName?: string;
        specificLocation?: string;
        kind?: string;
        category?: string;
        otherCategoryText?: string;
        relationshipToRespondent?: string;
        trackType?: 'community_concern' | 'incident';
        desiredAction?: 'record_only' | 'request_meeting' | 'none';
        parties?: Array<{ role: 'complainant' | 'respondent' | 'witness'; fullName: string; relationship?: string; contactInfo?: string; address?: string }>;
      }
    | null;
  if (!body?.title || !body?.description || !body?.occurredAt || !body?.location) {
    return fail('VALIDATION_ERROR', 'Missing required incident fields', 400);
  }

  const trackType = body.trackType ?? 'community_concern';
  const defaultCategoryName = trackType === 'community_concern' ? 'Community Concern' : 'Incident';
  const selectedCategory = (body.category ?? body.kind ?? defaultCategoryName).trim();

  const admin = getSupabaseAdminClient();
  let { data: categoryRecord } = await admin
    .from('incident_categories')
    .select('id,name,is_active')
    .eq('tenant_id', auth.tenantId)
    .ilike('name', selectedCategory)
    .maybeSingle();

  if (!categoryRecord) {
    const { data: createdCat } = await admin
      .from('incident_categories')
      .insert({
        tenant_id: auth.tenantId,
        name: selectedCategory,
        is_active: true,
        sort_order: 50,
      })
      .select('id,name,is_active')
      .single();
    categoryRecord = createdCat ?? { id: 'default', name: selectedCategory, is_active: true };
  }

  const normalizedCategoryName = categoryRecord.name;
  const isOthersCategory = normalizedCategoryName.trim().toLowerCase() === 'others';
  const otherCategoryText = body.otherCategoryText?.trim() ?? '';

  const normalizedCategoryKey = normalizedCategoryName.trim().toLowerCase();
  const reportKind = normalizedCategoryKey === 'blotter' ? 'blotter' : selectedCategory;
  const reportCategoryText = isOthersCategory ? otherCategoryText : null;

  const desiredAction = body.desiredAction ?? (reportKind === 'blotter' ? 'request_meeting' : 'none');
  const initialStatus = desiredAction === 'record_only' ? 'resolved' : 'pending';

  const insertData: Record<string, any> = {
    tenant_id: auth.tenantId,
    resident_id: auth.userId,
    kind: reportKind,
    track_type: trackType,
    desired_action: desiredAction,
    other_category_text: reportCategoryText,
    relationship_to_respondent: body.relationshipToRespondent,
    street_name: body.streetName,
    specific_location: body.specificLocation,
    title: body.title.trim(),
    details: body.description.trim(),
    location: body.location.trim(),
    date_of_incident: body.occurredAt.slice(0, 10),
    status: initialStatus,
    parties: body.parties ?? [],
  };

  const { data, error } = await admin
    .from('incident_reports')
    .insert(insertData)
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
