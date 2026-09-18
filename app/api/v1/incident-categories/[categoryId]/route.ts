import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type RouteContext = { params: Promise<{ categoryId: string }> };
type PatchIncidentCategoryPayload = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'process_document_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
  }

  const { categoryId } = await context.params;
  const body = (await request.json().catch(() => null)) as PatchIncidentCategoryPayload | null;
  if (!body || (body.name == null && body.sortOrder == null && body.isActive == null)) {
    return fail('VALIDATION_ERROR', 'At least one field is required', 400);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: auth.userId,
  };
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (!trimmed) return fail('VALIDATION_ERROR', 'name cannot be empty', 400);
    updates.name = trimmed;
  }
  if (body.sortOrder != null) {
    if (!Number.isFinite(body.sortOrder)) return fail('VALIDATION_ERROR', 'sortOrder must be a number', 400);
    updates.sort_order = Number(body.sortOrder);
  }
  if (typeof body.isActive === 'boolean') {
    updates.is_active = body.isActive;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('incident_categories')
    .update(updates)
    .eq('id', categoryId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === '23505') {
      return fail('RESOURCE_CONFLICT', 'Category already exists', 409);
    }
    return fail('RESOURCE_NOT_FOUND', error?.message ?? 'Incident category not found', 404);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'incident_categories.update',
    targetId: categoryId,
    context: updates,
  });

  return ok(data);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'process_document_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
  }

  const { categoryId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('incident_categories')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    })
    .eq('id', categoryId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (error || !data) return fail('RESOURCE_NOT_FOUND', error?.message ?? 'Incident category not found', 404);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'incident_categories.archive',
    targetId: categoryId,
  });

  return ok({ archived: true, category: data });
}
