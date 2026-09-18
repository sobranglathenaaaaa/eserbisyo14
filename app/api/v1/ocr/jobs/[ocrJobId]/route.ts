import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ ocrJobId: string }> };

type OcrJobRow = {
  id: string;
  resident_id: string;
  request_id: string | null;
  file_name: string;
  extracted_text: string | null;
  parsed_fields: Record<string, unknown> | null;
  template_key: string | null;
  template_version: string | null;
  status: 'processing' | 'completed' | 'failed';
  mime_type: string | null;
  file_size_bytes: number | null;
  file_path: string | null;
  model_name: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
};

function normalizeParsedFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, fieldValue]) => {
    acc[key] = typeof fieldValue === 'string' ? fieldValue : fieldValue == null ? '' : String(fieldValue);
    return acc;
  }, {});
}

function toOcrJob(row: OcrJobRow) {
  return {
    id: row.id,
    residentId: row.resident_id,
    requestId: row.request_id ?? undefined,
    fileName: row.file_name,
    extractedText: row.extracted_text ?? '',
    parsedFields: normalizeParsedFields(row.parsed_fields),
    templateKey: row.template_key ?? undefined,
    templateVersion: row.template_version ?? undefined,
    status: row.status,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    filePath: row.file_path ?? undefined,
    model: row.model_name ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function normalizePatchFields(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.entries(input as Record<string, unknown>).reduce<Record<string, string>>((acc, [field, value]) => {
    acc[field] = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
    return acc;
  }, {});
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }
  const { ocrJobId } = await context.params;

  const body = (await request.json().catch(() => null)) as
    | { extractedText?: string; parsedFields?: Record<string, unknown> }
    | null;
  const extractedText = typeof body?.extractedText === 'string' ? body.extractedText.trim() : undefined;
  const parsedFieldsPatch = normalizePatchFields(body?.parsedFields);
  if (!extractedText && Object.keys(parsedFieldsPatch).length === 0) {
    return fail('VALIDATION_ERROR', 'Provide extractedText and/or parsedFields.', 400);
  }

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from('ocr_jobs')
    .select('*')
    .eq('id', ocrJobId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'OCR job not found', 404);

  const mergedParsedFields = {
    ...normalizeParsedFields(existing.parsed_fields),
    ...parsedFieldsPatch,
  };
  const nextExtractedText = extractedText ?? (existing.extracted_text ?? '');
  if (!nextExtractedText && Object.keys(mergedParsedFields).length === 0) {
    return fail('VALIDATION_ERROR', 'OCR job must keep extracted output or parsed fields.', 400);
  }

  const { data, error } = await admin
    .from('ocr_jobs')
    .update({
      extracted_text: nextExtractedText || null,
      parsed_fields: mergedParsedFields,
      status: 'completed',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ocrJobId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update OCR job', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'ocr.jobs.update',
    targetId: ocrJobId,
  });

  return ok(toOcrJob(data as OcrJobRow));
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }
  const { ocrJobId } = await context.params;

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from('ocr_jobs')
    .select('id,resident_id,file_path')
    .eq('id', ocrJobId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'OCR job not found', 404);

  const { error } = await admin
    .from('ocr_jobs')
    .delete()
    .eq('id', ocrJobId)
    .eq('tenant_id', auth.tenantId);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  const filePath = existing.file_path as string | null;
  if (filePath) {
    await admin.storage.from('ocr-uploads').remove([filePath]);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'ocr.jobs.delete',
    targetId: ocrJobId,
  });

  return ok({ deleted: true });
}
