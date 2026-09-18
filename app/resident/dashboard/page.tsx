'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertTriangle, Bell, CheckCircle2, FileText, Siren } from 'lucide-react';
import { StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, getReportStatusLabel, getRequestStatusLabel, relativeTime } from '@/lib/formatters';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { getResidentDashboardData } from '@/features/resident/model/dashboard';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { ResidentEmpty, ResidentMetricCard, ResidentSection } from '@/features/resident/view/resident-primitives';
import { getRolePageCopy } from '@/lib/content/role-pages';

export default function ResidentDashboardPage() {
  const { state, user, locale } = useAppState();
  const pageCopy = getRolePageCopy('resident/dashboard');
  const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? 'Resident';
  const dashboard = useMemo(() => getResidentDashboardData(state, user?.id, locale), [state, user?.id, locale]);
  const visibleUrgentAlert = dashboard.urgentAlerts[0];

  return (
    <ResidentShell
      title={{ en: `Welcome, ${firstName}!`, fil: `Maligayang pagdating, ${firstName}!` }}
      description={{ en: "We’re glad you’re here — explore services and requests.", fil: 'Masaya kaming makasama ka — galugarin ang mga serbisyo at kahilingan.' }}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <ResidentSection
            title={copyText(locale, 'Today overview', 'Overview ngayon')}
            description={copyText(locale, 'What needs your attention now.', 'Ano ang kailangang tutukan ngayon.')}
            tone="accent"
            density="compact"
          >
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <ResidentMetricCard
                  label={copyText(locale, 'Needs Action', 'Kailangang Aksyonan')}
                  value={dashboard.actionableRequests.length}
                  detail={copyText(locale, 'Fix now', 'Ayusin ngayon')}
                  compact
                />
                <ResidentMetricCard
                  label={copyText(locale, 'In Progress', 'Pinoproseso')}
                  value={dashboard.inProgressRequests.length}
                  detail={copyText(locale, 'Track requests', 'Subaybayan ang kahilingan')}
                  compact
                />
                <ResidentMetricCard
                  label={copyText(locale, 'Ready for Release', 'Handa nang I-release')}
                  value={dashboard.readyForRelease.length}
                  detail={copyText(locale, 'Ready to claim', 'Handa nang kunin')}
                  compact
                  tone="accent"
                />
              </div>

              <div
                className={
                  dashboard.priorityState === 'urgent'
                    ? 'flex flex-wrap items-center justify-between gap-3 rounded-[var(--resident-radius-md)] border border-[color:#e6c29a] bg-[linear-gradient(140deg,#fff2df_0%,#ffe4c8_100%)] px-4 py-3 text-[color:#6b3d15]'
                    : 'flex flex-wrap items-center justify-between gap-3 rounded-[var(--resident-radius-md)] border border-[color:rgba(29,95,71,0.14)] bg-[linear-gradient(140deg,#f8fcfa_0%,#edf5f0_100%)] px-4 py-3 text-[color:var(--resident-ink-900)]'
                }
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      dashboard.priorityState === 'urgent'
                        ? 'grid h-10 w-10 place-items-center rounded-full bg-[color:#f6d9b0] text-[color:#8a4b2b]'
                        : 'grid h-10 w-10 place-items-center rounded-full bg-[color:var(--resident-accent-soft)] text-[color:var(--resident-accent-strong)]'
                    }
                  >
                    {dashboard.priorityState === 'urgent' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {visibleUrgentAlert?.title ?? copyText(locale, 'All clear right now', 'Maayos ang lahat ngayon')}
                    </p>
                    <p className="mt-1 text-xs leading-5">
                      {visibleUrgentAlert?.body ??
                        copyText(
                          locale,
                          'No urgent requests are waiting for your response.',
                          'Wala pang agarang kahilingan na naghihintay ng tugon mo.'
                        )}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant={dashboard.actionableRequests.length > 0 ? 'residentOutlineOrange' : 'residentOutlineGray'}
                  className="h-9 px-3 text-xs"
                >
                  <Link href={dashboard.primaryCta.href}>{dashboard.primaryCta.label}</Link>
                </Button>
              </div>
            </div>
          </ResidentSection>

          <ResidentSection
            title={copyText(locale, 'Recent activity', 'Pinakabagong aktibidad')}
            description={copyText(
              locale,
              'Your latest request, report, and notification updates.',
              'Pinakabagong update sa kahilingan, ulat, at abiso mo.'
            )}
            actions={
              <Button asChild variant="residentOutlineGray" className="h-8 px-3 text-xs">
                <Link href="/resident/request-history">{copyText(locale, 'View all activity', 'Tingnan lahat ng aktibidad')}</Link>
              </Button>
            }
            tone="muted"
            density="compact"
          >
            {!dashboard.timelineItems.length ? (
              <ResidentEmpty
                title={copyText(locale, 'No recent activity', 'Wala pang bagong aktibidad')}
                description={copyText(
                  locale,
                  'Your updates will show here once records change.',
                  'Lalabas dito ang updates kapag may pagbabago sa records mo.'
                )}
                actions={
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/resident/document-requests">{copyText(locale, 'Open Requests', 'Buksan ang Kahilingan')}</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3">
                {dashboard.timelineItems.map((item) => (
                  <Card
                    key={item.id}
                    className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] p-3"
                  >
                    <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-[color:var(--resident-surface-3)] text-[color:var(--resident-ink-500)]">
                      {item.type === 'request' ? <FileText size={13} /> : null}
                      {item.type === 'report' ? <Siren size={13} /> : null}
                      {item.type === 'notification' ? <Bell size={13} /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[color:var(--resident-ink-900)]">{item.title}</p>
                        <StatusBadge tone={statusToneFromState(item.status)}>
                          {item.type === 'request'
                            ? getRequestStatusLabel(item.status, locale)
                            : item.type === 'report'
                              ? getReportStatusLabel(item.status, locale)
                              : item.status === 'read'
                                ? copyText(locale, 'Read', 'Nabasa')
                                : copyText(locale, 'New', 'Bago')}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--resident-ink-500)]">{item.subtitle}</p>
                      <p className="mt-1 text-xs text-[color:var(--resident-ink-500)]">
                        {relativeTime(item.createdAt, locale)} · {formatDateTime(item.createdAt, locale)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ResidentSection>
        </div>

        <div className="grid gap-5">
          <ResidentSection
            title={copyText(locale, 'Announcements', 'Mga Anunsyo')}
            description={copyText(
              locale,
              'Latest barangay announcements.',
              'Pinakabagong anunsyo ng barangay.'
            )}
            density="compact"
          >
            {!dashboard.residentAnnouncements.length ? (
              <ResidentEmpty
                title={copyText(locale, 'No announcements yet', 'Wala pang anunsyo')}
                description={copyText(
                  locale,
                  'New announcements from admin or staff will appear here.',
                  'Lalabas dito ang bagong anunsyo mula sa admin o staff.'
                )}
              />
            ) : (
              <div className="grid gap-3">
                {dashboard.residentAnnouncements.map((announcement) => (
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
          </ResidentSection>
        </div>
      </div>
    </ResidentShell>
  );
}
