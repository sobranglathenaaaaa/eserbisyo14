import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';

type RouteContext = { params: Promise<{ ticketId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const { ticketId } = await context.params;

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from('queue_entries')
    .select('*')
    .eq('id', ticketId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Queue ticket not found', 404);

  if (auth.role === 'resident') {
    if (existing.resident_id !== auth.userId || existing.status !== 'waiting') {
      return fail('AUTH_FORBIDDEN', 'Residents can only cancel their waiting queue tickets', 403);
    }
  } else {
    try {
      assertCan(auth.role, 'update_queue');
    } catch {
      return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
    }
  }

  const { data, error } = await admin
    .from('queue_entries')
    .update({ status: 'cancelled' })
    .eq('id', ticketId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to cancel queue ticket', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'queue.delete_intent',
    targetId: ticketId,
    context: { mappedStatus: 'cancelled' },
  });

  if (auth.role !== 'resident') {
    void notifyResident({
      tenantId: auth.tenantId,
      userId: data.resident_id,
      title: 'Queue status updated',
      message: 'Your queue ticket has been cancelled by the barangay office.',
      type: 'system',
      priority: 'warning',
      eventKey: 'queue.status_changed',
      entityType: 'queue_entry',
      entityId: ticketId,
      actionHref: '/resident/dashboard',
    });
  }

  return ok(data);
}
