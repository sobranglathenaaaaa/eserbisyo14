import { NextRequest } from 'next/server';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';
import { isAnnouncementActiveWindow, isAnnouncementVisibleToRole } from '@/lib/announcements/schedule';

type AnnouncementPayload = {
  title: string;
  body: string;
  audience: 'all' | 'resident' | 'staff';
  startAt: string;
  endAt: string;
};

function parseScheduleWindow(body: Pick<AnnouncementPayload, 'startAt' | 'endAt'>) {
  const start = new Date(body.startAt);
  const end = new Date(body.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false as const, message: 'startAt and endAt must be valid date-time values.' };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false as const, message: 'endAt must be later than startAt.' };
  }
  return { ok: true as const, startAt: start.toISOString(), endAt: end.toISOString() };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('announcements')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });
  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  const announcements = (data ?? []).filter((item) =>
    auth.role === 'admin' || auth.role === 'staff'
      ? true
      : isAnnouncementVisibleToRole(
          {
            audience: item.audience,
            startAt: item.start_at ?? item.created_at,
            endAt: item.end_at ?? null,
            createdAt: item.created_at,
          },
          auth.role
        )
  );

  return ok({ announcements });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'manage_announcements');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const body = (await request.json().catch(() => null)) as AnnouncementPayload | null;
  if (!body?.title || !body?.body || !body?.audience || !body?.startAt || !body?.endAt) {
    return fail('VALIDATION_ERROR', 'title, body, audience, startAt, and endAt are required', 400);
  }
  const scheduleWindow = parseScheduleWindow(body);
  if (!scheduleWindow.ok) return fail('VALIDATION_ERROR', scheduleWindow.message, 400);

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('announcements')
    .insert({
      tenant_id: auth.tenantId,
      title: body.title.trim(),
      body: body.body.trim(),
      audience: body.audience,
      start_at: scheduleWindow.startAt,
      end_at: scheduleWindow.endAt,
      created_by: auth.userId,
    })
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to create announcement', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'announcements.create',
    targetId: data.id,
  });

  if (isAnnouncementActiveWindow({ startAt: data.start_at, endAt: data.end_at, createdAt: data.created_at })) {
    const recipientRoles =
      body.audience === 'all' ? ['resident', 'staff'] : body.audience === 'resident' ? ['resident'] : ['staff'];
    const actionHref = body.audience === 'resident' ? '/resident/notifications' : '/staff/notifications';

    const { data: recipientRows } = await admin
      .from('profiles')
      .select('id, role')
      .eq('tenant_id', auth.tenantId)
      .in('role', recipientRoles)
      .eq('is_deleted', false);

    for (const row of recipientRows ?? []) {
      try {
        await notifyResident({
          tenantId: auth.tenantId,
          userId: row.id,
          title: data.title,
          message: data.body,
          type: 'system',
          priority: 'info',
          eventKey: 'announcement.published',
          entityType: 'announcement',
          entityId: data.id,
          actionHref: row.role === 'resident' ? '/resident/notifications' : actionHref,
        });
      } catch (err) {
        console.error('notifyResident failed for user', row.id, err);
      }
    }
  }

  return ok(data, { status: 201 });
}
