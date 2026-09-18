import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';
import { sendCheckupAppointmentDecisionEmail } from '@/lib/checkups/appointment-emails';

type RouteContext = { params: Promise<{ appointmentId: string }> };
type AppointmentStatusPayload = {
  status?: 'pending' | 'approved' | 'completed' | 'declined' | 'cancelled';
  staffNote?: string;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') return fail('AUTH_FORBIDDEN', 'Staff access required', 403);

  const { appointmentId } = await context.params;
  const body = (await request.json().catch(() => null)) as AppointmentStatusPayload | null;
  if (!body?.status) return fail('VALIDATION_ERROR', 'status is required', 400);

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from('checkup_appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Appointment not found', 404);

  const { data, error } = await admin
    .from('checkup_appointments')
    .update({
      status: body.status,
      staff_note: body.staffNote?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update appointment', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'checkup_appointments.status_update',
    targetId: appointmentId,
    context: { status: body.status },
  });

  void notifyResident({
    tenantId: auth.tenantId,
    userId: data.resident_id,
    title: 'Appointment status updated',
    message: body.staffNote?.trim()
      ? `Appointment ${body.status}: ${body.staffNote.trim()}`
      : `Your appointment is now ${body.status}.`,
    type: 'system',
    priority: body.status === 'declined' ? 'warning' : 'info',
    eventKey: 'checkup_appointment.status_changed',
    entityType: 'checkup_appointment',
    entityId: appointmentId,
    actionHref: '/resident/medicines',
  });

  if ((body.status === 'approved' || body.status === 'declined') && existing.status !== body.status) {
    try {
      const { data: residentProfile } = await admin
        .from('profiles')
        .select('full_name,email')
        .eq('id', data.resident_id)
        .eq('tenant_id', auth.tenantId)
        .maybeSingle();

      if (residentProfile?.email) {
        const mail = await sendCheckupAppointmentDecisionEmail({
          toEmail: residentProfile.email,
          fullName: residentProfile.full_name,
          doctorName: data.doctor_name,
          date: data.date,
          startAt: data.start_at,
          endAt: data.end_at,
          status: body.status,
          staffNote: body.staffNote,
        });

        await admin.from('email_logs').insert({
          tenant_id: auth.tenantId,
          to_user_id: data.resident_id,
          to_email: residentProfile.email,
          subject: mail.subject,
          body: mail.body,
        });
      }
    } catch (emailError) {
      console.error('[checkup-appointments.status] Failed to send decision email:', emailError);
    }
  }

  return ok(data);
}

