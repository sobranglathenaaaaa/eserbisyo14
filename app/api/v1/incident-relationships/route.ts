import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type CreateIncidentRelationshipPayload = {
  name?: string;
  sortOrder?: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';
  const admin = getSupabaseAdminClient();

  let query = admin
    .from('incident_relationships')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!includeInactive || auth.role === 'resident') {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.limit(500);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  return ok({ incidentRelationships: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'process_document_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
  }

  const body = (await request.json().catch(() => null)) as CreateIncidentRelationshipPayload | null;
  const name = body?.name?.trim();
  if (!name) {
    return fail('VALIDATION_ERROR', 'name is required', 400);
  }

  const sortOrder = Number.isFinite(body?.sortOrder) ? Number(body?.sortOrder) : 0;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('incident_relationships')
    .insert({
      tenant_id: auth.tenantId,
      name,
      sort_order: sortOrder,
      is_active: true,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === '23505') {
      return fail('RESOURCE_CONFLICT', 'Relationship option already exists', 409);
    }
    return fail('INTERNAL_ERROR', error?.message ?? 'Unable to create relationship option', 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'incident_relationships.create',
    targetId: data.id,
    context: { name, sortOrder },
  });

  return ok(data, { status: 201 });
}
