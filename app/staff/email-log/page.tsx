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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-[color:var(--portal-border-soft)] text-[color:var(--portal-ink-700)]">
                <th className="py-2 pr-2 align-middle text-center" style={{ width: '40%' }}>{locale === 'fil' ? 'Para' : 'To'}</th>
                <th className="py-2 pr-2 align-middle text-center" style={{ width: '44%' }}>{locale === 'fil' ? 'Subject' : 'Subject'}</th>
                <th className="py-2 pr-2 text-center align-middle" style={{ width: '16%' }}>{locale === 'fil' ? 'Petsa' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmailLogs.map((item) => (
                <tr key={item.id} className="border-b border-[color:var(--portal-border-soft)]">
                  <td className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] text-center">{item.toEmail}</td>
                  <td className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] font-medium text-center">{item.subject}</td>
                  <td className="py-2 pr-2 text-center align-middle">{formatDateTime(item.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-[color:var(--portal-ink-500)]">
            {state.emailLogs.length === 0
              ? ''
              : `Showing ${(emailPage - 1) * PAGE_SIZE + 1}–${Math.min(emailPage * PAGE_SIZE, state.emailLogs.length)} of ${state.emailLogs.length}`}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={emailPage <= 1} onClick={() => setEmailPage((p) => Math.max(1, p - 1))}>
              {locale === 'fil' ? 'Nakaraan' : 'Previous'}
            </Button>
            <div className="text-sm text-[color:var(--portal-ink-600)]">{`${emailPage} / ${emailTotalPages}`}</div>
            <Button type="button" variant="ghost" disabled={emailPage >= emailTotalPages} onClick={() => setEmailPage((p) => Math.min(emailTotalPages, p + 1))}>
              {locale === 'fil' ? 'Susunod' : 'Next'}
            </Button>
          </div>
        </div>
      </SectionCard>
    </PortalShell>
  );
}
