import type { AppState, Locale } from '@/lib/types/models';
import { copyText } from './copy';
import {
  getResidentNotifications,
  getResidentRequests,
} from './selectors';

export function getResidentNotificationContext(state: AppState, residentId: string | undefined, locale: Locale) {
  const notifications = getResidentNotifications(state, residentId);
  const requests = getResidentRequests(state, residentId);

  const actionable = requests.filter((item) => ['declined', 'cancelled'].includes(item.status));
  const hasUnreadRequestStatusNotification = notifications.some(
    (item) => !item.read && (item.eventKey === 'document.status_changed' || item.eventKey.startsWith('document.'))
  );

  const urgentAlerts = [
    ...(!hasUnreadRequestStatusNotification && actionable.length
      ? [
          {
            id: 'urgent-request',
            title: copyText(locale, 'Request needs action', 'Kahilingan na kailangan ng aksyon'),
            body: copyText(
              locale,
              `${actionable.length} request(s) were declined/cancelled. Open My Requests to fix and resubmit.`,
              `${actionable.length} kahilingan ang tinanggihan/kinansela. Buksan ang My Requests para ayusin at isumite muli.`
            ),
          },
        ]
      : []),
  ];

  return {
    notifications,
    urgentAlerts,
  };
}
