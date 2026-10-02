import type { Announcement, UserRole } from '@/lib/types/models';
import type { Locale } from '@/lib/types/models';
import { formatDateTime } from '@/lib/formatters';

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
  const end = parseTime(input.endAt);

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

export function formatAnnouncementSchedule(
  input: Pick<Announcement, 'startAt' | 'endAt' | 'createdAt'>,
  locale: Locale
) {
  const start = input.startAt ?? input.createdAt;
  const end = input.endAt;
  return end
    ? `${formatDateTime(start, locale)} - ${formatDateTime(end, locale)}`
    : `${formatDateTime(start, locale)} - ${locale === 'fil' ? 'Walang end date' : 'No end date'}`;
}
