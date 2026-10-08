import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getTemplateConfig,
  normalizeStandaloneParsedFields,
  type StandaloneIssuanceRow,
  toStandaloneIssuance,
} from '@/lib/ocr/issuance';
import { getOcrTemplateByKey } from '@/lib/ocr/templates';
import {
  getOcrIssuancesSchemaCacheMigrationMessage,
  isStaleOcrIssuancesSchemaCacheError,
} from '../_schema-cache';

type RouteContext = { params: Promise<{ issuanceId: string }> };

type PatchPayload = {
  parsedFields?: Record<string, unknown>;
  residentId?: string | null;
  templateKey?: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  const { issuanceId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('ocr_issuances')
    .select('*')
    .eq('id', issuanceId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (isStaleOcrIssuancesSchemaCacheError(error?.message)) {
    return fail(
      'MIGRATION_REQUIRED',
      getOcrIssuancesSchemaCacheMigrationMessage(error?.message),
      500,
    );
  }
  if (!data) return fail('RESOURCE_NOT_FOUND', 'OCR issuance not found.', 404);

  return ok(toStandaloneIssuance(data as StandaloneIssuanceRow));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  const { issuanceId } = await context.params;
  const body = (await request.json().catch(() => null)) as PatchPayload | null;
  const parsedFieldsPatch = normalizeStandaloneParsedFields(body?.parsedFields);
  const residentId = typeof body?.residentId === 'string' && body.residentId.trim() ? body.residentId.trim() : null;
  const templateKey = typeof body?.templateKey === 'string' && body.templateKey.trim() ? body.templateKey.trim() : undefined;

  if (Object.keys(parsedFieldsPatch).length === 0 && body?.residentId === undefined && !templateKey) {
    return fail('VALIDATION_ERROR', 'Provide parsedFields, residentId, and/or templateKey.', 400);
  }

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

  if (residentId) {
    const { data: resident } = await admin
      .from('profiles')
      .select('id')
      .eq('id', residentId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!resident) return fail('RESOURCE_NOT_FOUND', 'Linked resident not found.', 404);
  }

  const mergedParsedFields = {
    ...normalizeStandaloneParsedFields(existing.parsed_fields),
    ...parsedFieldsPatch,
  };

  const updates: Record<string, unknown> = {
    parsed_fields: mergedParsedFields,
    updated_at: new Date().toISOString(),
    error_message: null,
  };
  if (body?.residentId !== undefined) {
    updates.resident_id = residentId;
  }
  if (templateKey) {
    let dynamicDef = undefined;
    if (!getOcrTemplateByKey(templateKey)) {
      const { data: dbTemplate } = await admin
        .from('document_templates')
        .select('id, name, body, dynamic_fields')
        .eq('id', templateKey)
        .maybeSingle();
      if (dbTemplate) {
        const { buildAdminTemplateOcrDefinition } = await import('@/lib/ocr/templates');
        dynamicDef = buildAdminTemplateOcrDefinition({
          id: dbTemplate.id,
          name: dbTemplate.name,
          documentType: dbTemplate.body?.match(/"documentType":"([^"]+)"/)?.[1],
          body: dbTemplate.body,
          dynamicFields: dbTemplate.dynamic_fields ?? [],
        });
      }
    }
    const template = getTemplateConfig(templateKey, dynamicDef);
    updates.template_key = template.key;
    updates.template_version = template.version;
  }

  const { data, error } = await admin
    .from('ocr_issuances')
    .update(updates)
    .eq('id', issuanceId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update OCR issuance.', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'ocr_issuances.update',
    targetId: issuanceId,
  });

  return ok(toStandaloneIssuance(data as StandaloneIssuanceRow));
}
