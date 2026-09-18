import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from('document_types')
    .select('id,category,type,price,pricing_note')
    .eq('tenant_id', auth.tenantId)
    .order('category', { ascending: true })
    .order('type', { ascending: true })
    .order('id', { ascending: true });

  return ok({ documentTypes: data ?? [] });
}
