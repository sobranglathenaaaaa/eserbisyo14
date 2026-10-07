import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_OFFICIAL_TEMPLATES } from '@/lib/documents/document-catalog-constants';

export type PublicDocumentCatalogItem = {
  id: string;
  name: string;
  price: number;
  pricingNote?: string;
};

export async function getPublicDocumentCatalog(): Promise<PublicDocumentCatalogItem[]> {
  const fallback = DEFAULT_OFFICIAL_TEMPLATES.slice(0, 5).map((document) => ({
    id: document.id,
    name: document.name,
    price: document.price,
    pricingNote: document.pricingNote,
  }));

  try {
    const admin = getSupabaseAdminClient();
    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .select('id')
      .eq('slug', 'default')
      .single();

    if (tenantError || !tenant) return fallback;

    const { data, error } = await admin
      .from('document_types')
      .select('id, type, price, pricing_note')
      .eq('tenant_id', tenant.id)
      .order('type', { ascending: true })
      .limit(5);

    if (error || !data?.length) return fallback;

    return data.map((document) => ({
      id: String(document.id),
      name: String(document.type),
      price: Number(document.price ?? 0),
      pricingNote: document.pricing_note ? String(document.pricing_note) : undefined,
    }));
  } catch {
    return fallback;
  }
}
