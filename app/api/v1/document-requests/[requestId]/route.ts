import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ requestId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { requestId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('document_requests')
    .select('*')
    .eq('id', requestId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (error || !data) return fail('RESOURCE_NOT_FOUND', 'Document request not found', 404);
  if (auth.role === 'resident' && data.resident_id !== auth.userId) {
    return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
  }

  return ok(data);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as { acknowledgeFeedbackPrompt?: boolean } | null;
  if (!body?.acknowledgeFeedbackPrompt) {
    return fail('VALIDATION_ERROR', 'acknowledgeFeedbackPrompt is required', 400);
  }

  const { requestId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data: existing, error: findError } = await admin
    .from('document_requests')
    .select('id,resident_id,tenant_id')
    .eq('id', requestId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (findError || !existing) return fail('RESOURCE_NOT_FOUND', 'Document request not found', 404);
  if (auth.role === 'resident' && existing.resident_id !== auth.userId) {
    return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
  }

  const { data, error } = await admin
    .from('document_requests')
    .update({ feedback_prompted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    return fail('INTERNAL_ERROR', error?.message ?? 'Unable to acknowledge feedback prompt', 500);
  }

  return ok(data);
}
