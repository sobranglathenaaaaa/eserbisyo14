import { sendResendEmail } from '@/lib/email/resend';

export type CheckupAppointmentDecision = 'approved' | 'declined';

function normalizeDoctorName(value: string): string {
  return value.replace(/^Dr\.\s*/i, '').trim();
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
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
  const appointmentDate = formatAppointmentDate(input.date);
  const appointmentStart = formatAppointmentTime(input.startAt);
  const appointmentEnd = formatAppointmentTime(input.endAt);
  const note = input.staffNote?.trim() || '';
  const safeResidentName = escapeHtml(residentName);
  const safeDoctorName = escapeHtml(doctorName);
  const safeNote = escapeHtml(note);

  const subject =
    input.status === 'approved'
      ? 'Your eSerbisyo check-up appointment has been approved'
      : 'Update on your eSerbisyo check-up appointment';

  const htmlLines =
    input.status === 'approved'
      ? [
          `<p>Hello ${safeResidentName},</p>`,
          `<p>Your check-up appointment with Dr. ${safeDoctorName} has been approved. Please proceed to the barangay on your selected appointment date and time.</p>`,
          `<p><strong>Date:</strong> ${appointmentDate}</p>`,
          `<p><strong>Time:</strong> ${appointmentStart} to ${appointmentEnd}</p>`,
        ]
      : [
          `<p>Hello ${safeResidentName},</p>`,
          `<p>Your check-up appointment with Dr. ${safeDoctorName} has been declined.</p>`,
          `<p><strong>Date:</strong> ${appointmentDate}</p>`,
          `<p><strong>Time:</strong> ${appointmentStart} to ${appointmentEnd}</p>`,
          note ? `<p><strong>Reason:</strong> ${safeNote}</p>` : '',
        ];

  const textLines =
    input.status === 'approved'
      ? [
          `Hello ${residentName},`,
          `Your appointment with Dr. ${doctorName} has been approved. You can now proceed to the barangay for your check-up.`,
          `Date: ${appointmentDate}`,
          `Time: ${appointmentStart} to ${appointmentEnd}`,
        ]
      : [
          `Hello ${residentName},`,
          `Your check-up appointment with Dr. ${doctorName} has been declined.`,
          `Date: ${appointmentDate}`,
          `Time: ${appointmentStart} to ${appointmentEnd}`,
          note ? `Reason: ${note}` : '',
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
