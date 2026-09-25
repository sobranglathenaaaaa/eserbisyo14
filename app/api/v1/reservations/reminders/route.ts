import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { notifyResident } from '@/lib/api/notifications';

const RETURN_REMINDER_WINDOW_MINUTES = 30;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'staff') return fail('AUTH_FORBIDDEN', 'Staff access required', 403);

  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + RETURN_REMINDER_WINDOW_MINUTES * 60_000);
  const admin = getSupabaseAdminClient();
  const { data: reservations, error } = await admin
    .from('reservations')
    .select('id,resident_id,item_name,end_at')
    .eq('tenant_id', auth.tenantId)
    .eq('resource', 'equipment')
    .eq('status', 'ready_for_pickup')
    .gte('end_at', now.toISOString())
    .lte('end_at', reminderWindowEnd.toISOString());

  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  await Promise.all((reservations ?? []).map((reservation) =>
    notifyResident({
      tenantId: auth.tenantId,
      userId: reservation.resident_id,
      title: 'Equipment return reminder',
      message: `Your reservation for ${reservation.item_name ?? 'equipment'} ends soon. Please return the equipment by the reserved end time.`,
      type: 'request',
      priority: 'warning',
      eventKey: 'reservation.return_reminder',
      entityType: 'reservation',
      entityId: reservation.id,
      actionHref: '/resident/reservations',
      dedupeWindowMinutes: 1440,
    })
  ));

  return ok({ remindersChecked: reservations?.length ?? 0 });
}
