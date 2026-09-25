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
            <div className="hidden md:block">
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
                    {auditPreview.map((item) => (
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
            </div>
            {/* Mobile activity cards removed per request */}
          </>
        )}
      </DashboardSection>
    </PortalShell>
  );
}
