import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident, notifyStaff } from '@/lib/api/notifications';
import { sendResendEmail } from '@/lib/email/resend';
import { getEmailVerificationEnv } from '@/lib/supabase/env';

type RouteContext = { params: Promise<{ reservationId: string }> };

type AllowedStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'ready_for_pickup' | 'received' | 'returned' | 'completed';

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
  const equipmentReservation = existing.resource === 'equipment';
  const allowedTransitions: Record<AllowedStatus, AllowedStatus[]> = {
    pending: ['approved', 'declined', 'cancelled'],
    approved: equipmentReservation ? ['cancelled', 'ready_for_pickup'] : ['cancelled', 'completed'],
    declined: [],
    cancelled: [],
    ready_for_pickup: equipmentReservation ? ['received'] : [],
    received: equipmentReservation ? ['returned'] : [],
    returned: [],
    completed: [],
  };

  if (!allowedTransitions[current]?.includes(body.status)) {
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
        .in('status', ['pending', 'approved', 'ready_for_pickup', 'received']);

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
        .in('status', ['pending', 'approved', 'ready_for_pickup', 'received']);

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

  let emailError: string | undefined;
  if (body.status === 'approved' || body.status === 'ready_for_pickup' || body.status === 'received' || body.status === 'declined') {
    try {
      const { data: resident } = await admin
        .from('profiles')
        .select('full_name,email')
        .eq('id', existing.resident_id)
        .eq('tenant_id', auth.tenantId)
        .maybeSingle();
      if (!resident?.email) throw new Error('Resident email address is missing.');
      const env = getEmailVerificationEnv();
      const reservationName = existing.resource === 'equipment'
        ? `${existing.item_name ?? 'Equipment'}${existing.quantity_requested ? ` (quantity ${existing.quantity_requested})` : ''}`
        : String(existing.resource).replaceAll('_', ' ');
      const startLabel = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(existing.start_at));
      const endLabel = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(existing.end_at));
      const reason = body.status === 'declined' ? body.reason?.trim() ?? '' : '';
      const approved = body.status === 'approved';
      const readyForPickup = body.status === 'ready_for_pickup';
      const received = body.status === 'received';
      const approvedMessage = equipmentReservation
        ? 'Your equipment reservation has been approved. Please wait for a notification when it is ready for pickup.'
        : 'Your facility reservation has been approved for the scheduled date and time.';
      const readyMessage = `Your reserved equipment is ready for pickup. Please proceed to the barangay hall to collect it on your reserved date and time: ${startLabel}.`;
      const receivedMessage = `Staff confirmed that you received your reserved equipment (${reservationName}). Please return it by ${endLabel}.`;
      const subject = approved
        ? 'Reservation approved'
        : readyForPickup
          ? 'Reserved equipment ready for pickup'
          : received
            ? 'Equipment received confirmation'
            : 'Reservation declined';
      const message = approved
        ? approvedMessage
        : readyForPickup
          ? readyMessage
          : received
            ? receivedMessage
            : `Your reservation was declined. Reason: ${reason}`;
      const details = `${reservationName} · ${startLabel} to ${endLabel}`;
      await sendResendEmail({
        to: resident.email,
        subject,
        html: `<p>Hello ${escapeHtml(resident.full_name ?? 'Resident')},</p><p>${escapeHtml(message)}</p><p>${escapeHtml(details)}</p>`,
        text: `Hello ${resident.full_name ?? 'Resident'},\n\n${message}\n\n${details}\n\n${approved || readyForPickup || received ? `Check your reservation updates: ${env.appBaseUrl}/resident/reservations` : ''}`,
      });
      await admin.from('email_logs').insert({
        tenant_id: auth.tenantId,
        to_user_id: existing.resident_id,
        to_email: resident.email,
        subject,
        body: `${message}\n${details}`,
      });
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Unable to send reservation email.';
      console.error('[reservations.status] email_failed', { reservationId, status: body.status, message: emailError });
    }
  }

  const statusLabel: Record<AllowedStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    declined: 'Declined',
    cancelled: 'Cancelled',
    ready_for_pickup: 'Ready for Pickup',
    received: 'Received',
    returned: 'Returned',
    completed: 'Completed',
  };

  void notifyResident({
    tenantId: auth.tenantId,
    userId: existing.resident_id,
    title: `Reservation updated`,
    message: `Status changed from ${statusLabel[current]} to ${statusLabel[body.status]}.`,
    type: 'request',
    priority: body.status === 'declined' || body.status === 'cancelled' ? 'warning' : 'info',
    eventKey: 'reservation.status_changed',
    entityType: 'reservation',
    entityId: reservationId,
    actionHref: '/resident/reservations',
  });

  if (body.status === 'approved' || body.status === 'declined') {
    void notifyStaff({
      tenantId: auth.tenantId,
      title: `Reservation ${body.status}`,
      message: `The reservation was ${body.status}.`,
      type: 'request',
      priority: body.status === 'declined' ? 'warning' : 'info',
      eventKey: 'reservation.status_changed',
      entityType: 'reservation',
      entityId: reservationId,
      actionHref: '/staff/reservations',
    }).catch((error) => {
      console.error('[reservations.status] staff_notification_failed', {
        reservationId,
        message: error instanceof Error ? error.message : 'Unknown notification error',
      });
    });
  }

  return ok({ ...data, emailError });
}
