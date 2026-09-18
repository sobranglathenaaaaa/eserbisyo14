import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from('notifications')
    .update({ read: true })
    .eq('tenant_id', auth.tenantId)
    .eq('user_id', auth.userId)
    .eq('read', false);

  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok({ readAll: true });
}

