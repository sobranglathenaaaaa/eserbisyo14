import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { can } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type RouteContext = { params: Promise<{ equipmentId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (!can(auth.role, 'process_document_requests')) {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  const { equipmentId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    quantity?: number;
    isDeleted?: boolean;
  } | null;

  const admin = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (existingError) return fail('INTERNAL_ERROR', existingError.message, 500);
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Equipment not found', 404);

  const updates: Record<string, unknown> = {};
  if (typeof body?.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body?.quantity === 'number' && Number.isFinite(body.quantity)) {
    updates.quantity = Math.max(0, Math.floor(body.quantity));
  }
  if (typeof body?.isDeleted === 'boolean') updates.is_deleted = body.isDeleted;

  const { data, error } = await admin
    .from('equipment')
    .update(updates)
    .eq('id', equipmentId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update equipment', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'equipment.update',
    targetId: equipmentId,
  });

  return ok(data);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (!can(auth.role, 'process_document_requests')) {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  const { equipmentId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from('equipment')
    .select('id,name,is_deleted')
    .eq('id', equipmentId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (existingError) return fail('INTERNAL_ERROR', existingError.message, 500);
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Equipment not found', 404);
  const { error } = await admin
    .from('equipment')
    .delete()
    .eq('id', equipmentId)
    .eq('tenant_id', auth.tenantId);

  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'equipment.delete',
    targetId: equipmentId,
  });

  return ok({ id: equipmentId, deleted: true });
}
