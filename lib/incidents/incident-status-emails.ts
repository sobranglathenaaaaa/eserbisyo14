import 'server-only';

import { writeAuditLog } from '@/lib/api/audit';
import { sendResendEmail } from '@/lib/email/resend';
import { getEmailVerificationEnv } from '@/lib/supabase/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types/models';

export type IncidentStatusEmail = 'under_review' | 'resolved' | 'declined';

type SendStatusEmailInput = {
  tenantId: string;
  actorId: string;
  actorRole: UserRole;
  incidentId: string;
  residentId: string;
  caseNumber: string;
  title: string;
  previousStatus: string;
  nextStatus: IncidentStatusEmail;
  note?: string | null;
};

type ResidentEmailProfile = {
  full_name: string | null;
  email: string | null;
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  resolved: 'Resolved',
  declined: 'Declined',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPortalUrl(): string {
  const env = getEmailVerificationEnv();
  return `${env.appBaseUrl}/resident/blotter-reporting`;
}

function buildStatusEmailContent(input: {
  residentName: string;
  caseNumber: string;
  title: string;
  previousStatus: string;
  nextStatus: IncidentStatusEmail;
  portalUrl: string;
  note?: string | null;
}) {
  const previousLabel = statusLabels[input.previousStatus] ?? input.previousStatus;
  const nextLabel = statusLabels[input.nextStatus] ?? input.nextStatus;
  const trimmedNote = input.note?.trim() || null;

  const subjectByStatus: Record<IncidentStatusEmail, string> = {
    under_review: `Incident report ${input.caseNumber} is now under review`,
    resolved: `Incident report ${input.caseNumber} has been resolved`,
    declined: `Incident report ${input.caseNumber} was declined`,
  };

  const messageByStatus: Record<IncidentStatusEmail, string> = {
    under_review: 'Your incident report has been approved. Please proceed to the barangay hall to settle and complete the report.',
    resolved: 'Your incident report has been marked as resolved. Thank you for reporting this incident.',
    declined: 'Your incident report was declined. Please review the reason below and resubmit if needed.',
  };

  const html = [
    `<p>Hello ${escapeHtml(input.residentName || 'Resident')},</p>`,
    `<p>${escapeHtml(messageByStatus[input.nextStatus])}</p>`,
    `<p><strong>Case Number:</strong> ${escapeHtml(input.caseNumber)}<br />`,
    `<strong>Title:</strong> ${escapeHtml(input.title)}<br />`,
    `<strong>Status:</strong> ${escapeHtml(previousLabel)} to ${escapeHtml(nextLabel)}</p>`,
    trimmedNote ? `<p><strong>Reason:</strong> ${escapeHtml(trimmedNote)}</p>` : '',
    input.nextStatus === 'under_review' ? `<p><a href="${escapeHtml(input.portalUrl)}">View your report</a></p>` : '',
  ].filter(Boolean).join('');

  const text = [
    `Hello ${input.residentName || 'Resident'},`,
    messageByStatus[input.nextStatus],
    `Case Number: ${input.caseNumber}`,
    `Title: ${input.title}`,
    `Status: ${previousLabel} to ${nextLabel}`,
    trimmedNote ? `Reason: ${trimmedNote}` : '',
    input.nextStatus === 'under_review' ? `View your report: ${input.portalUrl}` : '',
  ].filter(Boolean).join('\n');

  return {
    subject: subjectByStatus[input.nextStatus],
    html,
    text,
  };
}

export async function sendIncidentStatusEmail(input: SendStatusEmailInput) {
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

    const portalUrl = buildPortalUrl();
    const email = buildStatusEmailContent({
      residentName: resident.full_name ?? 'Resident',
      caseNumber: input.caseNumber,
      title: input.title,
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
    const message = error instanceof Error ? error.message : 'Unable to send incident status email.';
    console.error('[incident-status-email] status_email_failed', {
      tenantId: input.tenantId,
      incidentId: input.incidentId,
      residentId: input.residentId,
      nextStatus: input.nextStatus,
      message,
    });

    await writeAuditLog({
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: 'incidents.status_email_failed',
      targetId: input.incidentId,
      context: {
        residentId: input.residentId,
        nextStatus: input.nextStatus,
        message,
      },
    });

    return { sent: false as const, error: message };
  }
}
