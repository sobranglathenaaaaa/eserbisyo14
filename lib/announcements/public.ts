import 'server-only';

import { isAnnouncementActiveWindow } from '@/lib/announcements/schedule';
import type { Announcement } from '@/lib/types/models';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function getPublicAnnouncements(): Promise<Announcement[]> {
  try {
    const admin = getSupabaseAdminClient();
    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .select('id')
      .eq('slug', 'default')
      .single();

    if (tenantError || !tenant) return [];

    const { data, error } = await admin
      .from('announcements')
      .select('id, title, body, audience, start_at, end_at, created_at, updated_at, created_by')
      .eq('tenant_id', tenant.id)
      .in('audience', ['all', 'resident'])
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) return [];

    return (data ?? [])
      .filter((item) =>
        isAnnouncementActiveWindow({
          startAt: item.start_at,
          endAt: item.end_at,
          createdAt: item.created_at,
        })
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        audience: item.audience,
        startAt: item.start_at ?? item.created_at,
        endAt: item.end_at ?? undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        createdBy: item.created_by ?? '',
      }));
  } catch {
    return [];
  }
}