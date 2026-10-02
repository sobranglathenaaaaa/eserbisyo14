import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_OFFICIAL_TEMPLATES, getCategoryLabel } from '@/lib/documents/document-catalog-constants';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  let { data } = await admin
    .from('document_types')
    .select('id,category,type,price,pricing_note')
    .eq('tenant_id', auth.tenantId)
    .order('category', { ascending: true })
    .order('type', { ascending: true })
    .order('id', { ascending: true });

  if (!data || data.length === 0) {
    const seedRows = DEFAULT_OFFICIAL_TEMPLATES.map((tpl) => ({
      tenant_id: auth.tenantId,
      category: getCategoryLabel(tpl.categoryId),
      type: tpl.name,
      price: tpl.price,
      pricing_note: tpl.pricingNote || null,
    }));

    const { data: inserted } = await admin
      .from('document_types')
      .insert(seedRows)
      .select('id,category,type,price,pricing_note');

    data = inserted ?? seedRows.map((r, index) => ({ ...r, id: `seed-type-${index}` }));
  }

  return ok({ documentTypes: data ?? [] });
}

