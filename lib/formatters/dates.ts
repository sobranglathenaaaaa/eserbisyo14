import type { Locale } from '../types/models';

export function formatIncidentCaseNumber(id: string, createdAt?: string) {
  const datePart = createdAt ? createdAt.slice(0, 10).replace(/-/g, '') : 'YYYYMMDD';
  const idPart = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `INC-${datePart}-${idPart}`;
}

export function formatDateTime(value: string, locale: Locale) {
  return new Date(value).toLocaleString(locale === 'fil' ? 'fil-PH' : 'en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(value: string, locale: Locale) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);

  if (minutes < 1) return locale === 'fil' ? 'Ngayon lang' : 'Just now';
  if (minutes < 60) return locale === 'fil' ? `${minutes} minuto ang nakalipas` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === 'fil' ? `${hours} oras ang nakalipas` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return locale === 'fil' ? `${days} araw ang nakalipas` : `${days}d ago`;
}

export function timelineGroup(value: string) {
  const now = new Date();
  const date = new Date(value);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays <= 0) return 'today';
  if (diffDays <= 7) return 'week';
  return 'earlier';
}
