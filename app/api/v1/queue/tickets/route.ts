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
    | { serviceType: string; notes?: string; idempotencyKey?: string }
    | null;
  if (!body?.serviceType) return fail('VALIDATION_ERROR', 'serviceType is required', 400);

  const admin = getSupabaseAdminClient();
  const { data: duplicate } = await admin
    .from('queue_entries')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('resident_id', auth.userId)
    .eq('service', body.serviceType)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (duplicate) return ok({ id: duplicate.id, deduplicated: true });

  const { count } = await admin
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId)
    .eq('status', 'waiting');

  const { data, error } = await admin
    .from('queue_entries')
    .insert({
      tenant_id: auth.tenantId,
      resident_id: auth.userId,
      service: body.serviceType,
      status: 'waiting',
      position: (count ?? 0) + 1,
    })
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to join queue', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'queue.join',
    targetId: data.id,
    context: { idempotencyKey: body.idempotencyKey ?? null, notes: body.notes ?? '' },
  });

  return ok(data, { status: 201 });
}

