"use client";

import Link from 'next/link';
import PortalShell from '../../../components/portal-shell';
import { ClipboardCheck, Clock, UserCheck } from 'lucide-react';
import {
  DashboardSection,
  DashboardSummaryCard,
  EmptyState,
  StatusBadge,
} from '@/components/portal-ui';
import { Card } from '@/components/ui/card';
import { isAnnouncementVisibleToRole } from '@/lib/announcements/schedule';
import { Button } from '@/components/ui/button';
import { getStaffRequestCounts } from '@/features/staff/model/selectors';
import { getRolePageCopy } from '@/lib/content/role-pages';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import { formatDateTime } from '@/lib/formatters';
import { getAdminAuditLogPreview } from '@/features/admin/model/selectors';

export default function StaffDashboardPage() {
    const { state, locale, user } = useAppState();
    const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? 'Staff';
    const { approved, readyForPickup, completed } = getStaffRequestCounts(state);
    const pageCopy = getRolePageCopy('staff/dashboard');

    const auditPreview = getAdminAuditLogPreview(state, 5);

    const resolveTargetLabel = (tid?: string) => {
      if (!tid) return '-';
      const key = String(tid).toLowerCase();
      if (key === 'all') return locale === 'fil' ? 'Lahat' : 'For all';
      if (key === 'resident' || key === 'residents') return locale === 'fil' ? 'Mga Residente' : 'Residents';
      if (key === 'staff' || key === 'staffs') return locale === 'fil' ? 'Staff' : 'Staff';
      const found = (state.users ?? []).find((u) => u.id === tid || u.id === String(tid));
      return found ? found.fullName : tid;
    };

    const staffAnnouncements = state.announcements
      .filter((item) => isAnnouncementVisibleToRole(item, 'staff'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    return (
      <PortalShell
        role="staff"
        title={{ en: 'Welcome, Staff!', fil: 'Maligayang pagdating, Staff!' }}
        description={{
          en: "We’re glad you’re here — handle approvals and operations.",
          fil: 'Natutuwa kaming nandito ka — pangasiwaan ang mga pag-apruba at operasyon.',
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-5">
            <DashboardSection
              title={locale === 'fil' ? 'Buod' : 'Summary'}
              description={locale === 'fil' ? 'Mabilis na status ng kahilingan.' : 'Quick view of request status.'}
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <DashboardSummaryCard
                  label={locale === 'fil' ? 'Naka-approve' : 'Approved'}
                  value={approved}
                  icon={<UserCheck size={18} />}
                  hint={locale === 'fil' ? 'Handa nang gawin' : 'Ready to work on'}
                />
                <DashboardSummaryCard
                  label={locale === 'fil' ? 'Ready nang kunin' : 'Ready for Pickup'}
                  value={readyForPickup}
                  icon={<Clock size={18} />}
                  hint={locale === 'fil' ? 'Naghihintay na ma-claim' : 'Waiting to be claimed'}
                />
                <DashboardSummaryCard
                  label={locale === 'fil' ? 'Tapos na' : 'Done'}
                  value={completed}
                  icon={<ClipboardCheck size={18} />}
                  hint={locale === 'fil' ? 'Natapos' : 'Finished'}
                />
              </div>
            </DashboardSection>

            <DashboardSection
              title={locale === 'fil' ? 'Latest Activity' : 'Latest Activity'}
              description={locale === 'fil' ? 'Mga bagong kilos ng admin at staff.' : 'Recent admin and staff actions.'}
              actions={
                auditPreview.length > 0 ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/staff/notifications">{locale === 'fil' ? 'Tingnan Lahat' : 'See All'}</Link>
                  </Button>
                ) : undefined
              }
            >
              {!auditPreview.length ? (
                <EmptyState
                  title={locale === 'fil' ? 'Wala pang aktibidad' : 'No activity yet'}
                  description={locale === 'fil' ? 'Lalabas dito ang mga bagong aksyon.' : 'New actions will appear here.'}
                  actions={
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/staff/notifications">{locale === 'fil' ? 'Buksan ang Update' : 'Open Updates'}</Link>
                    </Button>
                  }
                />
              ) : (
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
                            <td className="py-2 pr-2 align-middle">
                              <div className="flex items-center justify-center">
                                <StatusBadge tone="neutral">{item.actorRole}</StatusBadge>
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-center align-middle">{formatDateTime(item.createdAt, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </DashboardSection>
          </div>

          <div className="grid gap-5">
            <DashboardSection
              title={locale === 'fil' ? 'Announcements' : 'Announcements'}
              description={locale === 'fil' ? 'Pinakabagong anunsyo.' : 'Latest announcements.'}
              density="compact"
            >
              {!staffAnnouncements.length ? (
                <EmptyState
                  title={locale === 'fil' ? 'Wala pang anunsyo' : 'No announcements yet'}
                  description={
                    locale === 'fil'
                      ? 'Lalabas dito ang bagong anunsyo mula sa admin o staff.'
                      : 'New announcements from admin or staff will appear here.'
                  }
                />
              ) : (
                <div className="grid gap-3">
                  {staffAnnouncements.map((announcement) => (
                    <Card
                      key={announcement.id}
                      className="rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] p-3"
                    >
                      <p className="text-sm font-semibold text-[color:var(--resident-ink-900)]">{announcement.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--resident-ink-500)]">{announcement.body}</p>
                      <p className="mt-2 text-[11px] text-[color:var(--resident-ink-500)]">
                        {formatDateTime(announcement.createdAt, locale)}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </DashboardSection>
          </div>
        </div>
      </PortalShell>
    );
  }
