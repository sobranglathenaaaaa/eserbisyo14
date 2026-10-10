import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  let query = admin
    .from('reservations')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });

  if (auth.role === 'resident') query = query.eq('resident_id', auth.userId);
  const status = request.nextUrl.searchParams.get('status');
  if (status) query = query.eq('status', status);

  const { data, error } = await query.limit(200);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok({ reservations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'submit_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Resident access required', 403);
  }

  const body = (await request.json().catch(() => null)) as {
    serviceType?: string;
    itemName?: string;
    quantityRequested?: number;
    startAt?: string;
    endAt?: string;
    notes?: string;
  } | null;

  if (!body?.serviceType || !body.startAt || !body.endAt || !body.notes) {
    return fail('VALIDATION_ERROR', 'serviceType, startAt, endAt and notes are required', 400);
  }

  const startDate = new Date(body.startAt);
  const endDate = new Date(body.endAt);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return fail('VALIDATION_ERROR', 'Invalid reservation startAt or endAt date format', 400);
  }

  // 1. Advance lead time check (must be booked at least 2 days in advance)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const minAllowedStart = todayStart + (2 * 24 * 60 * 60 * 1000);
  if (startDate.getTime() < minAllowedStart) {
    return fail('VALIDATION_ERROR', 'Ang reservation ay kailangang i-book nang hindi bababa sa 2 araw bago ang mismong petsa ng reservation. / Reservations must be booked at least 2 days before the actual reservation date.', 400);
  }

  // 2. Maximum duration check (maximum 7 days / 1 week per request)
  const durationMs = endDate.getTime() - startDate.getTime();
  const maxDurationMs = 7 * 24 * 60 * 60 * 1000;
  if (durationMs > maxDurationMs) {
    return fail('VALIDATION_ERROR', 'Hanggang 1 linggo (7 araw) lamang ang pwedeng i-reserve. Kung kailangang mag-extend, magpasa ng panibagong hiwalay na request para sa reservation. / Maximum reservation duration is 1 week (7 days). If you need an extension beyond 1 week, please submit another separate reservation request.', 400);
  }

  const startAtIso = startDate.toISOString();
  const endAtIso = endDate.toISOString();
  const date = startAtIso.slice(0, 10);

  const admin = getSupabaseAdminClient();
  // Availability checks
  const resource = body.serviceType;
  const qtyRequested = body.quantityRequested ?? 1;
  const resolvedItemName =
    body.itemName?.trim() ||
    (resource === 'barangay_hall'
      ? 'Multi Purpose Hall'
      : resource === 'covered_court'
        ? 'Covered Court'
        : resource === 'service_vehicle'
          ? 'Service Vehicle'
          : null);

  if (resource === 'equipment') {
    if (!body.itemName) return fail('VALIDATION_ERROR', 'itemName is required for equipment reservations', 400);
    const { data: equip } = await admin
      .from('equipment')
      .select('id,name,quantity')
      .eq('tenant_id', auth.tenantId)
      .ilike('name', body.itemName)
      .maybeSingle();
    if (!equip) return fail('RESOURCE_NOT_FOUND', 'Equipment not found', 404);

    const { data: existingRes } = await admin
      .from('reservations')
      .select('quantity_requested,start_at,end_at,status')
      .eq('tenant_id', auth.tenantId)
      .eq('resource', 'equipment')
      .ilike('item_name', body.itemName)
      .in('status', ['pending', 'approved', 'ready_for_pickup', 'received']);

    let reserved = 0;
    const newStart = new Date(startAtIso).getTime();
    const newEnd = new Date(endAtIso).getTime();
    for (const r of (existingRes as any[]) || []) {
      const s = r.start_at ? new Date(r.start_at).getTime() : null;
      const e = r.end_at ? new Date(r.end_at).getTime() : null;
      if (s !== null && e !== null && s < newEnd && e > newStart) {
        reserved += r.quantity_requested ?? 0;
      }
    }

    if ((reserved + qtyRequested) > (equip.quantity ?? 0)) {
      return fail('RESOURCE_CONFLICT', 'Not enough equipment available for the selected time', 409);
    }
  } else {
    // For facility-like resources ensure no overlapping approved/pending reservation
    const { data: existing } = await admin
      .from('reservations')
      .select('id,start_at,end_at,status')
      .eq('tenant_id', auth.tenantId)
      .eq('resource', resource)
      .in('status', ['pending', 'approved', 'ready_for_pickup', 'received']);

    const newStart = new Date(startAtIso).getTime();
    const newEnd = new Date(endAtIso).getTime();
    for (const r of (existing as any[]) || []) {
      const s = r.start_at ? new Date(r.start_at).getTime() : null;
      const e = r.end_at ? new Date(r.end_at).getTime() : null;
      if (s !== null && e !== null && s < newEnd && e > newStart) {
        return fail('RESOURCE_CONFLICT', 'Selected facility is already reserved for the chosen time', 409);
      }
    }
  }

  if (!resolvedItemName) {
    return fail('VALIDATION_ERROR', 'Unable to resolve reservation item name', 400);
  }

  const { data, error } = await admin
    .from('reservations')
    .insert({
      tenant_id: auth.tenantId,
      resident_id: auth.userId,
      resource: body.serviceType,
      item_name: resolvedItemName,
      quantity_requested: qtyRequested,
      date,
      start_at: startAtIso,
      end_at: endAtIso,
      time_slot: null,
      purpose: body.notes,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to create reservation', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'reservations.create',
    targetId: data.id,
  });

  return ok(data, { status: 201 });
}
