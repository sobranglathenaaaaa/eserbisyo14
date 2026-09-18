import type { Announcement, UserRole } from '@/lib/types/models';

type AnnouncementVisibilityInput = {
  audience: Announcement['audience'];
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string | null;
};

function parseTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isAnnouncementActiveWindow(input: Pick<AnnouncementVisibilityInput, 'startAt' | 'endAt' | 'createdAt'>, now = new Date()) {
  const start = parseTime(input.startAt) ?? parseTime(input.createdAt);
  const end = parseTime(input.endAt);

  if (start && now.getTime() < start.getTime()) return false;
  if (end && now.getTime() > end.getTime()) return false;
  return true;
}

export function isAnnouncementAudienceVisible(audience: Announcement['audience'], role: UserRole) {
  if (audience === 'all') return true;
  if (audience === 'resident') return role === 'resident';
  return role === 'staff' || role === 'admin';
}

export function isAnnouncementVisibleToRole(input: AnnouncementVisibilityInput, role: UserRole, now = new Date()) {
  return isAnnouncementAudienceVisible(input.audience, role) && isAnnouncementActiveWindow(input, now);
}
