'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentRequestSummaryModal } from '@/features/resident/view/document-request-summary-modal';
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

  const openNotificationAction = async (notificationId: string, requestId: string) => {
    await markNotificationRead(notificationId);
    setSummaryRequestId(requestId);
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
        <Table className="text-center">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">{copyText(locale, 'Title', 'Pamagat')}</TableHead>
                <TableHead className="text-center">{copyText(locale, 'Message', 'Mensahe')}</TableHead>
                <TableHead className="text-center">{copyText(locale, 'Type', 'Uri')}</TableHead>
                <TableHead className="text-center">{copyText(locale, 'Priority', 'Prayoridad')}</TableHead>
                <TableHead className="text-center">{copyText(locale, 'Action', 'Aksyon')}</TableHead>
                <TableHead className="text-center">{copyText(locale, 'Status', 'Katayuan')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleNotifications.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-medium">{item.title}</TableCell>
                  <TableCell className="text-center">{item.message}</TableCell>
                  <TableCell className="text-center capitalize">{item.type}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge tone={statusToneFromState(item.priority)}>{item.priority}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.actionHref?.includes('documentId=') ? (
                      <Button asChild size="sm" variant="residentOutline">
                        <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                          {copyText(locale, 'Open', 'Buksan')}
                        </Link>
                      </Button>
                    ) : item.entityType === 'document_request' && item.entityId ? (
                      <Button
                        size="sm"
                        variant="residentOutline"
                        type="button"
                        onClick={() => void openNotificationAction(item.id, item.entityId!)}
                      >
                        {copyText(locale, 'Open', 'Buksan')}
                      </Button>
                    ) : item.actionHref ? (
                      <Button asChild size="sm" variant="residentOutline">
                        <Link href={item.actionHref} onClick={() => markLinkedNotificationRead(item.id)}>
                          {copyText(locale, 'Open', 'Buksan')}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-[color:var(--resident-ink-500)]">{copyText(locale, 'No action', 'Walang aksyon')}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.read ? (
                      <StatusBadge tone={statusToneFromState('read')}>{copyText(locale, 'Read', 'Nabasa na')}</StatusBadge>
                    ) : (
                      <Button variant="ghost" type="button" onClick={() => void markNotificationRead(item.id)}>
                        {copyText(locale, 'Mark Read', 'Mark bilang Nabasa')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
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
    </ResidentShell>
  );
}
