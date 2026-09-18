import {
  getMissingRequiredTemplateFields,
  getTemplateDefaults,
  getTemplateOrDefault,
} from '@/lib/ocr/templates';

export type StandaloneIssuanceRow = {
  id: string;
  resident_id: string | null;
  status: 'draft' | 'ocr_completed' | 'issued';
  template_key: string;
  template_version: string;
  ocr_progress_percent: number | null;
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

export function normalizeStandaloneParsedFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, fieldValue]) => {
    acc[key] = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue == null ? '' : String(fieldValue).trim();
    return acc;
  }, {});
}

export function toStandaloneIssuance(row: StandaloneIssuanceRow) {
  return {
    id: row.id,
    residentId: row.resident_id ?? undefined,
    status: row.status,
    templateKey: row.template_key,
    templateVersion: row.template_version,
    ocrProgressPercent: row.ocr_progress_percent ?? null,
    parsedFields: normalizeStandaloneParsedFields(row.parsed_fields),
    extractedText: row.extracted_text ?? '',
    model: row.model_name ?? undefined,
    errorMessage: row.error_message ?? undefined,
    sourceFileName: row.source_file_name ?? undefined,
    sourceFilePath: row.source_file_path ?? undefined,
    sourceMimeType: row.source_mime_type ?? undefined,
    sourceFileSizeBytes: row.source_file_size_bytes ?? undefined,
    linkedRequestId: row.linked_request_id ?? undefined,
    generatedDocumentId: row.generated_document_id ?? undefined,
    issuedAt: row.issued_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function getTemplateFieldDefaults(templateKey?: string | null): Record<string, string> {
  return getTemplateDefaults(templateKey);
}

export function getMissingTemplateFields(templateKey: string | null | undefined, parsedFields: Record<string, string>) {
  return getMissingRequiredTemplateFields(templateKey, parsedFields);
}

export function getTemplateConfig(templateKey: string | null | undefined) {
  const template = getTemplateOrDefault(templateKey);
  return {
    key: template.key,
    version: template.version,
    fields: template.defaultFields,
    labels: template.labels,
    requiredFields: template.requiredFields,
    name: template.name,
    documentLabel: template.documentLabel,
  };
}
