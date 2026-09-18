import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  let query = admin
    .from('document_requests')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('updated_at', { ascending: false });
  if (auth.role === 'resident') query = query.eq('resident_id', auth.userId);

  const { data, error } = await query.limit(200);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok({ history: data ?? [] });
}

