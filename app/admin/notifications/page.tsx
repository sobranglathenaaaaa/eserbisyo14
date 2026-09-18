"use client";

import { PageGuide, SectionCard } from '@/components/portal-ui';
// using plain tables to match Users list layout
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/portal-ui';
import { formatDateTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import { useMemo, useState } from 'react';

export default function AdminNotificationsPage() {
  const { state, locale } = useAppState();
  const PAGE_SIZE = 10;
  const [notifPage, setNotifPage] = useState(1);
  const [emailPage, setEmailPage] = useState(1);

  // Group audit logs by action and targetId to show "one action = one log"
  // specifically for announcements and other multi-broadcast events.
  const displayEvents = useMemo(() => {
    const list = [...(state.auditLogs ?? [])].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
    return list;
  }, [state.auditLogs]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((displayEvents.length ?? 0) / PAGE_SIZE)), [displayEvents]);

  const visibleEvents = useMemo(() => {
    const start = (Math.max(1, notifPage) - 1) * PAGE_SIZE;
    return displayEvents.slice(start, start + PAGE_SIZE);
  }, [displayEvents, notifPage]);

  const pageCopy = getRolePageCopy('admin/notifications');

  const resolveTargetLabel = (tid?: string) => {
    if (!tid) return '-';
    const key = String(tid).toLowerCase();
    if (key === 'all') return locale === 'fil' ? 'Lahat' : 'For all';
    if (key === 'resident' || key === 'residents') return locale === 'fil' ? 'Mga Residente' : 'Residents';
    if (key === 'staff' || key === 'staffs') return locale === 'fil' ? 'Staff' : 'Staff';
    const found = (state.users ?? []).find((u) => u.id === tid || u.id === String(tid));
    return found ? found.fullName : tid;
  };
  return (
    <PortalShell role="admin" title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <SectionCard
        title={resolveRoleCopy(locale, pageCopy.title)}
        description={resolveRoleCopy(locale, pageCopy.description)}
      >
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
                <tr className="border-b border-[color:var(--portal-border-soft)] text-[color:var(--portal-ink-700)]">
                  <th className="py-2 pr-2 align-middle text-center" style={{ width: '30%' }}>{locale === 'fil' ? 'Aksyon' : 'Action'}</th>
                  <th className="py-2 pr-2 align-middle text-center" style={{ width: '40%' }}>{locale === 'fil' ? 'Target' : 'Target'}</th>
                  <th className="py-2 pr-2 align-middle text-center" style={{ width: '10%' }}>{locale === 'fil' ? 'Role' : 'Role'}</th>
                  <th className="py-2 pr-2 align-middle text-center" style={{ width: '20%' }}>{locale === 'fil' ? 'Petsa' : 'Date'}</th>
                </tr>
            </thead>
            <tbody>
              {visibleEvents.map((item) => (
                <tr key={item.id} className="border-b border-[color:var(--portal-border-soft)]">
                  <td className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] font-medium text-center">{item.action}</td>
                  <td className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] text-center">{resolveTargetLabel(item.targetId)}</td>
                  <td className="py-2 pr-2 text-center align-middle"><StatusBadge tone="neutral">{item.actorRole}</StatusBadge></td>
                  <td className="py-2 pr-2 text-center align-middle">{formatDateTime(item.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-[color:var(--portal-ink-500)]">
            {displayEvents.length === 0
              ? ''
              : `Showing ${(notifPage - 1) * PAGE_SIZE + 1}–${Math.min(notifPage * PAGE_SIZE, displayEvents.length)} of ${displayEvents.length}`}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={notifPage <= 1} onClick={() => setNotifPage((p) => Math.max(1, p - 1))}>
              {locale === 'fil' ? 'Nakaraan' : 'Previous'}
            </Button>
            <div className="text-sm text-[color:var(--portal-ink-600)]">{`${notifPage} / ${totalPages}`}</div>
            <Button type="button" variant="ghost" disabled={notifPage >= totalPages} onClick={() => setNotifPage((p) => Math.min(totalPages, p + 1))}>
              {locale === 'fil' ? 'Susunod' : 'Next'}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Email Log removed from System Updates per request */}
    </PortalShell>
  );
}

