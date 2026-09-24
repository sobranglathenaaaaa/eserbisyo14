import type { AppState, Locale, ReportStatus, RequestStatus } from '@/lib/types/models';
import { isAnnouncementVisibleToRole } from '@/lib/announcements/schedule';
import { formatIncidentCaseNumber, timelineGroup } from '@/lib/formatters/dates';
import { copyText } from './copy';
import {
  getResidentNotifications,
  getResidentReports,
  getResidentRequests,
} from './selectors';

export type ResidentAlert = { id: string; title: string; body: string };
export type ResidentPrimaryCta = { label: string; href: string };
export type ResidentPriorityState = 'urgent' | 'normal';

export type ResidentTimelineItem =
  | {
      id: string;
      type: 'request';
      title: string;
      subtitle: string;
      status: RequestStatus;
      createdAt: string;
    }
  | {
      id: string;
      type: 'report';
      title: string;
      subtitle: string;
      status: ReportStatus;
      createdAt: string;
    }
  | {
      id: string;
      type: 'notification';
      title: string;
      subtitle: string;
      status: 'read' | 'pending';
      createdAt: string;
    };

export function getResidentDashboardData(state: AppState, residentId: string | undefined, locale: Locale) {
  const myRequests = getResidentRequests(state, residentId);
  const myReports = getResidentReports(state, residentId);
  const myNotifications = getResidentNotifications(state, residentId);

  const activeRequests = myRequests
    .filter((item) => ['pending', 'approved', 'processing'].includes(item.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const actionableRequests = myRequests.filter((item) => ['declined', 'cancelled'].includes(item.status));
  const inProgressRequests = myRequests.filter((item) => ['pending', 'approved', 'processing'].includes(item.status));
  const readyForRelease = myRequests.filter((item) => item.status === 'ready_for_pickup');
  const completedRequests = myRequests.filter((item) => item.status === 'completed');

  const urgentAlerts: ResidentAlert[] = [];
  if (actionableRequests.length > 0) {
    urgentAlerts.push({
      id: 'fix-request',
      title: copyText(locale, 'Needs action', 'Kailangan ng aksyon'),
      body: copyText(
        locale,
        `${actionableRequests.length} request(s) need correction.`,
        `${actionableRequests.length} kahilingan ang kailangang ayusin.`
      ),
    });
  }

  const primaryCta: ResidentPrimaryCta =
    actionableRequests.length > 0
      ? {
          label: copyText(locale, 'Review Now', 'Tingnan'),
          href: '/resident/request-history',
        }
      : {
          label: copyText(locale, 'Open Requests', 'Buksan ang Kahilingan'),
          href: '/resident/document-requests',
        };

  const priorityState: ResidentPriorityState = urgentAlerts.length > 0 ? 'urgent' : 'normal';

  const timelineItems: ResidentTimelineItem[] = [
    ...myRequests.map<ResidentTimelineItem>((item) => ({
      id: `request-${item.id}`,
      type: 'request',
      title: copyText(locale, `Request ${item.referenceNumber}`, `Kahilingan ${item.referenceNumber}`),
      subtitle: copyText(locale, item.typeLabel, item.typeLabel),
      status: item.status,
      createdAt: item.updatedAt || item.createdAt,
    })),
    ...myReports.map<ResidentTimelineItem>((item) => ({
      id: `report-${item.id}`,
      type: 'report',
      title: copyText(locale, `${formatIncidentCaseNumber(item.id, item.createdAt)} - ${item.title}`, `${formatIncidentCaseNumber(item.id, item.createdAt)} - ${item.title}`),
      subtitle: copyText(locale, item.location, item.location),
      status: item.status,
      createdAt: item.updatedAt || item.createdAt,
    })),
    ...myNotifications.map<ResidentTimelineItem>((item) => ({
      id: `notification-${item.id}`,
      type: 'notification',
      title: item.title,
      subtitle: item.message,
      status: item.read ? 'read' : 'pending',
      createdAt: item.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const groupedTimeline = {
    today: timelineItems.filter((item) => timelineGroup(item.createdAt) === 'today'),
    week: timelineItems.filter((item) => timelineGroup(item.createdAt) === 'week'),
    earlier: timelineItems.filter((item) => timelineGroup(item.createdAt) === 'earlier'),
  };

  const normalNotifications = myNotifications
    .filter((item) => item.read || item.type !== 'request')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const residentAnnouncements = state.announcements
    .filter((item) => isAnnouncementVisibleToRole(item, 'resident'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return {
    activeRequests,
    actionableRequests,
    inProgressRequests,
    completedRequests,
    readyForRelease,
    urgentAlerts,
    priorityState,
    primaryCta,
    timelineItems,
    groupedTimeline,
    normalNotifications,
    residentAnnouncements,
  };
}
