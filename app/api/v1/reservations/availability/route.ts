import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('reservations')
    .select('id, resource, item_name, quantity_requested, start_at, end_at, status')
    .eq('tenant_id', auth.tenantId)
    .in('status', ['pending', 'approved'])
    .order('start_at', { ascending: true })
    .limit(500);

  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok({ availability: data ?? [] });
}
