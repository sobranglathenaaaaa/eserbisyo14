import { getEmailVerificationEnv } from '@/lib/supabase/env';
import { sendResendEmail } from '@/lib/email/resend';

export type RegistrationFinalStatus = 'admin_approved' | 'admin_rejected';

function buildLoginLink(): string {
  const env = getEmailVerificationEnv();
  return `${env.appBaseUrl}/login`;
}

export async function sendRegistrationDecisionMessage(input: {
  toEmail: string;
  fullName: string;
  status: RegistrationFinalStatus;
  reviewNote?: string | null;
  actor?: 'admin' | 'staff';
}): Promise<{ subject: string; body: string }> {
  const residentName = input.fullName || 'Resident';
  const loginLink = buildLoginLink();
  const reviewNoteText = input.reviewNote?.trim() ? input.reviewNote.trim() : null;

  const subject =
    input.status === 'admin_approved'
      ? 'Your eSerbisyo registration has been approved'
      : 'Update on your eSerbisyo registration';

  const isApproved = input.status === 'admin_approved';
  const actor = input.actor ?? 'admin';

  const htmlLines = isApproved
    ? [
        `<p>Hello ${residentName},</p>`,
        '<p>Your eSerbisyo registration has been approved. You can now log in to your account.</p>',
        `<p><a href="${loginLink}">Log in to eSerbisyo</a></p>`,
      ]
    : // rejected
      (() => {
        if (actor === 'staff' && reviewNoteText) {
          return [
            `<p>Hello ${residentName},</p>`,
            `<p>Your eSerbisyo registration was reviewed and rejected due to: ${reviewNoteText}</p>`,
            '<p>You may contact the barangay office for assistance or wait for further review.</p>',
          ];
        }
        // default admin-style message
        return [
          `<p>Hello ${residentName},</p>`,
          '<p>Your eSerbisyo registration was reviewed but is not approved yet.</p>',
          reviewNoteText ? `<p><strong>${actor === 'staff' ? 'Staff' : 'Admin'} note:</strong> ${reviewNoteText}</p>` : '',
          '<p>You may contact the barangay office for assistance or wait for further review.</p>',
        ];
      })();

  const textLines = isApproved
    ? [
        `Hello ${residentName},`,
        'Your eSerbisyo registration has been approved. You can now log in to your account.',
        `Log in: ${loginLink}`,
      ]
    : // rejected
      (() => {
        if (actor === 'staff' && reviewNoteText) {
          return [
            `Hello ${residentName},`,
            `Your eSerbisyo registration was reviewed and rejected due to: ${reviewNoteText}`,
            'You may contact the barangay office for assistance or wait for further review.',
          ];
        }
        return [
          `Hello ${residentName},`,
          'Your eSerbisyo registration was reviewed but is not approved yet.',
          reviewNoteText ? `${actor === 'staff' ? 'Staff' : 'Admin'} note: ${reviewNoteText}` : '',
          'You may contact the barangay office for assistance or wait for further review.',
        ];
      })();

  const html = htmlLines.filter(Boolean).join('');
  const text = textLines.filter(Boolean).join('\n');

  await sendResendEmail({
    to: input.toEmail,
    subject,
    html,
    text,
  });

  const contact = 'Please try to contact us at <a href="mailto:eserbisyo2026@gmail.com">eserbisyo2026@gmail.com</a> or visit the barangay office for assistance.';

  return {
    subject,
    body:
      input.status === 'admin_approved'
        ? loginLink
        : reviewNoteText
        ? `${reviewNoteText}\n\nPlease try to contact us at: eserbisyo2026@gmail.com or visit the barangay office for assistance.`
        : 'Registration not approved',
  };
}
