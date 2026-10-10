import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { can } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('equipment')
    .select('id,name,quantity,is_deleted')
    .eq('tenant_id', auth.tenantId)
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  const { data: receivedReservations, error: reservationsError } = await admin
    .from('reservations')
    .select('item_name,quantity_requested')
    .eq('tenant_id', auth.tenantId)
    .eq('resource', 'equipment')
    .eq('status', 'received');

  if (reservationsError) return fail('INTERNAL_ERROR', reservationsError.message, 500);

  const borrowedByName = new Map<string, number>();
  for (const reservation of receivedReservations ?? []) {
    const key = String(reservation.item_name ?? '').trim().toLowerCase();
    borrowedByName.set(key, (borrowedByName.get(key) ?? 0) + Number(reservation.quantity_requested ?? 0));
  }

  return ok({
    equipment: (data ?? []).map((item) => ({
      ...item,
      quantity: Math.max(0, Number(item.quantity ?? 0) - (borrowedByName.get(item.name.trim().toLowerCase()) ?? 0)),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (!can(auth.role, 'process_document_requests')) {
    return fail('AUTH_FORBIDDEN', 'Staff access required', 403);
  }

  const body = (await request.json().catch(() => null)) as { name?: string; quantity?: number } | null;
  if (!body?.name?.trim()) return fail('VALIDATION_ERROR', 'name is required', 400);

  const admin = getSupabaseAdminClient();
  const quantity = Math.max(0, Math.floor(Number(body.quantity ?? 0)));
  const { data, error } = await admin
    .from('equipment')
    .insert({
      tenant_id: auth.tenantId,
      name: body.name.trim(),
      quantity,
      is_deleted: false,
    })
    .select('*')
    .single();

  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to create equipment', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'equipment.create',
    targetId: data.id,
  });

  return ok(data, { status: 201 });
}
