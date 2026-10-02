import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { renderOcrTemplateFromDocx } from '@/lib/documents/ocr-template-renderers';
import {
  getMissingRequiredTemplateFields,
  getTemplateOrDefault,
  isTemplateCompatibleWithDocumentType,
} from '@/lib/ocr/templates';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  normalizeStandaloneParsedFields,
  type StandaloneIssuanceRow,
  toStandaloneIssuance,
} from '@/lib/ocr/issuance';
import {
  getOcrIssuancesSchemaCacheMigrationMessage,
  isStaleOcrIssuancesSchemaCacheError,
} from '../../_schema-cache';

type RouteContext = { params: Promise<{ issuanceId: string }> };

type FinalizePayload = {
  residentId?: string | null;
};

function resolveIssuedDate(parsedFields: Record<string, string>) {
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
  return new Date().toISOString().slice(0, 10);
}

function isMissingGeneratedDocumentsTableError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('public.generated_documents') && normalized.includes('schema cache');
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  try {
    assertCan(auth.role, 'process_document_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  const { issuanceId } = await context.params;
  const body = (await request.json().catch(() => null)) as FinalizePayload | null;
  const residentIdFromBody = typeof body?.residentId === 'string' && body.residentId.trim() ? body.residentId.trim() : null;

  const admin = getSupabaseAdminClient();
  const { data: issuance, error: issuanceError } = await admin
    .from('ocr_issuances')
    .select('*')
    .eq('id', issuanceId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (isStaleOcrIssuancesSchemaCacheError(issuanceError?.message)) {
    return fail(
      'MIGRATION_REQUIRED',
      getOcrIssuancesSchemaCacheMigrationMessage(issuanceError?.message),
      500,
    );
  }
  if (!issuance) return fail('RESOURCE_NOT_FOUND', 'OCR issuance not found.', 404);
  if (issuance.status === 'issued') {
    return fail('RESOURCE_CONFLICT', 'Issuance has already been finalized.', 409);
  }

  const parsedFields = normalizeStandaloneParsedFields(issuance.parsed_fields);
  const { getOcrTemplateByKey, buildDynamicOcrTemplateDefinition, getTemplateOrDefault } = await import('@/lib/ocr/templates');
  let template: import('@/lib/ocr/templates').OcrTemplateDefinition;

  if (!getOcrTemplateByKey(issuance.template_key)) {
    const { data: dbTemplate } = await admin
      .from('document_templates')
      .select('id, name, body, dynamic_fields')
      .eq('id', issuance.template_key)
      .maybeSingle();

    if (dbTemplate) {
      template = buildDynamicOcrTemplateDefinition({
        id: dbTemplate.id,
        name: dbTemplate.name,
        body: dbTemplate.body,
        dynamicFields: dbTemplate.dynamic_fields ?? [],
      });
    } else {
      template = getTemplateOrDefault(issuance.template_key);
    }
  } else {
    template = getTemplateOrDefault(issuance.template_key);
  }

  const missingFields = template.getMissingFields(parsedFields);
  if (missingFields.length) {
    return fail(
      'VALIDATION_ERROR',
      `Complete all required intake fields before issuance: ${missingFields.join(', ')}`,
      400,
    );
  }

  const linkedResidentId = residentIdFromBody ?? (typeof issuance.resident_id === 'string' ? issuance.resident_id : null);
  let linkedRequestId: string | null = issuance.linked_request_id;
  let residentName = parsedFields.residentName?.trim() || 'Walk-in Resident';

  if (linkedResidentId) {
    const { data: resident } = await admin
      .from('profiles')
      .select('id,full_name')
      .eq('id', linkedResidentId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!resident) return fail('RESOURCE_NOT_FOUND', 'Linked resident not found.', 404);
    residentName = resident.full_name || residentName;

    const { data: allDocumentTypes } = await admin
      .from('document_types')
      .select('id,category,type,price')
      .eq('tenant_id', auth.tenantId);
    const matchedType = (allDocumentTypes ?? []).find((item) =>
      template.isDocumentType(item.type, item.category) ||
      item.type?.toLowerCase().includes(template.name.toLowerCase()) ||
      template.name.toLowerCase().includes((item.type ?? '').toLowerCase())
    ) ?? allDocumentTypes?.[0];
    if (!matchedType) {
      return fail('RESOURCE_NOT_FOUND', `${template.documentLabel} document type is not configured for this tenant.`, 404);
    }

    const { data: requestRow, error: requestError } = await admin
      .from('document_requests')
      .insert({
        tenant_id: auth.tenantId,
        resident_id: resident.id,
        type_id: matchedType.id,
        purpose: 'For whatever legal purpose it may serve him/her.',
        amount: matchedType.price,
        status: 'completed',
        processed_by: auth.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id,reference_number')
      .single();
    if (requestError || !requestRow) {
      return fail('INTERNAL_ERROR', requestError?.message ?? 'Unable to create linked resident request.', 500);
    }
    linkedRequestId = requestRow.id;

    void notifyResident({
      tenantId: auth.tenantId,
      userId: resident.id,
      title: `Request ${requestRow.reference_number} completed`,
      message: `Your ${template.documentLabel} is available in your documents.`,
      type: 'request',
      priority: 'info',
      eventKey: 'document.completed',
      entityType: 'document_request',
      entityId: requestRow.id,
      actionHref: '/resident/document-requests',
    });
  }

  const issuedDate = resolveIssuedDate(parsedFields);
  let rendered: Awaited<ReturnType<typeof renderOcrTemplateFromDocx>>;
  try {
    rendered = await renderOcrTemplateFromDocx(template.key, { residentName, dateIssued: issuedDate }, parsedFields);
  } catch (error) {
    return fail(
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
      tenant_id: auth.tenantId,
      request_id: linkedRequestId,
      document_type: template.documentLabel,
      resident_name: residentName,
      date_issued: issuedDate,
      processed_by: auth.userId,
      verification_status: 'verified',
      qr_payload: JSON.stringify({
        requestId: linkedRequestId,
        parsedFields,
        metadata: {
          issuanceId: issuance.id,
          templateKey: template.key,
          templateVersion: template.version,
          source: 'standalone_ocr',
          residentLinked: Boolean(linkedResidentId),
        },
      }),
      digital_seal: true,
      e_signature_name: 'Authorized Barangay Official',
    })
    .select('id')
    .single();
  if (generatedError || !generatedDoc) {
    if (isMissingGeneratedDocumentsTableError(generatedError?.message)) {
      return fail(
        'MIGRATION_REQUIRED',
        'Database table public.generated_documents is missing from the Supabase Data API schema cache. Apply migration 20260527110222_repair_generated_documents_restore.sql.',
        500,
      );
    }
    return fail('INTERNAL_ERROR', generatedError?.message ?? 'Unable to create generated document.', 500);
  }

  const { data: updated, error: updateError } = await admin
    .from('ocr_issuances')
    .update({
      resident_id: linkedResidentId,
      status: 'issued',
      linked_request_id: linkedRequestId,
      generated_document_id: generatedDoc.id,
      issued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', issuanceId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (updateError || !updated) return fail('INTERNAL_ERROR', updateError?.message ?? 'Unable to finalize issuance.', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'ocr_issuances.issue',
    targetId: issuanceId,
    context: {
      residentLinked: Boolean(linkedResidentId),
      residentId: linkedResidentId,
      linkedRequestId,
      generatedDocumentId: generatedDoc.id,
    },
  });

  return ok({
    issuance: toStandaloneIssuance(updated as StandaloneIssuanceRow),
    generatedDocumentId: generatedDoc.id,
    printableHtml: rendered.printableHtml,
  });
}
