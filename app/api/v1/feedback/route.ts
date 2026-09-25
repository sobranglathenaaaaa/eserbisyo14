import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'submit_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Resident access required', 403);
  }

  const body = (await request.json().catch(() => null)) as
    | { rating: number; message?: string; relatedRequestId?: string; source?: 'request' | 'assistant' }
    | null;
  if (typeof body?.rating !== 'number' || body.rating < 1 || body.rating > 5) {
    return fail('VALIDATION_ERROR', 'rating must be 1 to 5', 400);
  }

  const admin = getSupabaseAdminClient();
  const isAssistantFeedback = body.source === 'assistant';
  const fallbackRequestId = isAssistantFeedback
    ? null
    : body.relatedRequestId ??
      (await admin.from('document_requests').select('id').eq('resident_id', auth.userId).limit(1).maybeSingle()).data?.id;
  if (!isAssistantFeedback && !fallbackRequestId) {
    return fail('VALIDATION_ERROR', 'relatedRequestId is required', 400);
  }

  const { data, error } = await admin
    .from('feedback')
    .insert({
      tenant_id: auth.tenantId,
      request_id: fallbackRequestId,
      resident_id: auth.userId,
      rating: body.rating,
      comment: body.message ?? null,
    })
    .select('*')
    .single();
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === '23505') {
      return fail('RESOURCE_CONFLICT', 'Feedback already submitted for this request', 409);
    }
    return fail('INTERNAL_ERROR', error?.message ?? 'Unable to submit feedback', 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'feedback.create',
    targetId: data.id,
  });

  return ok(data, { status: 201 });
}
