import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { requireAuth } from '@/lib/auth/request-auth';
import { OcrModelUnavailableError, extractTextWithGemini } from '@/lib/ocr/extract';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { validateOcrTemplateMatch } from '@/lib/ocr/templates';
import {
  getTemplateConfig,
  normalizeStandaloneParsedFields,
  type StandaloneIssuanceRow,
  toStandaloneIssuance,
} from '@/lib/ocr/issuance';
import {
  getOcrIssuancesSchemaCacheMigrationMessage,
  isMissingOcrProgressPercentSchemaCacheError,
  isStaleOcrIssuancesSchemaCacheError,
} from '../../_schema-cache';

type RouteContext = { params: Promise<{ issuanceId: string }> };

const OCR_UPLOADS_BUCKET = 'ocr-uploads';
const MAX_OCR_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_OCR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jfif', 'image/pjpeg']);
const ALLOWED_OCR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'jfif']);

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

async function setIssuanceProgress(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  auth: { tenantId: string },
  issuanceId: string,
  ocrProgressPercent: number | null,
  extraUpdates?: Record<string, unknown>,
) {
  const updates = {
    ocr_progress_percent: ocrProgressPercent,
    updated_at: new Date().toISOString(),
    error_message: null,
    ...(extraUpdates ?? {}),
  };
  const { data, error } = await admin
    .from('ocr_issuances')
    .update(updates)
    .eq('id', issuanceId)
    .eq('tenant_id', auth.tenantId)
    .select('id')
    .single();
  if (!data && isMissingOcrProgressPercentSchemaCacheError(error?.message)) {
    const retry = await admin
      .from('ocr_issuances')
      .update({
        updated_at: updates.updated_at,
        error_message: updates.error_message,
        ...(extraUpdates ?? {}),
      })
      .eq('id', issuanceId)
      .eq('tenant_id', auth.tenantId)
      .select('id')
      .single();
    if (retry.data) return true;
  }
  return Boolean(data);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  // Top-level defensive wrapper to ensure unexpected errors are logged and return JSON.
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) return fail('VALIDATION_ERROR', 'Invalid multipart payload.', 400);

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

    const { issuanceId } = await context.params;
    const admin = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await admin
      .from('ocr_issuances')
      .select('*')
      .eq('id', issuanceId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (isStaleOcrIssuancesSchemaCacheError(existingError?.message)) {
      return fail(
        'MIGRATION_REQUIRED',
        getOcrIssuancesSchemaCacheMigrationMessage(existingError?.message),
        500,
      );
    }
    if (!existing) return fail('RESOURCE_NOT_FOUND', 'OCR issuance not found.', 404);
    if (existing.status === 'issued') {
      return fail('RESOURCE_CONFLICT', 'Issued records are immutable.', 409);
    }

    await setIssuanceProgress(admin, auth, issuanceId, 5);

    const extension = inferFileExtension(file);
    const objectPath = `standalone/${auth.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage.from(OCR_UPLOADS_BUCKET).upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (uploadError) return fail('INTERNAL_ERROR', 'Unable to upload OCR source file.', 500);

    // Log upload success for correlation
    // eslint-disable-next-line no-console
    console.info('[OCR route] uploaded', { path: objectPath, size: file.size, issuanceId });

    await setIssuanceProgress(admin, auth, issuanceId, 25, {
      source_file_name: file.name,
      source_file_path: objectPath,
      source_mime_type: file.type,
      source_file_size_bytes: file.size,
    });

    try {
      let dynamicDef = undefined;
      const { getOcrTemplateByKey, buildAdminTemplateOcrDefinition } = await import('@/lib/ocr/templates');
      if (!getOcrTemplateByKey(existing.template_key)) {
        const { data: dbTemplate } = await admin
          .from('document_templates')
          .select('id, name, body, dynamic_fields')
          .eq('id', existing.template_key)
          .maybeSingle();
        if (dbTemplate) {
          dynamicDef = buildAdminTemplateOcrDefinition({
            id: dbTemplate.id,
            name: dbTemplate.name,
            documentType: dbTemplate.body?.match(/"documentType":"([^"]+)"/)?.[1],
            body: dbTemplate.body,
            dynamicFields: dbTemplate.dynamic_fields ?? [],
          });
        }
      }

      const template = getTemplateConfig(existing.template_key, dynamicDef);
      await setIssuanceProgress(admin, auth, issuanceId, 45);

      const extracted = await extractTextWithGemini(file, {
        templateFields: template.fields,
        templateLabels: template.labels,
      });

      const validation = validateOcrTemplateMatch(existing.template_key, extracted.extractedText);
      if (!validation.isMatch && validation.errorMessage) {
        const { data: failed } = await admin
          .from('ocr_issuances')
          .update({
            status: 'draft',
            extracted_text: extracted.extractedText,
            parsed_fields: {},
            ocr_progress_percent: null,
            error_message: validation.errorMessage,
            source_file_name: file.name,
            source_file_path: objectPath,
            source_mime_type: file.type,
            source_file_size_bytes: file.size,
            updated_at: new Date().toISOString(),
          })
          .eq('id', issuanceId)
          .eq('tenant_id', auth.tenantId)
          .select('*')
          .single();

        return ok(toStandaloneIssuance((failed ?? existing) as StandaloneIssuanceRow));
      }

      const mergedParsedFields = {
        ...normalizeStandaloneParsedFields(existing.parsed_fields),
        ...normalizeStandaloneParsedFields(extracted.parsedFields),
      };

      await setIssuanceProgress(admin, auth, issuanceId, 90);

      const { data, error } = await admin
        .from('ocr_issuances')
        .update({
          extracted_text: extracted.extractedText,
          parsed_fields: mergedParsedFields,
          status: 'ocr_completed',
          model_name: extracted.model,
          error_message: null,
          source_file_name: file.name,
          source_file_path: objectPath,
          source_mime_type: file.type,
          source_file_size_bytes: file.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issuanceId)
        .eq('tenant_id', auth.tenantId)
        .select('*')
        .single();
      if (error || !data) {
        return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update OCR issuance.', 500);
      }

      await writeAuditLog({
        tenantId: auth.tenantId,
        actorId: auth.userId,
        actorRole: auth.role,
        action: 'ocr_issuances.run_ocr',
        targetId: issuanceId,
        context: { model: extracted.model, mimeType: file.type, fileSizeBytes: file.size },
      });

      // eslint-disable-next-line no-console
      console.info('[OCR route] completed', { issuanceId, model: extracted.model });

      return ok(toStandaloneIssuance(data as StandaloneIssuanceRow));
    } catch (error) {
      // Existing per-extraction catch preserved (update DB -> set draft + error_message)
      const isModelUnavailable = error instanceof OcrModelUnavailableError;
      const errorMessage = isModelUnavailable
        ? error.message
        : error instanceof Error
        ? error.message
        : 'OCR extraction failed.';
      // eslint-disable-next-line no-console
      console.error('[OCR route] extraction error', errorMessage, error);
      const { data: failed } = await admin
        .from('ocr_issuances')
        .update({
          status: 'draft',
          error_message: errorMessage,
          source_file_name: file.name,
          source_file_path: objectPath,
          source_mime_type: file.type,
          source_file_size_bytes: file.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issuanceId)
        .eq('tenant_id', auth.tenantId)
        .select('*')
        .single();
      if (!failed) return fail('INTERNAL_ERROR', errorMessage, isModelUnavailable ? 503 : 500);
      return fail('INTERNAL_ERROR', errorMessage, isModelUnavailable ? 503 : 500, {
        issuance: toStandaloneIssuance(failed as StandaloneIssuanceRow),
      });
    }
  } catch (outerError) {
    // eslint-disable-next-line no-console
    console.error('[OCR route] unexpected error', outerError);
    const message = outerError instanceof Error ? outerError.message : 'Unexpected server error';
    return fail('INTERNAL_ERROR', message, 500);
  }
}
