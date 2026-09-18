import type { Locale, ReportStatus, RequestStatus } from '../types/models';

const requestStatusLabel: Record<RequestStatus, { en: string; fil: string }> = {
  pending: { en: 'Pending', fil: 'Naghihintay' },
  staff_reviewed: { en: 'Staff reviewed', fil: 'Nasuri ng staff' },
  approved: { en: 'Approved', fil: 'Inaprubahan' },
  processing: { en: 'Working on it', fil: 'Ginagawa' },
  completed: { en: 'Ready', fil: 'Handa na' },
  declined: { en: 'Declined', fil: 'Hindi aprubado' },
  cancelled: { en: 'Cancelled', fil: 'Kinansela' },
};

const reportStatusLabel: Record<ReportStatus, { en: string; fil: string }> = {
  pending: { en: 'Waiting', fil: 'Naghihintay' },
  under_review: { en: 'Under Review', fil: 'Sinusuri' },
  resolved: { en: 'Done', fil: 'Naresolba' },
  declined: { en: 'Declined', fil: 'Tinanggihan' },
};

export function getRequestStatusLabel(status: RequestStatus, locale: Locale) {
  const label = requestStatusLabel[status];
  return locale === 'fil' ? label.fil : label.en;
}

export function getReportStatusLabel(status: ReportStatus, locale: Locale) {
  const label = reportStatusLabel[status];
  return locale === 'fil' ? label.fil : label.en;
}
