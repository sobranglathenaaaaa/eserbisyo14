import 'server-only';

import type { ApiErrorCode } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';
import { sendResendEmail } from '@/lib/email/resend';
import { renderOcrTemplateFromDocx } from '@/lib/documents/ocr-template-renderers';
import {
  buildRequestTemplateDefaultFields,
  normalizeTemplateFieldMap,
} from '@/lib/documents/request-template-fields';
import {
  getMissingRequiredTemplateFields,
  resolveTemplateForDocumentType,
} from '@/lib/ocr/templates';
import { getEmailVerificationEnv } from '@/lib/supabase/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types/models';

type ReleaseDocumentInput = {
  tenantId: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  releaseNotes?: string;
  verificationMetadata?: unknown;
  ocrJobId?: string;
  documentLabel?: string;
};

type RequestRow = {
  id: string;
  tenant_id: string;
  resident_id: string;
  reference_number: string;
  type_id: string;
  selected_type_label: string | null;
  purpose: string;
  status: string;
};

type DocumentTypeRow = {
  category: string;
  type: string;
};

type ResidentRow = {
  id: string;
  full_name: string;
  email: string;
  address: string | null;
  address_line: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
};

export class DocumentReleaseError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'DocumentReleaseError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function throwRequestStatusMigrationError(message?: string): never {
  if (message && /invalid input value for enum request_status: "ready_for_pickup"/i.test(message)) {
    throw new DocumentReleaseError(
      'MIGRATION_REQUIRED',
      'The database is missing the ready_for_pickup request status. Apply supabase/migrations/20260924_add_ready_for_pickup_request_status.sql, then retry.',
      500,
    );
  }

  throw new DocumentReleaseError('INTERNAL_ERROR', message ?? 'Unable to complete request', 500);
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function resolveIssuedDate(parsedFields: Record<string, string>, fallbackIso: string) {
  const direct = (parsedFields.issuedDate ?? parsedFields.dateIssued ?? '').trim();
  if (direct) return direct;
  const day = (parsedFields.issuedDay ?? '').trim();
  const month = (parsedFields.issuedMonth ?? '').trim();
  const year = (parsedFields.issuedYear ?? '').trim();
  if (day && month && year) {
    const reconstructed = new Date(`${month} ${day}, ${year}`);
    if (!Number.isNaN(reconstructed.getTime())) {
      return reconstructed.toISOString().slice(0, 10);
    }
  }
  return fallbackIso;
}

function buildPortalHref(generatedDocumentId: string) {
  return `/resident/document-requests?tab=docs&documentId=${encodeURIComponent(generatedDocumentId)}`;
}

function isMissingGeneratedDocumentsTableError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('public.generated_documents') && normalized.includes('schema cache');
}

function buildEmailHtml(input: {
  residentName: string;
  documentLabel: string;
  referenceNumber: string;
  issuedDate: string;
  portalUrl: string;
}) {
  return [
    `<p>Hello ${input.residentName},</p>`,
    `<p>Your requested document is ready for pick up at the barangay hall.</p>`,
    `<p><strong>Document:</strong> ${input.documentLabel}<br />`,
    `<strong>Reference:</strong> ${input.referenceNumber}<br />`,
    `<strong>Date issued:</strong> ${input.issuedDate}</p>`,
    `<p>Please present a valid ID when claiming your document at the barangay hall.</p>`,
  ].join('');
}

async function sendReleaseEmail(input: {
  tenantId: string;
  residentId: string;
  residentEmail: string;
  residentName: string;
  documentLabel: string;
  referenceNumber: string;
  issuedDate: string;
  portalHref: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const admin = getSupabaseAdminClient();
  try {
    const env = getEmailVerificationEnv();
    const portalUrl = `${env.appBaseUrl}${input.portalHref}`;
    const subject = `Request ${input.referenceNumber} is ready for pickup`;
    const text = `Your ${input.documentLabel} is ready for pick up at the barangay hall. Reference: ${input.referenceNumber}. Date issued: ${input.issuedDate}.`;
    const html = buildEmailHtml({
      residentName: input.residentName,
      documentLabel: input.documentLabel,
      referenceNumber: input.referenceNumber,
      issuedDate: input.issuedDate,
      portalUrl,
    });

    await sendResendEmail({
      to: input.residentEmail,
      subject,
      html,
      text,
    });

    await admin.from('email_logs').insert({
      tenant_id: input.tenantId,
      to_user_id: input.residentId,
      to_email: input.residentEmail,
      subject,
      body: text,
    });

    return { sent: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send document release email.';
    console.error('[document-release] email_failed', {
      tenantId: input.tenantId,
      residentId: input.residentId,
      referenceNumber: input.referenceNumber,
      message,
    });
    await writeAuditLog({
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: 'document_requests.release_email_failed',
      targetId: input.referenceNumber,
      context: {
        residentId: input.residentId,
        message,
      },
    });
    return { sent: false as const, error: message };
  }
}

export async function releaseGeneratedDocumentForRequest(input: ReleaseDocumentInput) {
  const admin = getSupabaseAdminClient();
  const completionIso = new Date().toISOString();
  const completionDate = completionIso.slice(0, 10);

  const { data: requestRow } = await admin
    .from('document_requests')
    .select('id,tenant_id,resident_id,reference_number,type_id,selected_type_label,purpose,status')
    .eq('id', input.requestId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle<RequestRow>();
  if (!requestRow) {
    throw new DocumentReleaseError('RESOURCE_NOT_FOUND', 'Document request not found', 404);
  }

  const { data: existingDocument, error: existingDocumentError } = await admin
    .from('generated_documents')
    .select('id,document_type,date_issued')
    .eq('request_id', requestRow.id)
    .eq('tenant_id', input.tenantId)
    .order('date_issued', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isMissingGeneratedDocumentsTableError(existingDocumentError?.message)) {
    throw new DocumentReleaseError(
      'MIGRATION_REQUIRED',
      'Database table public.generated_documents is missing from the Supabase Data API schema cache. Apply migration 20260527110222_repair_generated_documents_restore.sql.',
      500,
    );
  }

  if (existingDocument) {
    const { data: updatedRequest, error: updateError } = await admin
      .from('document_requests')
      .update({
        status: 'ready_for_pickup',
        processed_by: input.actorId,
        updated_at: completionIso,
      })
      .eq('id', input.requestId)
      .eq('tenant_id', input.tenantId)
      .select('*')
      .single();
    if (updateError || !updatedRequest) {
      throwRequestStatusMigrationError(updateError?.message);
    }

    return {
      request: updatedRequest,
      generatedDocumentId: existingDocument.id as string,
      documentLabel: existingDocument.document_type as string,
      issuedDate: existingDocument.date_issued as string,
      portalHref: buildPortalHref(existingDocument.id as string),
      email: { sent: false, skipped: true, reason: 'already_generated' },
      reusedExistingDocument: true,
    };
  }

  if (requestRow.status !== 'approved') {
    throw new DocumentReleaseError(
      'RESOURCE_CONFLICT',
      'Request must be approved before marking it ready for pickup.',
      409,
    );
  }

  const [{ data: type }, { data: resident }] = await Promise.all([
    admin
      .from('document_types')
      .select('category,type')
      .eq('id', requestRow.type_id)
      .eq('tenant_id', input.tenantId)
      .maybeSingle<DocumentTypeRow>(),
    admin
      .from('profiles')
      .select('id,full_name,email,address,address_line,province,city,barangay')
      .eq('id', requestRow.resident_id)
      .eq('tenant_id', input.tenantId)
      .maybeSingle<ResidentRow>(),
  ]);

  if (!type) {
    throw new DocumentReleaseError('RESOURCE_NOT_FOUND', 'Document type not found.', 404);
  }
  if (!resident) {
    throw new DocumentReleaseError('RESOURCE_NOT_FOUND', 'Resident profile not found.', 404);
  }

  const typeLabel = requestRow.selected_type_label?.trim() || type.type;
  const template = resolveTemplateForDocumentType(typeLabel, type.category);
  if (!template) {
    // No OCR template configured — treat this as a communication-only completion.
    const { data: updatedRequest, error: updateError } = await admin
      .from('document_requests')
      .update({
        status: 'ready_for_pickup',
        processed_by: input.actorId,
        updated_at: completionIso,
      })
      .eq('id', input.requestId)
      .eq('tenant_id', input.tenantId)
      .select('*')
      .single();
    if (updateError || !updatedRequest) {
      throwRequestStatusMigrationError(updateError?.message);
    }

    const finalDocumentType = input.documentLabel?.trim() || typeLabel;
    const portalHref = '/resident/document-requests';

    void notifyResident({
      tenantId: input.tenantId,
      userId: requestRow.resident_id,
      title: `Request ${requestRow.reference_number} ready for pickup`,
      message: `Your ${finalDocumentType} is ready for pickup at the barangay hall.`,
      type: 'request',
      priority: 'info',
      eventKey: 'document.ready_for_pickup',
      entityType: 'document_request',
      entityId: input.requestId,
      actionHref: portalHref,
    });

    const email = await sendReleaseEmail({
      tenantId: input.tenantId,
      residentId: requestRow.resident_id,
      residentEmail: resident.email,
      residentName: resident.full_name,
      documentLabel: finalDocumentType,
      referenceNumber: requestRow.reference_number,
      issuedDate: completionDate,
      portalHref,
      actorId: input.actorId,
      actorRole: input.actorRole,
    });

    return {
      request: updatedRequest,
      generatedDocumentId: null,
      documentLabel: finalDocumentType,
      issuedDate: completionDate,
      portalHref,
      email,
      reusedExistingDocument: false,
    };
  }

  const metadata = normalizeMetadata(input.verificationMetadata);
  const metadataFields = normalizeTemplateFieldMap(metadata.parsedFields);
  let parsedFields = {
    ...buildRequestTemplateDefaultFields(template.key, {
      residentName: resident.full_name,
      address: resident.address,
      addressLine: resident.address_line,
      province: resident.province,
      city: resident.city,
      barangay: resident.barangay,
      category: type.category,
      documentType: type.type,
      selectedTypeLabel: requestRow.selected_type_label,
      purpose: requestRow.purpose,
      issuedDate: completionDate,
    }),
    ...metadataFields,
  };
  let ocrJobMetadata: Record<string, unknown> | undefined;

  if (input.ocrJobId) {
    const { data: ocrJob } = await admin
      .from('ocr_jobs')
      .select('id,request_id,resident_id,template_key,parsed_fields,status')
      .eq('id', input.ocrJobId)
      .eq('tenant_id', input.tenantId)
      .maybeSingle();
    if (!ocrJob) throw new DocumentReleaseError('RESOURCE_NOT_FOUND', 'OCR job not found.', 404);
    if (ocrJob.request_id !== input.requestId) {
      throw new DocumentReleaseError('RESOURCE_CONFLICT', 'OCR job does not belong to this request.', 409);
    }
    if (ocrJob.resident_id !== requestRow.resident_id) {
      throw new DocumentReleaseError('RESOURCE_CONFLICT', 'OCR job resident mismatch for this request.', 409);
    }
    if (ocrJob.status !== 'completed') {
      throw new DocumentReleaseError(
        'RESOURCE_CONFLICT',
        'OCR job must be completed before issuing the document.',
        409,
      );
    }
    if (ocrJob.template_key && ocrJob.template_key !== template.key) {
      throw new DocumentReleaseError(
        'VALIDATION_ERROR',
        'OCR job template does not match this document request type.',
        400,
      );
    }

    parsedFields = {
      ...parsedFields,
      ...normalizeTemplateFieldMap(ocrJob.parsed_fields),
      ...metadataFields,
    };
    ocrJobMetadata = {
      ocrJobId: ocrJob.id,
      templateKey: ocrJob.template_key ?? template.key,
    };
  }

  const missingFields = getMissingRequiredTemplateFields(template.key, parsedFields);
  if (missingFields.length) {
    throw new DocumentReleaseError(
      'VALIDATION_ERROR',
      `Complete all required fields before sending the document: ${missingFields.join(', ')}`,
      400,
      { missingFields, templateKey: template.key },
    );
  }

  const issuedDate = resolveIssuedDate(parsedFields, completionDate);
  const finalDocumentType = input.documentLabel?.trim() || template.documentLabel;

  try {
    await renderOcrTemplateFromDocx(
      template.key,
      {
        residentName: resident.full_name,
        dateIssued: issuedDate,
      },
      parsedFields,
    );
  } catch (error) {
    throw new DocumentReleaseError(
      'INTERNAL_ERROR',
      error instanceof Error
        ? `Unable to render the official DOCX document template: ${error.message}`
        : 'Unable to render the official DOCX document template.',
      500,
    );
  }

  const { data: generatedDoc, error: generatedError } = await admin
    .from('generated_documents')
    .insert({
      tenant_id: input.tenantId,
      request_id: requestRow.id,
      document_type: finalDocumentType,
      resident_name: resident.full_name,
      date_issued: issuedDate,
      processed_by: input.actorId,
      verification_status: 'verified',
      qr_payload: JSON.stringify({
        requestId: requestRow.id,
        referenceNumber: requestRow.reference_number,
        parsedFields,
        metadata: {
          ...metadata,
          ...ocrJobMetadata,
          templateKey: template.key,
          templateVersion: template.version,
          source: 'document_request_completion',
        },
      }),
      digital_seal: true,
      e_signature_name: 'Authorized Barangay Official',
    })
    .select('id')
    .single();
  if (generatedError || !generatedDoc) {
    if (isMissingGeneratedDocumentsTableError(generatedError?.message)) {
      throw new DocumentReleaseError(
        'MIGRATION_REQUIRED',
        'Database table public.generated_documents is missing from the Supabase Data API schema cache. Apply migration 20260527110222_repair_generated_documents_restore.sql.',
        500,
      );
    }
    throw new DocumentReleaseError(
      'INTERNAL_ERROR',
      generatedError?.message ?? 'Unable to create generated document.',
      500,
    );
  }

  const { data: updatedRequest, error: updateError } = await admin
    .from('document_requests')
    .update({
      status: 'ready_for_pickup',
      processed_by: input.actorId,
      updated_at: completionIso,
    })
    .eq('id', input.requestId)
    .eq('tenant_id', input.tenantId)
    .select('*')
    .single();
  if (updateError || !updatedRequest) {
    throwRequestStatusMigrationError(updateError?.message);
  }

  const portalHref = buildPortalHref(generatedDoc.id);

  void notifyResident({
    tenantId: input.tenantId,
    userId: requestRow.resident_id,
    title: `Request ${requestRow.reference_number} ready for pickup`,
    message: `Your ${finalDocumentType} is ready for pickup at the barangay hall.`,
    type: 'request',
    priority: 'info',
    eventKey: 'document.ready_for_pickup',
    entityType: 'document_request',
    entityId: input.requestId,
    actionHref: portalHref,
  });

  const email = await sendReleaseEmail({
    tenantId: input.tenantId,
    residentId: requestRow.resident_id,
    residentEmail: resident.email,
    residentName: resident.full_name,
    documentLabel: finalDocumentType,
    referenceNumber: requestRow.reference_number,
    issuedDate,
    portalHref,
    actorId: input.actorId,
    actorRole: input.actorRole,
  });

  return {
    request: updatedRequest,
    generatedDocumentId: generatedDoc.id,
    documentLabel: finalDocumentType,
    issuedDate,
    portalHref,
    email,
    reusedExistingDocument: false,
  };
}
