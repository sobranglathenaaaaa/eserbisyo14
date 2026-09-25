import type { Locale, ReportStatus, RequestStatus } from '../types/models';

const requestStatusLabel: Record<RequestStatus, { en: string; fil: string }> = {
  pending: { en: 'Pending', fil: 'Naghihintay' },
  staff_reviewed: { en: 'Staff reviewed', fil: 'Nasuri ng staff' },
  approved: { en: 'Approved', fil: 'Inaprubahan' },
  ready_for_pickup: { en: 'Ready for pickup', fil: 'Handa nang kunin' },
  completed: { en: 'Done', fil: 'Tapos na' },
  declined: { en: 'Declined', fil: 'Hindi aprubado' },
  cancelled: { en: 'Cancelled', fil: 'Kinansela' },
};

const reportStatusLabel: Record<ReportStatus, { en: string; fil: string }> = {
  pending: { en: 'Waiting', fil: 'Naghihintay' },
  approved: { en: 'Approved', fil: 'Inaprubahan' },
  under_review: { en: 'Under Review', fil: 'Sinusuri' },
  proceed_to_barangay: { en: 'Proceed to Barangay', fil: 'Pumunta sa Barangay' },
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
