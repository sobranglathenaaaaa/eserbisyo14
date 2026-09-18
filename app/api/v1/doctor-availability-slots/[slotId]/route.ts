import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { toClock, validateSlotWindow } from '@/lib/checkups/slots';

type RouteContext = { params: Promise<{ slotId: string }> };
type SlotPayload = {
  doctorName?: string;
  date?: string;
  startAt?: string;
  endAt?: string;
  isBlocked?: boolean;
  notes?: string;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') return fail('AUTH_FORBIDDEN', 'Staff access required', 403);

  const { slotId } = await context.params;
  const body = (await request.json().catch(() => null)) as SlotPayload | null;
  if (!body) return fail('VALIDATION_ERROR', 'Invalid request body', 400);

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from('doctor_availability_slots')
    .select('*')
    .eq('id', slotId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Doctor slot not found', 404);

  // Only validate slot window if time-related fields are being updated
  const isUpdatingTimes = body.date || body.startAt || body.endAt;
  const nextDate = body.date ?? existing.date;
  const nextStart = body.startAt ?? toClock(existing.start_at);
  const nextEnd = body.endAt ?? toClock(existing.end_at);
  
  let startAtIso = existing.start_at;
  let endAtIso = existing.end_at;

  if (isUpdatingTimes) {
    const valid = validateSlotWindow({ date: nextDate, startAt: nextStart, endAt: nextEnd });
    if (!valid.ok) return fail('VALIDATION_ERROR', valid.message, 400);
    startAtIso = valid.startAtIso;
    endAtIso = valid.endAtIso;
  }

  const { data, error } = await admin
    .from('doctor_availability_slots')
    .update({
      doctor_name: body.doctorName?.trim() ?? existing.doctor_name,
      date: nextDate,
      start_at: startAtIso,
      end_at: endAtIso,
      is_blocked: typeof body.isBlocked === 'boolean' ? body.isBlocked : existing.is_blocked,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : existing.notes,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', slotId)
    .eq('tenant_id', auth.tenantId)
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
    action: 'doctor_availability_slots.update',
    targetId: slotId,
  });

  return ok(data);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') return fail('AUTH_FORBIDDEN', 'Staff access required', 403);

  const { slotId } = await context.params;
  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin
    .from('doctor_availability_slots')
    .select('id')
    .eq('id', slotId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Doctor slot not found', 404);

  // Soft delete by updating is_blocked to true (preserves record in database)
  const { error } = await admin
    .from('doctor_availability_slots')
    .update({
      is_blocked: true,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', slotId)
    .eq('tenant_id', auth.tenantId);

  if (error) {
    return fail('INTERNAL_ERROR', error.message, 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'doctor_availability_slots.delete',
    targetId: slotId,
  });

  return ok({ deleted: true, softDeleted: true });
}
