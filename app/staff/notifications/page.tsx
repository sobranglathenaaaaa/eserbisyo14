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

export default function StaffNotificationsPage() {
  const { state, locale } = useAppState();
  const PAGE_SIZE = 10;
  const [notifPage, setNotifPage] = useState(1);

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

  const pageCopy = getRolePageCopy('staff/notifications');

  const notifications = useMemo(
    () => [...(state.notifications ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.notifications]
  );

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
    <PortalShell role="staff" title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <SectionCard
        title={locale === 'fil' ? 'Notifications' : 'Notifications'}
        description={locale === 'fil' ? 'Mga direktang alert para sa iyong staff account.' : 'Direct alerts for your staff account.'}
      >
        <div className="grid gap-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-[color:var(--portal-ink-600)]">
              {locale === 'fil' ? 'Wala pang notifications.' : 'No notifications yet.'}
            </p>
          ) : (
            notifications.slice(0, PAGE_SIZE).map((item) => (
              <div key={item.id} className="rounded-[var(--portal-radius-sm)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-[color:var(--portal-ink-900)]">{item.title}</p>
                  <StatusBadge tone={item.read ? 'neutral' : 'info'}>
                    {item.read ? (locale === 'fil' ? 'Nabasa' : 'Read') : (locale === 'fil' ? 'Bago' : 'New')}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">{item.message}</p>
                <p className="mt-1 text-xs text-[color:var(--portal-ink-500)]">{formatDateTime(item.createdAt, locale)}</p>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={locale === 'fil' ? 'System Updates' : 'System Updates'}
        description={locale === 'fil' ? 'Mga update at mga importanteng pangyayari.' : 'System updates and important events.'}
      >
        {/* Mobile View: Cards */}
        <div className="block md:hidden space-y-2.5">
          {visibleEvents.length === 0 ? (
            <div className="py-6 text-center text-sm text-[color:var(--portal-ink-500)]">
              {locale === 'fil' ? 'Walang nahanap na mga tala.' : 'No system updates found.'}
            </div>
          ) : (
            visibleEvents.map((item) => (
              <div key={`sm-${item.id}`} className="rounded-xl border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-[color:var(--portal-ink-900)] truncate">{item.action}</span>
                  <StatusBadge tone="neutral">{item.actorRole}</StatusBadge>
                </div>
                <div className="mt-1.5 text-xs text-[color:var(--portal-ink-700)]">
                  <span className="font-medium text-[color:var(--portal-ink-500)]">{locale === 'fil' ? 'Target: ' : 'Target: '}</span>
                  {resolveTargetLabel(item.targetId)}
                </div>
                <div className="mt-1 text-[11px] text-[color:var(--portal-ink-500)]">
                  {formatDateTime(item.createdAt, locale)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="mt-3 hidden md:block overflow-x-auto rounded-xl border border-[color:var(--portal-border-soft)]">
          <table className="w-full text-sm table-fixed min-w-[560px]">
            <thead>
                <tr className="border-b border-[color:var(--portal-border-soft)] bg-emerald-50/40 text-[color:var(--portal-ink-700)]">
                  <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '32%' }}>{locale === 'fil' ? 'Aksyon' : 'Action'}</th>
                  <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '38%' }}>{locale === 'fil' ? 'Target' : 'Target'}</th>
                  <th className="py-2.5 px-2 align-middle text-center font-bold" style={{ width: '12%' }}>{locale === 'fil' ? 'Role' : 'Role'}</th>
                  <th className="py-2.5 px-3 align-middle text-right font-bold" style={{ width: '18%' }}>{locale === 'fil' ? 'Petsa' : 'Date'}</th>
                </tr>
            </thead>
            <tbody>
              {visibleEvents.map((item) => (
                <tr key={item.id} className="border-b border-[color:var(--portal-border-soft)] hover:bg-emerald-50/20">
                  <td className="py-2.5 px-3 font-semibold text-[color:var(--portal-ink-900)] text-left truncate">{item.action}</td>
                  <td className="py-2.5 px-3 text-[color:var(--portal-ink-700)] text-left truncate">{resolveTargetLabel(item.targetId)}</td>
                  <td className="py-2.5 px-2 text-center align-middle"><StatusBadge tone="neutral">{item.actorRole}</StatusBadge></td>
                  <td className="py-2.5 px-3 text-right text-xs text-[color:var(--portal-ink-600)] align-middle">{formatDateTime(item.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[color:var(--portal-border-soft)] pt-3">
          <div className="text-xs sm:text-sm text-[color:var(--portal-ink-500)] text-center sm:text-left">
            {displayEvents.length === 0
              ? ''
              : `Showing ${(notifPage - 1) * PAGE_SIZE + 1}–${Math.min(notifPage * PAGE_SIZE, displayEvents.length)} of ${displayEvents.length}`}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={notifPage <= 1} onClick={() => setNotifPage((p) => Math.max(1, p - 1))} className="text-xs sm:text-sm">
              {locale === 'fil' ? 'Nakaraan' : 'Previous'}
            </Button>
            <div className="text-xs sm:text-sm font-semibold px-2 text-[color:var(--portal-ink-600)]">{`${notifPage} / ${totalPages}`}</div>
            <Button type="button" variant="ghost" size="sm" disabled={notifPage >= totalPages} onClick={() => setNotifPage((p) => Math.min(totalPages, p + 1))} className="text-xs sm:text-sm">
              {locale === 'fil' ? 'Susunod' : 'Next'}
            </Button>
          </div>
        </div>
      </SectionCard>
    </PortalShell>
  );
}

