export function isStaleOcrIssuancesSchemaCacheError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('schema cache') && normalized.includes('ocr_issuances');
}

export function isMissingOcrProgressPercentSchemaCacheError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('schema cache') && normalized.includes('ocr_progress_percent');
}

export function getOcrIssuancesSchemaCacheMigrationMessage(message: string | undefined) {
  const normalized = (message ?? '').toLowerCase();
  if (normalized.includes('ocr_progress_percent')) {
    return 'Database column public.ocr_issuances.ocr_progress_percent is missing from the Supabase Data API schema cache. Apply migration 20260615110000_add_ocr_issuance_progress.sql and refresh schema cache.';
  }

  return 'Database table public.ocr_issuances is missing. Apply migration 20260422_add_standalone_ocr_issuance.sql and refresh schema cache.';
}