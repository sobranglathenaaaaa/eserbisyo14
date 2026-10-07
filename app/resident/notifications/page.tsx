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
        {/* Mobile View: Clean Card List */}
        <div className="grid gap-3 md:hidden">
          {visibleNotifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-[color:var(--resident-ink-500)]">
              {copyText(locale, 'No notifications found.', 'Walang nahanap na mga abiso.')}
            </div>
          ) : (
            visibleNotifications.map((item) => (
              <div
                key={`mobile-${item.id}`}
                className={cn(
                  'rounded-xl border p-3.5 transition-shadow',
                  item.read
                    ? 'border-[color:var(--portal-border-soft)] bg-white'
                    : 'border-emerald-300/80 bg-emerald-50/40 shadow-sm'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider rounded-md bg-emerald-100/70 px-1.5 py-0.5 text-emerald-800">
                        {item.type}
                      </span>
                      {item.read ? (
                        <StatusBadge tone={statusToneFromState('read')}>{copyText(locale, 'Read', 'Nabasa na')}</StatusBadge>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {copyText(locale, 'New', 'Bago')}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-[color:var(--resident-ink-900)] leading-snug">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <p className="mt-2 text-xs sm:text-sm text-[color:var(--resident-ink-700)] leading-relaxed">
                  {item.message}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[color:var(--portal-border-soft)] pt-2.5">
                  {!item.read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold"
                      onClick={() => void markNotificationRead(item.id)}
                    >
                      {copyText(locale, 'Mark as read', 'Mark bilang nabasa')}
                    </Button>
                  ) : <span />}

                  <div>
                    {item.entityType === 'reservation' && item.entityId ? (
                      <Button
                        size="sm"
                        variant="residentOutline"
                        type="button"
                        className="min-w-[90px] text-xs font-semibold justify-center"
                        disabled={openingNotificationId === item.id}
                        onClick={() => void openReservationAction(item.id, item.entityId!)}
                      >
                        {openingNotificationId === item.id
                          ? copyText(locale, 'Opening...', 'Binubuksan...')
                          : copyText(locale, 'Open', 'Buksan')}
                      </Button>
                    ) : item.actionHref?.includes('documentId=') ? (
                      <Button asChild size="sm" variant="residentOutline" className="min-w-[90px] text-xs font-semibold justify-center">
                        <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                          {copyText(locale, 'Open', 'Buksan')}
                        </Link>
                      </Button>
                    ) : item.entityType === 'document_request' && item.entityId ? (
                      <Button
                        size="sm"
                        variant="residentOutline"
                        type="button"
                        className="min-w-[90px] text-xs font-semibold justify-center"
                        disabled={openingNotificationId === item.id}
                        onClick={() => void openNotificationAction(item.id, item.entityId!)}
                      >
                        {openingNotificationId === item.id
                          ? copyText(locale, 'Opening...', 'Binubuksan...')
                          : copyText(locale, 'Open', 'Buksan')}
                      </Button>
                    ) : item.actionHref ? (
                      <Button asChild size="sm" variant="residentOutline" className="min-w-[90px] text-xs font-semibold justify-center">
                        <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                          {copyText(locale, 'Open', 'Buksan')}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-[color:var(--portal-border-soft)]">
          <Table className="w-full min-w-[760px] table-fixed text-center">
            <TableHeader>
              <TableRow className="bg-emerald-50/50">
                <TableHead className="w-[20%] text-center font-bold">{copyText(locale, 'Title', 'Pamagat')}</TableHead>
                <TableHead className="w-[42%] text-center font-bold">{copyText(locale, 'Message', 'Mensahe')}</TableHead>
                <TableHead className="w-[12%] text-center font-bold">{copyText(locale, 'Type', 'Uri')}</TableHead>
                <TableHead className="w-[12%] text-center font-bold">{copyText(locale, 'Status', 'Katayuan')}</TableHead>
                <TableHead className="w-[14%] text-center font-bold">{copyText(locale, 'Action', 'Aksyon')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-[color:var(--resident-ink-500)]">
                    {copyText(locale, 'No notifications found.', 'Walang nahanap na mga abiso.')}
                  </TableCell>
                </TableRow>
              ) : (
                visibleNotifications.map((item) => (
                  <TableRow key={item.id} className={cn(!item.read && 'bg-emerald-50/20')}>
                    <TableCell className="text-center font-semibold text-[color:var(--resident-ink-900)]">{item.title}</TableCell>
                    <TableCell className="text-center text-sm text-[color:var(--resident-ink-700)]">{item.message}</TableCell>
                    <TableCell className="text-center capitalize">
                      <span className="inline-block rounded-md bg-emerald-100/70 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.read ? (
                        <StatusBadge tone={statusToneFromState('read')}>{copyText(locale, 'Read', 'Nabasa na')}</StatusBadge>
                      ) : (
                        <Button variant="ghost" size="sm" type="button" onClick={() => void markNotificationRead(item.id)} className="text-xs font-semibold text-emerald-800">
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
                          className="min-w-[96px] justify-center text-xs font-semibold"
                          disabled={openingNotificationId === item.id}
                          onClick={() => void openReservationAction(item.id, item.entityId!)}
                        >
                          {openingNotificationId === item.id
                            ? copyText(locale, 'Opening', 'Binubuksan')
                            : copyText(locale, 'Open', 'Buksan')}
                        </Button>
                      ) : item.actionHref?.includes('documentId=') ? (
                        <Button asChild size="sm" variant="residentOutline" className="min-w-[96px] justify-center text-xs font-semibold">
                          <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                            {copyText(locale, 'Open', 'Buksan')}
                          </Link>
                        </Button>
                      ) : item.entityType === 'document_request' && item.entityId ? (
                        <Button
                          size="sm"
                          variant="residentOutline"
                          type="button"
                          className="min-w-[96px] justify-center text-xs font-semibold"
                          disabled={openingNotificationId === item.id}
                          onClick={() => void openNotificationAction(item.id, item.entityId!)}
                        >
                          {openingNotificationId === item.id
                            ? copyText(locale, 'Opening', 'Binubuksan')
                            : copyText(locale, 'Open', 'Buksan')}
                        </Button>
                      ) : item.actionHref ? (
                        <Button asChild size="sm" variant="residentOutline" className="min-w-[96px] justify-center text-xs font-semibold">
                          <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                            {copyText(locale, 'Open', 'Buksan')}
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-[color:var(--resident-ink-500)]">{copyText(locale, 'No action', 'Walang aksyon')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Section */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[color:var(--portal-border-soft)] pt-3">
          <div className="text-xs sm:text-sm text-[color:var(--portal-ink-500)] text-center sm:text-left">
            {sortedNotifications.length === 0
              ? ''
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, sortedNotifications.length)} of ${sortedNotifications.length}`}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setNotificationPage((page) => Math.max(1, page - 1))}
              className="text-xs sm:text-sm px-3"
            >
              {locale === 'fil' ? 'Nakaraan' : 'Previous'}
            </Button>
            <div className="text-xs sm:text-sm font-semibold px-2 text-[color:var(--portal-ink-700)]">
              {currentPage} / {totalPages}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setNotificationPage((page) => Math.min(totalPages, page + 1))}
              className="text-xs sm:text-sm px-3"
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
