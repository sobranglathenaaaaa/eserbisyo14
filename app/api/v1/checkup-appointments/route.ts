import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';
import { isSlotInFuture } from '@/lib/checkups/slots';

type AppointmentPayload = {
  slotId?: string;
  reason?: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const date = request.nextUrl.searchParams.get('date');
  const admin = getSupabaseAdminClient();
  let query = admin
    .from('checkup_appointments')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });

  if (auth.role === 'resident') query = query.eq('resident_id', auth.userId);
  if (date) query = query.eq('date', date);

  const { data, error } = await query.limit(200);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  return ok({ appointments: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'resident') return fail('AUTH_FORBIDDEN', 'Resident access required', 403);

  const body = (await request.json().catch(() => null)) as AppointmentPayload | null;
  if (!body?.slotId || !body.reason?.trim()) {
    return fail('VALIDATION_ERROR', 'slotId and reason are required', 400);
  }

  const admin = getSupabaseAdminClient();
  const { data: slot } = await admin
    .from('doctor_availability_slots')
    .select('*')
    .eq('id', body.slotId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!slot) return fail('RESOURCE_NOT_FOUND', 'Doctor slot not found', 404);
  if (slot.is_blocked) return fail('RESOURCE_CONFLICT', 'Doctor slot is blocked', 409);
  if (!isSlotInFuture(slot.end_at)) {
    return fail('RESOURCE_CONFLICT', 'This doctor slot is no longer available', 409);
  }

  const { data: created, error } = await admin
    .from('checkup_appointments')
    .insert({
      tenant_id: auth.tenantId,
      resident_id: auth.userId,
      slot_id: slot.id,
      doctor_name: slot.doctor_name,
      date: slot.date,
      start_at: slot.start_at,
      end_at: slot.end_at,
      reason: body.reason.trim(),
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return fail('RESOURCE_CONFLICT', 'Selected slot is already booked', 409);
    }
    return fail('INTERNAL_ERROR', error.message, 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'checkup_appointments.create',
    targetId: created.id,
    context: { slotId: slot.id },
  });

  void notifyResident({
    tenantId: auth.tenantId,
    userId: auth.userId,
    title: 'Appointment submitted',
    message: `Your check-up appointment with Dr. ${slot.doctor_name} was submitted and is pending review.`,
    type: 'request',
    priority: 'info',
    eventKey: 'checkup_appointment.status_changed',
    entityType: 'checkup_appointment',
    entityId: created.id,
    actionHref: '/resident/medicines',
  });

  return ok(created, { status: 201 });
}
