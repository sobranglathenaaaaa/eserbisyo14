import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';

type RouteContext = { params: Promise<{ ticketId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as
    | { status: 'waiting' | 'serving' | 'skipped' | 'completed' | 'cancelled' }
    | null;
  if (!body?.status) return fail('VALIDATION_ERROR', 'status is required', 400);

  const { ticketId } = await context.params;
  const mapped = body.status === 'skipped' ? 'cancelled' : body.status;

  const admin = getSupabaseAdminClient();
  if (auth.role === 'resident') {
    if (mapped !== 'cancelled') {
      return fail('AUTH_FORBIDDEN', 'Residents can only cancel queue tickets', 403);
    }
    const { data, error } = await admin
      .from('queue_entries')
      .update({ status: 'cancelled' })
      .eq('id', ticketId)
      .eq('tenant_id', auth.tenantId)
      .eq('resident_id', auth.userId)
      .eq('status', 'waiting')
      .select('*')
      .single();
    if (error || !data) return fail('RESOURCE_NOT_FOUND', error?.message ?? 'Queue ticket not found', 404);
    return ok(data);
  }

  try {
    assertCan(auth.role, 'update_queue');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
  }

  const { data, error } = await admin
    .from('queue_entries')
    .update({ status: mapped })
    .eq('id', ticketId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('RESOURCE_NOT_FOUND', error?.message ?? 'Queue ticket not found', 404);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'queue.status_update',
    targetId: ticketId,
    context: { status: body.status },
  });

  void notifyResident({
    tenantId: auth.tenantId,
    userId: data.resident_id,
    title: `Queue status updated`,
    message: `Your queue ticket is now ${body.status}.`,
    type: 'system',
    priority: body.status === 'serving' ? 'urgent' : 'info',
    eventKey: 'queue.status_changed',
    entityType: 'queue_entry',
    entityId: ticketId,
    actionHref: '/resident/dashboard',
  });

  return ok(data);
}
