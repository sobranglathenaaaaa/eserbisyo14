import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  defaultLegalDocuments,
  isLegalDocumentSlug,
  LEGAL_DOCUMENT_SLUGS,
  type LegalDocument,
  type LegalDocumentSlug,
  withLegalDocumentDefaults,
} from './legal-documents';

type LegalDocumentRow = {
  slug: string;
  title: string | null;
  description: string | null;
  body: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

function rowToLegalDocument(row: LegalDocumentRow): LegalDocument | null {
  if (!isLegalDocumentSlug(row.slug)) return null;
  return withLegalDocumentDefaults({
    slug: row.slug,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    body: row.body ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    updatedBy: row.updated_by,
    persisted: true,
  });
}

function defaultDocument(slug: LegalDocumentSlug): LegalDocument {
  return withLegalDocumentDefaults({ ...defaultLegalDocuments[slug], persisted: false });
}

function defaultDocuments(): LegalDocument[] {
  return LEGAL_DOCUMENT_SLUGS.map(defaultDocument);
}

async function getDefaultTenantId() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from('tenants').select('id').eq('slug', 'default').maybeSingle();
  if (error || !data?.id) return null;
  return data.id as string;
}

export async function getLegalDocuments(tenantId?: string): Promise<LegalDocument[]> {
  try {
    const resolvedTenantId = tenantId ?? (await getDefaultTenantId());
    if (!resolvedTenantId) return defaultDocuments();

    const { data, error } = await getSupabaseAdminClient()
      .from('legal_documents')
      .select('slug,title,description,body,updated_at,updated_by')
      .eq('tenant_id', resolvedTenantId)
      .in('slug', [...LEGAL_DOCUMENT_SLUGS])
      .order('slug', { ascending: true });

    if (error) return defaultDocuments();

    const documents = new Map<LegalDocumentSlug, LegalDocument>();
    for (const row of (data ?? []) as LegalDocumentRow[]) {
      const document = rowToLegalDocument(row);
      if (document) documents.set(document.slug, document);
    }

    return LEGAL_DOCUMENT_SLUGS.map((slug) => documents.get(slug) ?? defaultDocument(slug));
  } catch {
    return defaultDocuments();
  }
}

export async function getLegalDocument(slug: LegalDocumentSlug, tenantId?: string): Promise<LegalDocument> {
  const documents = await getLegalDocuments(tenantId);
  return documents.find((document) => document.slug === slug) ?? defaultDocument(slug);
}
