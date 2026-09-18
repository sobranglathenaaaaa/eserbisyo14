import { NextRequest } from 'next/server';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type RouteContext = { params: Promise<{ announcementId: string }> };

function parseScheduleWindow(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false as const, message: 'startAt and endAt must be valid date-time values.' };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false as const, message: 'endAt must be later than startAt.' };
  }
  return { ok: true as const, startAt: start.toISOString(), endAt: end.toISOString() };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'manage_announcements');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const { announcementId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { title?: string; body?: string; audience?: 'all' | 'resident' | 'staff'; startAt?: string; endAt?: string }
    | null;
  if (!body) return fail('VALIDATION_ERROR', 'Invalid request body', 400);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === 'string') updates.title = body.title.trim();
  if (typeof body.body === 'string') updates.body = body.body.trim();
  if (body.audience) updates.audience = body.audience;
  if (body.startAt !== undefined || body.endAt !== undefined) {
    if (!body.startAt || !body.endAt) {
      return fail('VALIDATION_ERROR', 'startAt and endAt are required when updating the schedule.', 400);
    }
    const scheduleWindow = parseScheduleWindow(body.startAt, body.endAt);
    if (!scheduleWindow.ok) return fail('VALIDATION_ERROR', scheduleWindow.message, 400);
    updates.start_at = scheduleWindow.startAt;
    updates.end_at = scheduleWindow.endAt;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('announcements')
    .update(updates)
    .eq('id', announcementId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('RESOURCE_NOT_FOUND', error?.message ?? 'Announcement not found', 404);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'announcements.update',
    targetId: announcementId,
  });

  return ok(data);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'manage_announcements');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const { announcementId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from('announcements').delete().eq('id', announcementId).eq('tenant_id', auth.tenantId);
  if (error) return fail('RESOURCE_NOT_FOUND', error.message, 404);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'announcements.delete',
    targetId: announcementId,
  });

  return ok({ deleted: true });
}
