import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type RouteContext = { params: Promise<{ appointmentId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { appointmentId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from('checkup_appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Appointment not found', 404);

  if (auth.role === 'resident') {
    if (existing.resident_id !== auth.userId) {
      return fail('AUTH_FORBIDDEN', 'Residents can only cancel their own appointments', 403);
    }
    if (!['pending', 'approved'].includes(existing.status)) {
      return fail('AUTH_FORBIDDEN', 'Only pending or approved appointments can be cancelled', 403);
    }
  } else if (auth.role !== 'staff') {
    return fail('AUTH_FORBIDDEN', 'Staff or resident access required', 403);
  }

  const { data, error } = await admin
    .from('checkup_appointments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to cancel appointment', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'checkup_appointments.cancel',
    targetId: appointmentId,
  });

  return ok(data);
}

