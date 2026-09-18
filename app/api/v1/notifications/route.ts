import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';
  const admin = getSupabaseAdminClient();
  let query = admin
    .from('notifications')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });
  if (unreadOnly) query = query.eq('read', false);

  const { data, error } = await query.limit(100);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok({ notifications: data ?? [] });
}

