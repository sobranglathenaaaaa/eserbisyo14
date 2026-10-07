'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, Star } from 'lucide-react';
import PortalShell from '../../../components/portal-shell';
import { DashboardSection, DashboardSummaryCard, EmptyState, StatusBadge } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/formatters';
import { getRolePageCopy } from '@/lib/content/role-pages';
import type { DashboardMetrics } from '@/lib/types/models';
import { getAdminAuditLogPreview } from '@/features/admin/model/selectors';
import { getDashboardMetrics } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

export default function AdminDashboardPage() {
  const { state, locale, session, user, loading } = useAppState();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const auditPreview = getAdminAuditLogPreview(state, 5);
  const pageCopy = getRolePageCopy('admin/dashboard');

  const resolveTargetLabel = (tid?: string) => {
    if (!tid) return '-';
    const key = String(tid).toLowerCase();
    if (key === 'all') return locale === 'fil' ? 'Lahat' : 'For all';
    if (key === 'resident' || key === 'residents') return locale === 'fil' ? 'Mga Residente' : 'Residents';
    if (key === 'staff' || key === 'staffs') return locale === 'fil' ? 'Staff' : 'Staff';
    const found = (state.users ?? []).find((u) => u.id === tid || u.id === String(tid));
    return found ? found.fullName : tid;
  };

  useEffect(() => {
    if (loading || !session || !user || user.role !== 'admin') return;

    void (async () => {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch {
        // Portal shell handles redirect/session recovery. Keep dashboard stable during auth transitions.
        setMetrics(null);
      }
    })();
  }, [loading, session, user]);

  const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? 'Admin';

  return (
    <PortalShell
      role="admin"
      title={{ en: 'Welcome, Admin!', fil: 'Maligayang pagdating, Admin!' }}
      description={{
        en: "We’re glad you’re here — manage services and requests.",
        fil: 'Natutuwa kaming nandito ka — pamahalaan ang mga serbisyo at kahilingan.',
      }}
    >
      <DashboardSection
        title={locale === 'fil' ? 'Buod' : 'Summary'}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardSummaryCard label="Total Requests" value={metrics?.totalRequests ?? 0} icon={<FileText size={18} />} />
          <DashboardSummaryCard label="Pending" value={metrics?.pendingRequests ?? 0} icon={<AlertTriangle size={18} />} />
          <DashboardSummaryCard label="Approved" value={metrics?.approvedRequests ?? 0} icon={<ClipboardCheck size={18} />} />
          <DashboardSummaryCard label="Completed" value={metrics?.completedRequests ?? 0} icon={<CheckCircle2 size={18} />} />
          <DashboardSummaryCard label="Reports Pending" value={metrics?.reportSummary.pending ?? 0} icon={<AlertTriangle size={18} />} />
          <DashboardSummaryCard label="Avg Feedback" value={metrics?.averageRating ?? 0} icon={<Star size={18} />} />
        </div>
      </DashboardSection>

      {/* Next Step, Operational Sections, and Admin Tools removed per request */}

      <DashboardSection
        title={locale === 'fil' ? 'Latest Activity' : 'Latest Activity'}
        description={locale === 'fil' ? 'Mga bagong kilos ng admin at staff.' : 'Recent admin and staff actions.'}
        actions={
          auditPreview.length > 0 ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/notifications">
                {locale === 'fil' ? 'Tingnan Lahat' : 'See All'}
              </Link>
            </Button>
          ) : undefined
        }
      >
        {!auditPreview.length ? (
          <EmptyState
            title={locale === 'fil' ? 'Wala pang aktibidad' : 'No activity yet'}
            description={locale === 'fil'
              ? 'Lalabas dito ang mga bagong aksyon.'
              : 'New actions will appear here.'}
            actions={
              <Button asChild size="sm" variant="secondary">
                <Link href="/admin/notifications">
                  {locale === 'fil' ? 'Buksan ang Update' : 'Open Updates'}
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="grid gap-2.5 md:hidden mt-3">
              {auditPreview.map((item) => (
                <div key={`m-act-${item.id}`} className="rounded-xl border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[color:var(--portal-ink-900)] truncate">{item.action}</span>
                    <StatusBadge tone="neutral">{item.actorRole}</StatusBadge>
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--portal-ink-700)]">
                    <span className="text-[color:var(--portal-ink-500)]">{locale === 'fil' ? 'Target: ' : 'Target: '}</span>
                    {resolveTargetLabel(item.targetId)}
                  </div>
                  <div className="mt-1 text-[11px] text-[color:var(--portal-ink-500)]">
                    {formatDateTime(item.createdAt, locale)}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block">
              <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--portal-border-soft)]">
                <table className="w-full text-sm table-fixed min-w-[560px]">
                  <thead>
                    <tr className="border-b border-[color:var(--portal-border-soft)] bg-emerald-50/40 text-[color:var(--portal-ink-700)]">
                      <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '30%' }}>{locale === 'fil' ? 'Aksyon' : 'Action'}</th>
                      <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '40%' }}>{locale === 'fil' ? 'Target' : 'Target'}</th>
                      <th className="py-2.5 px-2 align-middle text-center font-bold" style={{ width: '12%' }}>{locale === 'fil' ? 'Role' : 'Role'}</th>
                      <th className="py-2.5 px-3 align-middle text-right font-bold" style={{ width: '18%' }}>{locale === 'fil' ? 'Petsa' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditPreview.map((item) => (
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
            </div>
          </>
        )}
      </DashboardSection>
    </PortalShell>
  );
}
