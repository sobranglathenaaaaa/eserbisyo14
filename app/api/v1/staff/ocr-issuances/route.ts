import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getTemplateConfig, getTemplateFieldDefaults, toStandaloneIssuance } from '@/lib/ocr/issuance';
import { getOcrTemplateByKey } from '@/lib/ocr/templates';
import {
  getOcrIssuancesSchemaCacheMigrationMessage,
  isStaleOcrIssuancesSchemaCacheError,
} from './_schema-cache';

type StandaloneIssuanceInsertRow = {
  id: string;
  resident_id: string | null;
  status: 'draft' | 'ocr_completed' | 'issued';
  template_key: string;
  template_version: string;
  parsed_fields: Record<string, unknown> | null;
  extracted_text: string | null;
  model_name: string | null;
  error_message: string | null;
  source_file_name: string | null;
  source_file_path: string | null;
  source_mime_type: string | null;
  source_file_size_bytes: number | null;
  linked_request_id: string | null;
  generated_document_id: string | null;
  issued_at: string | null;
  updated_at: string | null;
  created_at: string;
};

function isMissingOcrIssuancesTableError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('public.ocr_issuances') && normalized.includes('schema cache');
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

  const body = (await request.json().catch(() => null)) as { templateKey?: string } | null;
  const requestedTemplateKey = typeof body?.templateKey === 'string' ? body.templateKey.trim() : '';
  const admin = getSupabaseAdminClient();
  let dynamicDef = undefined;

  if (requestedTemplateKey && !getOcrTemplateByKey(requestedTemplateKey)) {
    const { data: dbTemplate } = await admin
      .from('document_templates')
      .select('id, name, body, dynamic_fields')
      .eq('id', requestedTemplateKey)
      .maybeSingle();

    if (dbTemplate) {
      const { buildDynamicOcrTemplateDefinition } = await import('@/lib/ocr/templates');
      dynamicDef = buildDynamicOcrTemplateDefinition({
        id: dbTemplate.id,
        name: dbTemplate.name,
        body: dbTemplate.body,
        dynamicFields: dbTemplate.dynamic_fields ?? [],
      });
    } else {
      return fail('VALIDATION_ERROR', `Unsupported templateKey "${requestedTemplateKey}".`, 400);
    }
  }

  const template = getTemplateConfig(requestedTemplateKey || null, dynamicDef);
  const { data, error } = await admin
    .from('ocr_issuances')
    .insert({
      tenant_id: auth.tenantId,
      created_by: auth.userId,
      resident_id: null,
      template_key: template.key,
      template_version: template.version,
      status: 'draft',
      extracted_text: '',
      parsed_fields: getTemplateFieldDefaults(template.key, dynamicDef),
      required_fields: template.requiredFields,
      model_name: null,
      error_message: null,
      source_file_name: null,
      source_file_path: null,
      source_mime_type: null,
      source_file_size_bytes: null,
      linked_request_id: null,
      generated_document_id: null,
      issued_at: null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) {
    if (isStaleOcrIssuancesSchemaCacheError(error?.message)) {
      return fail(
        'MIGRATION_REQUIRED',
        getOcrIssuancesSchemaCacheMigrationMessage(error?.message),
        500,
      );
    }
    return fail('INTERNAL_ERROR', error?.message ?? 'Unable to create OCR issuance.', 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'ocr_issuances.create',
    targetId: data.id,
  });

  return ok(toStandaloneIssuance(data as any), { status: 201 });
}
