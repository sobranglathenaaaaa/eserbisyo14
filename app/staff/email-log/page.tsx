"use client";

import { SectionCard } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/formatters';
import PortalShell from '@/components/portal-shell';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { useMemo, useState } from 'react';

export default function StaffEmailLogPage() {
  const { state, locale } = useAppState();
  const PAGE_SIZE = 10;
  const [emailPage, setEmailPage] = useState(1);
  const emailTotalPages = useMemo(() => Math.max(1, Math.ceil((state.emailLogs?.length ?? 0) / PAGE_SIZE)), [state.emailLogs]);

  const visibleEmailLogs = useMemo(() => {
    const arr = state.emailLogs ?? [];
    const start = (Math.max(1, emailPage) - 1) * PAGE_SIZE;
    return arr.slice(start, start + PAGE_SIZE);
  }, [state.emailLogs, emailPage]);

  return (
    <PortalShell role="staff" title={locale === 'fil' ? 'Log ng mga email' : 'Email Logs'} description={locale === 'fil' ? 'Log ng mga email' : 'Outgoing email log'} showHero={false}>
      <SectionCard
        title={locale === 'fil' ? 'Log ng mga email' : 'Email Logs'}
        description={
          locale === 'fil'
            ? 'Talaan ng mga ipinadalang email mula sa iyong workspace.'
            : 'A log of outgoing emails sent from the workspace.'
        }
      >
        {/* Mobile View: Cards */}
        <div className="block md:hidden space-y-2.5 mt-3">
          {visibleEmailLogs.length === 0 ? (
            <div className="py-6 text-center text-sm text-[color:var(--portal-ink-500)]">
              {locale === 'fil' ? 'Walang email logs.' : 'No email logs found.'}
            </div>
          ) : (
            visibleEmailLogs.map((item) => (
              <div key={`m-email-${item.id}`} className="rounded-xl border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[color:var(--portal-ink-900)] leading-snug">{item.subject}</h4>
                    <p className="mt-1 text-xs text-[color:var(--portal-ink-600)] truncate">
                      <span className="text-[color:var(--portal-ink-400)]">{locale === 'fil' ? 'Para kay: ' : 'To: '}</span>
                      {item.toEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-2 border-t border-[color:var(--portal-border-soft)] pt-2 text-[11px] text-[color:var(--portal-ink-500)]">
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
                <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '38%' }}>{locale === 'fil' ? 'Para' : 'To'}</th>
                <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '42%' }}>{locale === 'fil' ? 'Subject' : 'Subject'}</th>
                <th className="py-2.5 px-3 text-right align-middle font-bold" style={{ width: '20%' }}>{locale === 'fil' ? 'Petsa' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmailLogs.map((item) => (
                <tr key={item.id} className="border-b border-[color:var(--portal-border-soft)] hover:bg-emerald-50/20">
                  <td className="py-2.5 px-3 text-left text-xs truncate text-[color:var(--portal-ink-700)]">{item.toEmail}</td>
                  <td className="py-2.5 px-3 text-left font-semibold truncate text-[color:var(--portal-ink-900)]">{item.subject}</td>
                  <td className="py-2.5 px-3 text-right text-xs text-[color:var(--portal-ink-600)] align-middle">{formatDateTime(item.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[color:var(--portal-border-soft)] pt-3">
          <div className="text-xs sm:text-sm text-[color:var(--portal-ink-500)] text-center sm:text-left">
            {state.emailLogs.length === 0
              ? ''
              : `Showing ${(emailPage - 1) * PAGE_SIZE + 1}–${Math.min(emailPage * PAGE_SIZE, state.emailLogs.length)} of ${state.emailLogs.length}`}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={emailPage <= 1} onClick={() => setEmailPage((p) => Math.max(1, p - 1))} className="text-xs sm:text-sm">
              {locale === 'fil' ? 'Nakaraan' : 'Previous'}
            </Button>
            <div className="text-xs sm:text-sm font-semibold px-2 text-[color:var(--portal-ink-600)]">{`${emailPage} / ${emailTotalPages}`}</div>
            <Button type="button" variant="ghost" size="sm" disabled={emailPage >= emailTotalPages} onClick={() => setEmailPage((p) => Math.min(emailTotalPages, p + 1))} className="text-xs sm:text-sm">
              {locale === 'fil' ? 'Susunod' : 'Next'}
            </Button>
          </div>
        </div>
      </SectionCard>
    </PortalShell>
  );
}
