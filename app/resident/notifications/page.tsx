'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentRequestSummaryModal } from '@/features/resident/view/document-request-summary-modal';
import { ReservationSummaryModal } from '@/features/resident/view/reservation-summary-modal';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { getResidentNotificationContext } from '@/features/resident/model/notifications';
import { ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';

export default function ResidentNotificationsPage() {
  const { state, user, locale } = useAppState();
  const { notifications, urgentAlerts } = getResidentNotificationContext(state, user?.id, locale);
  const PAGE_SIZE = 10;
  const [summaryRequestId, setSummaryRequestId] = useState<string | null>(null);
  const [summaryReservationId, setSummaryReservationId] = useState<string | null>(null);
  const [openingNotificationId, setOpeningNotificationId] = useState<string | null>(null);
  const [notificationPage, setNotificationPage] = useState(1);
  const pageCopy = getRolePageCopy('resident/notifications');
  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [notifications]
  );
  const totalPages = Math.max(1, Math.ceil(sortedNotifications.length / PAGE_SIZE));
  const currentPage = Math.min(notificationPage, totalPages);
  const visibleNotifications = sortedNotifications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const unreadCount = sortedNotifications.filter((item) => !item.read).length;
  const summaryRequest = state.documentRequests.find((item) => item.id === summaryRequestId) ?? null;
  const summaryReservation = state.reservations.find((item) => item.id === summaryReservationId && item.residentId === user?.id) ?? null;

  const openNotificationAction = async (notificationId: string, requestId: string) => {
    setOpeningNotificationId(notificationId);
    try {
      await markNotificationRead(notificationId);
      setSummaryRequestId(requestId);
    } finally {
      setOpeningNotificationId(null);
    }
  };

  const openReservationAction = async (notificationId: string, reservationId: string) => {
    setOpeningNotificationId(notificationId);
    try {
      await markNotificationRead(notificationId);
      setSummaryReservationId(reservationId);
    } finally {
      setOpeningNotificationId(null);
    }
  };

  const markLinkedNotificationRead = (notificationId: string) => {
    void markNotificationRead(notificationId);
  };

  return (
    <ResidentShell title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          tone="resident"
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <ResidentSection
        title={copyText(locale, 'Notification Feed', 'Notification Feed')}
        description={copyText(locale, 'Keep track of request alerts and reminders.', 'Subaybayan ang request alerts at reminders.')}
        className="bg-white"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-[color:var(--resident-ink-500)]">
            {copyText(locale, `${unreadCount} unread`, `${unreadCount} hindi pa nababasa`)}
          </p>
          <Button
            variant="residentOutline"
            type="button"
            onClick={() => void markAllNotificationsRead()}
            disabled={unreadCount === 0}
          >
            {copyText(locale, 'Mark as all read', 'Mark lahat bilang nabasa')}
          </Button>
        </div>
        <div className="overflow-x-auto">
        <Table className="w-full min-w-[900px] table-fixed text-center">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[16%] text-center">{copyText(locale, 'Title', 'Pamagat')}</TableHead>
                <TableHead className="w-[44%] text-center">{copyText(locale, 'Message', 'Mensahe')}</TableHead>
                <TableHead className="w-[10%] text-center">{copyText(locale, 'Type', 'Uri')}</TableHead>
                <TableHead className="w-[12%] text-center">{copyText(locale, 'Status', 'Katayuan')}</TableHead>
                <TableHead className="w-[18%] text-center">{copyText(locale, 'Action', 'Aksyon')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleNotifications.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-medium">{item.title}</TableCell>
                  <TableCell className="text-center">{item.message}</TableCell>
                  <TableCell className="text-center capitalize">{item.type}</TableCell>
                  <TableCell className="text-center">
                    {item.read ? (
                      <StatusBadge tone={statusToneFromState('read')}>{copyText(locale, 'Read', 'Nabasa na')}</StatusBadge>
                    ) : (
                      <Button variant="ghost" type="button" onClick={() => void markNotificationRead(item.id)}>
                        {copyText(locale, 'Mark Read', 'Mark bilang Nabasa')}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.entityType === 'reservation' && item.entityId ? (
                      <Button
                        size="sm"
                        variant="residentOutline"
                        type="button"
                        className="min-w-[112px] justify-center"
                        disabled={openingNotificationId === item.id}
                        onClick={() => void openReservationAction(item.id, item.entityId!)}
                      >
                        {openingNotificationId === item.id
                          ? copyText(locale, 'Opening', 'Binubuksan')
                          : copyText(locale, 'Open', 'Buksan')}
                      </Button>
                    ) : item.actionHref?.includes('documentId=') ? (
                      <Button asChild size="sm" variant="residentOutline" className="min-w-[112px] justify-center">
                        <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                          {copyText(locale, 'Open', 'Buksan')}
                        </Link>
                      </Button>
                    ) : item.entityType === 'document_request' && item.entityId ? (
                      <Button
                        size="sm"
                        variant="residentOutline"
                        type="button"
                        className="min-w-[112px] justify-center"
                        disabled={openingNotificationId === item.id}
                        onClick={() => void openNotificationAction(item.id, item.entityId!)}
                      >
                        {openingNotificationId === item.id
                          ? copyText(locale, 'Opening', 'Binubuksan')
                          : copyText(locale, 'Open', 'Buksan')}
                      </Button>
                    ) : item.actionHref ? (
                      <Button asChild size="sm" variant="residentOutline" className="min-w-[112px] justify-center">
                        <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                          {copyText(locale, 'Open', 'Buksan')}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-[color:var(--resident-ink-500)]">{copyText(locale, 'No action', 'Walang aksyon')}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[color:var(--portal-ink-500)]">
            {sortedNotifications.length === 0
              ? ''
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, sortedNotifications.length)} of ${sortedNotifications.length}`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => setNotificationPage((page) => Math.max(1, page - 1))}
            >
              {locale === 'fil' ? 'Nakaraan' : 'Previous'}
            </Button>
            <div className="text-sm text-[color:var(--portal-ink-600)]">{currentPage} / {totalPages}</div>
            <Button
              type="button"
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => setNotificationPage((page) => Math.min(totalPages, page + 1))}
            >
              {locale === 'fil' ? 'Susunod' : 'Next'}
            </Button>
          </div>
        </div>
      </ResidentSection>

      <DocumentRequestSummaryModal
        open={Boolean(summaryRequest)}
        requestItem={summaryRequest}
        locale={locale}
        onClose={() => setSummaryRequestId(null)}
      />
      <ReservationSummaryModal
        open={Boolean(summaryReservation)}
        reservation={summaryReservation}
        locale={locale}
        onClose={() => setSummaryReservationId(null)}
      />
    </ResidentShell>
  );
}
