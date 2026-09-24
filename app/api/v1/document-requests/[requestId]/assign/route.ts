import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'review_document_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const body = (await request.json().catch(() => null)) as { assigneeUserId: string } | null;
  if (!body?.assigneeUserId) return fail('VALIDATION_ERROR', 'assigneeUserId is required', 400);
  const { requestId } = await context.params;

  const admin = getSupabaseAdminClient();
  const { data: assignee } = await admin
    .from('profiles')
    .select('id,role,full_name')
    .eq('id', body.assigneeUserId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!assignee || (assignee.role !== 'staff' && assignee.role !== 'admin')) {
    return fail('VALIDATION_ERROR', 'Assignee must be staff or admin', 400);
  }

  const { data, error } = await admin
    .from('document_requests')
    .update({ processed_by: assignee.id, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('RESOURCE_NOT_FOUND', error?.message ?? 'Document request not found', 404);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'document_requests.assign',
    targetId: requestId,
    context: { assigneeUserId: assignee.id },
  });

  return ok({
    assigned: true,
    assignee,
  });
}

