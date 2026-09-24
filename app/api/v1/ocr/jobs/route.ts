import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { extractTextWithGemini } from '@/lib/ocr/extract';
import {
  getDefaultOcrTemplate,
  getOcrTemplateByKey,
  isTemplateCompatibleWithDocumentType,
} from '@/lib/ocr/templates';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const OCR_UPLOADS_BUCKET = 'ocr-uploads';
const MAX_OCR_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_OCR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jfif', 'image/pjpeg']);
const ALLOWED_OCR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'jfif']);

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

function inferFileExtension(file: File): string {
  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/jfif': 'jfif',
    'image/pjpeg': 'jpg',
  };
  if (byType[file.type]) return byType[file.type];
  const lastDot = file.name.lastIndexOf('.');
  if (lastDot > -1 && lastDot < file.name.length - 1) {
    return file.name.slice(lastDot + 1).toLowerCase();
  }
  return 'jpg';
}

function isAllowedOcrFile(file: File) {
  if (ALLOWED_OCR_MIME_TYPES.has(file.type)) return true;
  // Some scanners upload JFIF images as application/octet-stream or empty MIME.
  const extension = inferFileExtension(file);
  return ALLOWED_OCR_EXTENSIONS.has(extension);
}

function normalizeParsedFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, fieldValue]) => {
    acc[key] = typeof fieldValue === 'string' ? fieldValue : fieldValue == null ? '' : String(fieldValue);
    return acc;
  }, {});
}

async function uploadToStorage(admin: ReturnType<typeof getSupabaseAdminClient>, path: string, file: File) {
  const attemptUpload = async () =>
    admin.storage.from(OCR_UPLOADS_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  let { error } = await attemptUpload();
  if (!error) return null;

  const message = error.message.toLowerCase();
  if (message.includes('bucket') && message.includes('not')) {
    await admin.storage.createBucket(OCR_UPLOADS_BUCKET, {
      public: false,
      fileSizeLimit: MAX_OCR_UPLOAD_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_OCR_MIME_TYPES),
    });
    ({ error } = await attemptUpload());
  }
  return error;
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

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  const admin = getSupabaseAdminClient();
  const query = admin
    .from('ocr_jobs')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });

  const { data, error } = await query.limit(100);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  return ok({
    jobs: ((data as OcrJobRow[] | null) ?? []).map(toOcrJob),
  });
}

export async function POST(request: NextRequest) {
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

  const formData = await request.formData().catch(() => null);
  if (!formData) return fail('VALIDATION_ERROR', 'Invalid multipart payload', 400);

  const file = formData.get('file');
  if (!(file instanceof File) || file.size <= 0) {
    return fail('VALIDATION_ERROR', 'file is required', 400);
  }
  if (!isAllowedOcrFile(file)) {
    return fail('VALIDATION_ERROR', 'Only JPG, JPEG, JFIF, PNG, and WEBP files are supported.', 400);
  }
  if (file.size > MAX_OCR_UPLOAD_BYTES) {
    return fail('VALIDATION_ERROR', 'OCR upload must be 5MB or smaller.', 400);
  }

  const requestIdRaw = formData.get('requestId');
  const templateKeyRaw = formData.get('templateKey');
  const requestId = typeof requestIdRaw === 'string' && requestIdRaw.trim() ? requestIdRaw.trim() : null;
  const templateKey = typeof templateKeyRaw === 'string' && templateKeyRaw.trim() ? templateKeyRaw.trim() : null;

  if (!requestId || !templateKey) {
    return fail('VALIDATION_ERROR', 'requestId and templateKey are required for staff OCR uploads.', 400);
  }
  const admin = getSupabaseAdminClient();
  const template = getOcrTemplateByKey(templateKey) ?? getDefaultOcrTemplate();
  if (templateKey && !getOcrTemplateByKey(templateKey)) {
    return fail('VALIDATION_ERROR', `Unsupported templateKey "${templateKey}".`, 400);
  }
  let targetResidentId = '';
  let resolvedRequestId: string | null = null;
  const { data: requestRow } = await admin
    .from('document_requests')
    .select('id,resident_id,type_id,status')
    .eq('id', requestId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!requestRow) return fail('RESOURCE_NOT_FOUND', 'Document request not found', 404);
  if (requestRow.status !== 'approved') {
    return fail('RESOURCE_CONFLICT', 'Request must be approved before OCR issuance.', 409);
  }

  const { data: typeRow } = await admin
    .from('document_types')
    .select('category,type')
    .eq('id', requestRow.type_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!isTemplateCompatibleWithDocumentType(template.key, typeRow?.type, typeRow?.category)) {
    return fail('VALIDATION_ERROR', 'Selected template does not match this document request type.', 400);
  }
  targetResidentId = requestRow.resident_id;
  resolvedRequestId = requestRow.id;

  const extension = inferFileExtension(file);
  const objectPath = `${targetResidentId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const uploadError = await uploadToStorage(admin, objectPath, file);
  if (uploadError) {
    return fail('INTERNAL_ERROR', 'Unable to upload OCR source file.', 500);
  }

  const { data: inserted, error: insertError } = await admin
    .from('ocr_jobs')
    .insert({
      tenant_id: auth.tenantId,
      resident_id: targetResidentId,
      request_id: resolvedRequestId,
      file_name: file.name,
      template_key: template.key,
      template_version: template.version,
      extracted_text: null,
      parsed_fields: {},
      status: 'processing',
      mime_type: file.type,
      file_size_bytes: file.size,
      file_path: objectPath,
      model_name: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (insertError || !inserted) {
    await admin.storage.from(OCR_UPLOADS_BUCKET).remove([objectPath]);
    return fail('INTERNAL_ERROR', insertError?.message ?? 'Unable to create OCR job', 500);
  }

  let finalJob = inserted as OcrJobRow;
  try {
    const extracted = await extractTextWithGemini(file, {
      templateFields: template.defaultFields,
      templateLabels: template.labels,
    });
    const { data: updated, error: updateError } = await admin
      .from('ocr_jobs')
      .update({
        extracted_text: extracted.extractedText,
        parsed_fields: extracted.parsedFields,
        status: 'completed',
        model_name: extracted.model,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();
    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Unable to finalize OCR job');
    }
    finalJob = updated as OcrJobRow;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'OCR extraction failed.';
    const { data: failed } = await admin
      .from('ocr_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();
    if (failed) {
      finalJob = failed as OcrJobRow;
    }
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'ocr.jobs.create',
    targetId: finalJob.id,
    context: {
      requestId: finalJob.request_id ?? undefined,
      templateKey: finalJob.template_key ?? undefined,
      status: finalJob.status,
      mimeType: finalJob.mime_type,
      fileSizeBytes: finalJob.file_size_bytes,
    },
  });

  return ok(toOcrJob(finalJob), { status: 201 });
}
