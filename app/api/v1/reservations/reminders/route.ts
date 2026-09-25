import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { notifyResident } from '@/lib/api/notifications';
import { sendResendEmail } from '@/lib/email/resend';

const RETURN_REMINDER_WINDOW_MINUTES = 30;

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') return fail('AUTH_FORBIDDEN', 'Staff access required', 403);

  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + RETURN_REMINDER_WINDOW_MINUTES * 60_000);
  const admin = getSupabaseAdminClient();
  const { data: reservations, error } = await admin
    .from('reservations')
    .select('id,resident_id,item_name,end_at')
    .eq('tenant_id', auth.tenantId)
    .eq('resource', 'equipment')
    .eq('status', 'received')
    .gte('end_at', now.toISOString())
    .lte('end_at', reminderWindowEnd.toISOString());

  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  let reminderEmailsSent = 0;
  await Promise.all((reservations ?? []).map(async (reservation) => {
    const message = `Your reservation for ${reservation.item_name ?? 'equipment'} ends soon. Please return the equipment by the reserved end time.`;
    await notifyResident({
      tenantId: auth.tenantId,
      userId: reservation.resident_id,
      title: 'Equipment return reminder',
      message,
      type: 'request',
      priority: 'warning',
      eventKey: 'reservation.return_reminder',
      entityType: 'reservation',
      entityId: reservation.id,
      actionHref: '/resident/reservations',
      dedupeWindowMinutes: 1440,
    });

    const subject = 'Equipment return reminder';
    const reservationMarker = `Reservation ID: ${reservation.id}`;
    const { data: previousEmail } = await admin
      .from('email_logs')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('to_user_id', reservation.resident_id)
      .eq('subject', subject)
      .ilike('body', `%${reservationMarker}%`)
      .limit(1)
      .maybeSingle();
    if (previousEmail) return;

    const { data: resident } = await admin
      .from('profiles')
      .select('full_name,email')
      .eq('id', reservation.resident_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!resident?.email) return;

    const endLabel = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(reservation.end_at));
    const emailMessage = `Your reservation for ${reservation.item_name ?? 'equipment'} is ending soon. Please return it to the barangay by ${endLabel}.`;
    try {
      await sendResendEmail({
        to: resident.email,
        subject,
        html: `<p>Hello ${escapeHtml(resident.full_name ?? 'Resident')},</p><p>${escapeHtml(emailMessage)}</p><p>${escapeHtml(reservationMarker)}</p>`,
        text: `Hello ${resident.full_name ?? 'Resident'},\n\n${emailMessage}\n\n${reservationMarker}`,
      });
      const { error: logError } = await admin.from('email_logs').insert({
        tenant_id: auth.tenantId,
        to_user_id: reservation.resident_id,
        to_email: resident.email,
        subject,
        body: `${emailMessage}\n${reservationMarker}`,
      });
      if (logError) throw logError;
      reminderEmailsSent += 1;
    } catch (emailError) {
      console.error('[reservations.reminders] email_failed', {
        reservationId: reservation.id,
        message: emailError instanceof Error ? emailError.message : 'Unable to send reminder email.',
      });
    }
  }));

  return ok({ remindersChecked: reservations?.length ?? 0, reminderEmailsSent });
}
