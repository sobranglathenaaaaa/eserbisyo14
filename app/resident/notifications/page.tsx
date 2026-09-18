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
import { ResidentSection, ResidentTableShell } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';

export default function ResidentNotificationsPage() {
  const { state, user, locale } = useAppState();
  const { notifications, urgentAlerts } = getResidentNotificationContext(state, user?.id, locale);
  const [summaryRequestId, setSummaryRequestId] = useState<string | null>(null);
  const pageCopy = getRolePageCopy('resident/notifications');
  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [notifications]
  );
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
      {urgentAlerts.length ? (
        <ResidentSection
          title={copyText(locale, 'Urgent Alerts', 'Mga Agarang Alert')}
          description={copyText(locale, 'Important notices that need immediate action.', 'Mahahalagang notice na kailangang aksyunan agad.')}
          tone="accent"
        >
          <div className="grid gap-2">
            {urgentAlerts.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--resident-radius-md)] border border-[color:var(--resident-status-alert)] bg-[color:#fff6f1] px-3 py-3"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm font-semibold text-[color:var(--resident-status-alert-text)]">{item.title}</p>
                <p className="mt-1 text-sm text-[color:var(--resident-status-alert-text)]/80">{item.body}</p>
              </div>
            ))}
          </div>
        </ResidentSection>
      ) : null}

      <ResidentSection
        title={copyText(locale, 'In-app Notifications', 'In-app na Mga Abiso')}
        description={copyText(locale, 'Mark items as read to keep your feed clean.', 'I-mark bilang read para malinis ang feed mo.')}
      >
        <ResidentTableShell
          title={copyText(locale, 'Notification Feed', 'Notification Feed')}
          description={copyText(locale, 'Keep track of request alerts and reminders.', 'Subaybayan ang request alerts at reminders.')}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--resident-ink-500)]">
              {copyText(locale, `${unreadCount} unread`, `${unreadCount} hindi pa nababasa`)}
            </p>
            <Button
              variant="secondary"
              type="button"
              onClick={() => void markAllNotificationsRead()}
              disabled={unreadCount === 0}
            >
              {copyText(locale, 'Mark all read', 'Mark lahat bilang nabasa')}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copyText(locale, 'Title', 'Pamagat')}</TableHead>
                <TableHead>{copyText(locale, 'Message', 'Mensahe')}</TableHead>
                <TableHead>{copyText(locale, 'Type', 'Uri')}</TableHead>
                <TableHead>{copyText(locale, 'Priority', 'Prayoridad')}</TableHead>
                <TableHead>{copyText(locale, 'Action', 'Aksyon')}</TableHead>
                <TableHead>{copyText(locale, 'Status', 'Katayuan')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNotifications.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.message}</TableCell>
                  <TableCell className="capitalize">{item.type}</TableCell>
                  <TableCell>
                    <StatusBadge tone={statusToneFromState(item.priority)}>{item.priority}</StatusBadge>
                  </TableCell>
                  <TableCell>
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
                  <TableCell>
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
        </ResidentTableShell>
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
