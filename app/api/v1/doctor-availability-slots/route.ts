import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { isSlotInFuture, validateSlotWindow } from '@/lib/checkups/slots';

type SlotPayload = {
  doctorName?: string;
  date?: string;
  startAt?: string;
  endAt?: string;
  capacity?: number;
  isBlocked?: boolean;
  notes?: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const date = request.nextUrl.searchParams.get('date');
  const admin = getSupabaseAdminClient();

  let slotsQuery = admin
    .from('doctor_availability_slots')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('start_at', { ascending: true });

  if (date) {
    slotsQuery = slotsQuery.eq('date', date);
  }

  const { data: slots, error: slotsError } = await slotsQuery;
  if (slotsError) return fail('INTERNAL_ERROR', slotsError.message, 500);

  if (auth.role !== 'resident') {
    return ok({ slots: slots ?? [] });
  }

  let appointmentsQuery = admin
    .from('checkup_appointments')
    .select('slot_id')
    .eq('tenant_id', auth.tenantId)
    .in('status', ['pending', 'approved', 'completed']);
  if (date) appointmentsQuery = appointmentsQuery.eq('date', date);

  const { data: booked, error: bookedError } = await appointmentsQuery;
  if (bookedError) return fail('INTERNAL_ERROR', bookedError.message, 500);
  const bookedSlotIds = new Set(((booked as Array<{ slot_id: string }> | null) ?? []).map((item) => item.slot_id));

  const available =
    (slots ?? []).filter(
      (slot) =>
        !slot.is_blocked &&
        isSlotInFuture(slot.end_at) &&
        !bookedSlotIds.has(slot.id)
    );

  return ok({ slots: available });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') return fail('AUTH_FORBIDDEN', 'Staff access required', 403);

  const body = (await request.json().catch(() => null)) as SlotPayload | null;
  if (!body?.doctorName?.trim() || !body.date || !body.startAt || !body.endAt) {
    return fail('VALIDATION_ERROR', 'doctorName, date, startAt, and endAt are required', 400);
  }

  const valid = validateSlotWindow({
    date: body.date,
    startAt: body.startAt,
    endAt: body.endAt,
  });
  if (!valid.ok) return fail('VALIDATION_ERROR', valid.message, 400);

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('doctor_availability_slots')
    .insert({
      tenant_id: auth.tenantId,
      doctor_name: body.doctorName.trim(),
      date: body.date,
      start_at: valid.startAtIso,
      end_at: valid.endAtIso,
      capacity: typeof body.capacity === 'number' && body.capacity >= 5 && body.capacity <= 15 ? body.capacity : 7,
      is_blocked: Boolean(body.isBlocked),
      notes: body.notes?.trim() || null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select('*')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return fail('RESOURCE_CONFLICT', 'Duplicate doctor slot for this time window', 409);
    }
    return fail('INTERNAL_ERROR', error.message, 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'doctor_availability_slots.create',
    targetId: data.id,
  });

  return ok(data, { status: 201 });
}
