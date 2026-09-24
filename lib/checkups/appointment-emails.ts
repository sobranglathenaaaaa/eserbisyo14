import { getEmailVerificationEnv } from '@/lib/supabase/env';
import { sendResendEmail } from '@/lib/email/resend';

export type CheckupAppointmentDecision = 'approved' | 'declined';

function buildAppointmentsLink(): string {
  const env = getEmailVerificationEnv();
  return new URL('/resident/medicines', env.appBaseUrl).toString();
}

function normalizeDoctorName(value: string): string {
  return value.replace(/^Dr\.\s*/i, '').trim();
}

function formatAppointmentDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(parsed);
}

function formatAppointmentTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(parsed);
}

export async function sendCheckupAppointmentDecisionEmail(input: {
  toEmail: string;
  fullName: string;
  doctorName: string;
  date: string;
  startAt: string;
  endAt: string;
  status: CheckupAppointmentDecision;
  staffNote?: string | null;
}): Promise<{ subject: string; body: string }> {
  const residentName = input.fullName || 'Resident';
  const doctorName = normalizeDoctorName(input.doctorName);
  const appointmentsLink = buildAppointmentsLink();
  const appointmentDate = formatAppointmentDate(input.date);
  const appointmentStart = formatAppointmentTime(input.startAt);
  const appointmentEnd = formatAppointmentTime(input.endAt);
  const note = input.staffNote?.trim() || '';

  const subject =
    input.status === 'approved'
      ? 'Your eSerbisyo check-up appointment has been approved'
      : 'Update on your eSerbisyo check-up appointment';

  const htmlLines =
    input.status === 'approved'
      ? [
          `<p>Hello ${residentName},</p>`,
          `<p>Your check-up appointment with Dr. ${doctorName} has been approved.</p>`,
          `<p><strong>Date:</strong> ${appointmentDate}</p>`,
          `<p><strong>Time:</strong> ${appointmentStart} to ${appointmentEnd}</p>`,

        ]
      : [
          `<p>Hello ${residentName},</p>`,
          `<p>Your check-up appointment with Dr. ${doctorName} has been declined.</p>`,
          `<p><strong>Date:</strong> ${appointmentDate}</p>`,
          `<p><strong>Time:</strong> ${appointmentStart} to ${appointmentEnd}</p>`,
          note ? `<p><strong>Reason:</strong> ${note}</p>` : '',
          `<p>You can review your appointments here:</p>`,
          `<p><a href="${appointmentsLink}">Open My Appointments</a></p>`,
        ];

  const textLines =
    input.status === 'approved'
      ? [
          `Hello ${residentName},`,
          `Your appointment with Dr. ${doctorName} has been approved. You can now proceed to the barangay for your check-up.`,
          `Date: ${appointmentDate}`,
          `Time: ${appointmentStart} to ${appointmentEnd}`,
          `Open My Appointments: ${appointmentsLink}`,
        ]
      : [
          `Hello ${residentName},`,
          `Your check-up appointment with Dr. ${doctorName} has been declined.`,
          `Date: ${appointmentDate}`,
          `Time: ${appointmentStart} to ${appointmentEnd}`,
          note ? `Reason: ${note}` : '',
          `Open My Appointments: ${appointmentsLink}`,
        ];

  const html = htmlLines.filter(Boolean).join('');
  const text = textLines.filter(Boolean).join('\n');

  await sendResendEmail({
    to: input.toEmail,
    subject,
    html,
    text,
  });

  return {
    subject,
    body: text,
  };
}