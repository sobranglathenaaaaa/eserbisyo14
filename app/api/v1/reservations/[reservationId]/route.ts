import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { can } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type RouteContext = { params: Promise<{ reservationId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(_request);
  if (auth instanceof Response) return auth;

  const { reservationId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  if (!data) return fail('RESOURCE_NOT_FOUND', 'Reservation not found', 404);

  if (auth.role === 'resident' && data.resident_id !== auth.userId) {
    return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
  }

  return ok(data);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(_request);
  if (auth instanceof Response) return auth;

  const { reservationId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (fetchError) return fail('INTERNAL_ERROR', fetchError.message, 500);
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Reservation not found', 404);

  if (auth.role === 'resident') {
    if (existing.resident_id !== auth.userId) return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
    if (existing.status !== 'pending') return fail('RESOURCE_CONFLICT', 'Only pending reservations can be cancelled by resident', 409);
  }

  // staff/admin may delete any reservation
  const { error } = await admin.from('reservations').delete().eq('id', reservationId).eq('tenant_id', auth.tenantId);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'reservations.delete',
    targetId: reservationId,
  });

  return ok({});
}
