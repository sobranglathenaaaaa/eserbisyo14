import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { can } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';

type RouteContext = { params: Promise<{ reservationId: string }> };

type AllowedStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

const allowedTransitions: Record<AllowedStatus, AllowedStatus[]> = {
  pending: ['approved', 'declined', 'cancelled'],
  approved: ['cancelled'],
  declined: [],
  cancelled: [],
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as { status: AllowedStatus; reason?: string } | null;
  if (!body?.status) return fail('VALIDATION_ERROR', 'status is required', 400);
  const { reservationId } = await context.params;

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin.from('reservations').select('*').eq('id', reservationId).eq('tenant_id', auth.tenantId).maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Reservation not found', 404);

  if (auth.role === 'resident') {
    if (existing.resident_id !== auth.userId || body.status !== 'cancelled' || existing.status !== 'pending') {
      return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
    }
  } else {
    // Only staff may approve/decline reservations. Admins do not process reservations.
    if (auth.role !== 'staff') {
      return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
    }
  }

  const current = existing.status as AllowedStatus;
  if (!allowedTransitions[current].includes(body.status)) {
    return fail('RESOURCE_CONFLICT', `Invalid transition from ${current} to ${body.status}`, 409);
  }

  if (body.status === 'declined' && !body.reason?.trim()) {
    return fail('VALIDATION_ERROR', 'Decline reason is required.', 400);
  }

  // If approving, ensure availability still holds
  if (body.status === 'approved') {
    const resource = existing.resource;
    const adminCheck = getSupabaseAdminClient();
    const newStart = existing.start_at ? new Date(existing.start_at).getTime() : null;
    const newEnd = existing.end_at ? new Date(existing.end_at).getTime() : null;
    if (resource === 'equipment') {
      const itemName = existing.item_name;
      if (!itemName) return fail('VALIDATION_ERROR', 'Reservation missing item_name', 400);
      const { data: equip } = await adminCheck
        .from('equipment')
        .select('id,name,quantity')
        .eq('tenant_id', auth.tenantId)
        .ilike('name', itemName)
        .maybeSingle();
      if (!equip) return fail('RESOURCE_NOT_FOUND', 'Equipment not found', 404);

      const { data: existingRes } = await adminCheck
        .from('reservations')
        .select('quantity_requested,start_at,end_at,status')
        .eq('tenant_id', auth.tenantId)
        .eq('resource', 'equipment')
        .ilike('item_name', itemName)
        .in('status', ['pending', 'approved']);

      let reserved = 0;
      for (const r of (existingRes as any[]) || []) {
        const s = r.start_at ? new Date(r.start_at).getTime() : null;
        const e = r.end_at ? new Date(r.end_at).getTime() : null;
        if (s !== null && e !== null && newStart !== null && newEnd !== null && s < newEnd && e > newStart) {
          reserved += r.quantity_requested ?? 0;
        }
      }

      if ((reserved) > (equip.quantity ?? 0)) {
        return fail('RESOURCE_CONFLICT', 'Not enough equipment available to approve this reservation', 409);
      }
    } else {
      const { data: existingFac } = await adminCheck
        .from('reservations')
        .select('id,start_at,end_at,status')
        .eq('tenant_id', auth.tenantId)
        .eq('resource', resource)
        .in('status', ['pending', 'approved']);

      for (const r of (existingFac as any[]) || []) {
        if (r.id === existing.id) continue;
        const s = r.start_at ? new Date(r.start_at).getTime() : null;
        const e = r.end_at ? new Date(r.end_at).getTime() : null;
        if (s !== null && e !== null && newStart !== null && newEnd !== null && s < newEnd && e > newStart) {
          return fail('RESOURCE_CONFLICT', 'Facility is no longer available for the selected time', 409);
        }
      }
    }
  }

  const updates: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() };
  if (body.status === 'declined') {
    updates.reason = body.reason ?? null;
  }

  const { data, error } = await admin.from('reservations').update(updates).eq('id', reservationId).select('*').single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update status', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'reservations.status_update',
    targetId: reservationId,
    context: { from: current, to: body.status },
  });

  const statusLabel: Record<AllowedStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    declined: 'Declined',
    cancelled: 'Cancelled',
  };

  void notifyResident({
    tenantId: auth.tenantId,
    userId: existing.resident_id,
    title: `Reservation updated`,
    message: `Status changed from ${statusLabel[current]} to ${statusLabel[body.status]}.`,
    type: 'request',
    priority: body.status === 'declined' || body.status === 'cancelled' ? 'warning' : 'info',
    eventKey: 'document.status_changed',
    entityType: 'document_request',
    entityId: reservationId,
    actionHref: '/resident/reservations',
  });

  return ok(data);
}
