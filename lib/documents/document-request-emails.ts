import 'server-only';

import { writeAuditLog } from '@/lib/api/audit';
import { sendResendEmail } from '@/lib/email/resend';
import { getEmailVerificationEnv } from '@/lib/supabase/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types/models';

export type DocumentRequestStatusEmail =
  | 'staff_reviewed'
  | 'approved'
  | 'declined'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

type SendStatusEmailInput = {
  tenantId: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  residentId: string;
  referenceNumber: string;
  previousStatus: string;
  nextStatus: DocumentRequestStatusEmail;
  note?: string | null;
};

type ResidentEmailProfile = {
  full_name: string | null;
  email: string | null;
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  staff_reviewed: 'Staff Reviewed',
  approved: 'Approved',
  declined: 'Declined',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPortalUrl(nextStatus: DocumentRequestStatusEmail, requestId: string): string {
  const env = getEmailVerificationEnv();
  if (nextStatus === 'completed') {
    return `${env.appBaseUrl}/resident/request-feedback?requestId=${encodeURIComponent(requestId)}`;
  }
  return `${env.appBaseUrl}/resident/document-requests`;
}

function buildStatusEmailContent(input: {
  residentName: string;
  referenceNumber: string;
  previousStatus: string;
  nextStatus: DocumentRequestStatusEmail;
  portalUrl: string;
  note?: string | null;
}) {
  const previousLabel = statusLabels[input.previousStatus] ?? input.previousStatus;
  const nextLabel = statusLabels[input.nextStatus] ?? input.nextStatus;
  const trimmedNote = input.note?.trim() || null;
  const portalLinkLabel = input.nextStatus === 'completed' ? 'Share your feedback' : 'Open your request';

  const subjectByStatus: Record<DocumentRequestStatusEmail, string> = {
    staff_reviewed: `Request ${input.referenceNumber} reviewed by staff`,
    approved: `Request ${input.referenceNumber} approved`,
    ready_for_pickup: `Request ${input.referenceNumber} is ready for pickup`,
    completed: `Request ${input.referenceNumber} has been completed`,
    declined: `Request ${input.referenceNumber} was declined`,
    cancelled: `Request ${input.referenceNumber} was cancelled`,
  };

  const messageByStatus: Record<DocumentRequestStatusEmail, string> = {
    staff_reviewed: 'Your document request has been reviewed by staff and is waiting for the next step.',
    approved: 'Your document request has been approved. Please wait for further instructions. We will notify you when it is ready for pickup.',
    ready_for_pickup: 'Your document is ready for pickup at the barangay hall. Please bring a valid ID when claiming it.',
    completed: 'Your document request has been completed. Please share your feedback about the service.',
    declined: 'Your document request was declined. For clarifications, email eserbisyo2026@gmail.com.',
    cancelled: 'Your document request was cancelled.',
  };

  const html = [
    `<p>Hello ${escapeHtml(input.residentName || 'Resident')},</p>`,
    `<p>${escapeHtml(messageByStatus[input.nextStatus])}</p>`,
    `<p><strong>Reference:</strong> ${escapeHtml(input.referenceNumber)}<br />`,
    `<strong>Status:</strong> ${escapeHtml(previousLabel)} to ${escapeHtml(nextLabel)}</p>`,
    trimmedNote ? `<p><strong>Note:</strong> ${escapeHtml(trimmedNote)}</p>` : '',
  ].filter(Boolean).join('');

  const text = [
    `Hello ${input.residentName || 'Resident'},`,
    messageByStatus[input.nextStatus],
    `Reference: ${input.referenceNumber}`,
    `Status: ${previousLabel} to ${nextLabel}`,
    trimmedNote ? `Note: ${trimmedNote}` : '',
  ].filter(Boolean).join('\n');

  return {
    subject: subjectByStatus[input.nextStatus],
    html,
    text,
  };
}

export async function sendDocumentRequestStatusEmail(input: SendStatusEmailInput) {
  const admin = getSupabaseAdminClient();

  try {
    const { data: resident, error: residentError } = await admin
      .from('profiles')
      .select('full_name,email')
      .eq('id', input.residentId)
      .eq('tenant_id', input.tenantId)
      .maybeSingle<ResidentEmailProfile>();

    if (residentError) throw new Error(residentError.message);
    if (!resident?.email) throw new Error('Resident email address is missing.');

    const portalUrl = buildPortalUrl(input.nextStatus, input.requestId);
    const email = buildStatusEmailContent({
      residentName: resident.full_name ?? 'Resident',
      referenceNumber: input.referenceNumber,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      portalUrl,
      note: input.note,
    });

    await sendResendEmail({
      to: resident.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    await admin.from('email_logs').insert({
      tenant_id: input.tenantId,
      to_user_id: input.residentId,
      to_email: resident.email,
      subject: email.subject,
      body: email.text,
    });

    return { sent: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send document status email.';
    console.error('[document-request-email] status_email_failed', {
      tenantId: input.tenantId,
      requestId: input.requestId,
      residentId: input.residentId,
      nextStatus: input.nextStatus,
      message,
    });

    await writeAuditLog({
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: 'document_requests.status_email_failed',
      targetId: input.requestId,
      context: {
        residentId: input.residentId,
        nextStatus: input.nextStatus,
        message,
      },
    });

    return { sent: false as const, error: message };
  }
}
