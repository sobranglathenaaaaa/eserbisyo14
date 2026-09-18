import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const { notificationId } = await context.params;

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('tenant_id', auth.tenantId)
    .eq('user_id', auth.userId);

  if (error) return fail('RESOURCE_NOT_FOUND', error.message, 404);
  return ok({ read: true });
}

