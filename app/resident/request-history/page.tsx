'use client';

import { Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { copyText } from '@/features/resident/model/copy';
import { getResidentNotifications, getResidentReports, getResidentRequests } from '@/features/resident/model/selectors';
import { ResidentEmpty, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel, getRequestStatusLabel } from '@/lib/formatters';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import type { ReportStatus, RequestStatus } from '@/lib/types/models';

type HistoryCategory = 'all' | 'requests' | 'notifications' | 'report-progress';

type HistoryFeedItem =
  | {
      kind: 'requests';
      category: Exclude<HistoryCategory, 'all'>;
      id: string;
      sortAt: string;
      heading: string;
      summary: string;
      status: RequestStatus;
    }
  | {
      kind: 'notifications';
      category: Exclude<HistoryCategory, 'all'>;
      id: string;
      sortAt: string;
      heading: string;
      message: string;
    }
  | {
      kind: 'report-progress';
      category: Exclude<HistoryCategory, 'all'>;
      id: string;
      sortAt: string;
      heading: string;
      caseNumber: string;
      submittedAt: string;
      incidentMeta: string;
      status: ReportStatus;
    };

const CATEGORY_ORDER: HistoryCategory[] = ['all', 'requests', 'notifications', 'report-progress'];

function toEpoch(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareByDateDesc<T>(a: T, b: T, dateSelector: (item: T) => string, idSelector: (item: T) => string) {
  const dateDelta = toEpoch(dateSelector(b)) - toEpoch(dateSelector(a));
  if (dateDelta !== 0) return dateDelta;
  return idSelector(b).localeCompare(idSelector(a));
}

function resolveCategoryLabel(locale: 'en' | 'fil', category: HistoryCategory) {
  if (category === 'all') return copyText(locale, 'All History', 'Lahat ng History');
  if (category === 'requests') return copyText(locale, 'Requests', 'Mga Kahilingan');
  if (category === 'notifications') return copyText(locale, 'Notifications', 'Mga Abiso');
  return copyText(locale, 'Report Progress', 'Pag-usad ng Ulat');
}

function resolveActiveCategory(rawCategory: string | null): HistoryCategory {
  if (!rawCategory) return 'all';
  return CATEGORY_ORDER.includes(rawCategory as HistoryCategory) ? (rawCategory as HistoryCategory) : 'all';
}

function ResidentRequestHistoryPageContent() {
  const { state, user, locale } = useAppState();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageCopy = getRolePageCopy('resident/request-history') ?? {
    title: { en: 'Service History', fil: 'Kasaysayan ng Serbisyo' },
    description: {
      en: 'Review your requests, notifications, and report progress.',
      fil: 'Suriin ang requests, notifications, at report progress mo.',
    },
  };

  const activeCategory = resolveActiveCategory(searchParams.get('category'));
  const requests = useMemo(() => getResidentRequests(state, user?.id), [state, user?.id]);
  const reports = useMemo(() => getResidentReports(state, user?.id), [state, user?.id]);
  const notifications = useMemo(() => getResidentNotifications(state, user?.id), [state, user?.id]);
  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => compareByDateDesc(a, b, (item) => item.updatedAt, (item) => item.id)),
    [requests]
  );

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => compareByDateDesc(a, b, (item) => item.updatedAt, (item) => item.id)),
    [reports]
  );

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => compareByDateDesc(a, b, (item) => item.createdAt, (item) => item.id)),
    [notifications]
  );

  const allHistoryItems = useMemo(() => {
    const requestItems: HistoryFeedItem[] = sortedRequests.map((item) => ({
      kind: 'requests',
      category: 'requests',
      id: item.id,
      sortAt: item.updatedAt,
      heading: `${item.referenceNumber} - ${item.typeLabel}`,
      summary: item.purpose,
      status: item.status,
    }));

    const notificationItems: HistoryFeedItem[] = sortedNotifications.map((item) => ({
      kind: 'notifications',
      category: 'notifications',
      id: item.id,
      sortAt: item.createdAt,
      heading: item.title,
      message: item.message,
    }));

    const reportItems: HistoryFeedItem[] = sortedReports.map((report) => ({
      kind: 'report-progress',
      category: 'report-progress',
      id: report.id,
      sortAt: report.updatedAt,
      heading: report.title,
      caseNumber: formatIncidentCaseNumber(report.id, report.createdAt),
      submittedAt: report.createdAt,
      incidentMeta: `${report.location} - ${report.dateOfIncident}`,
      status: report.status,
    }));

    return [...requestItems, ...notificationItems, ...reportItems].sort((a, b) => {
      const dateDelta = toEpoch(b.sortAt) - toEpoch(a.sortAt);
      if (dateDelta !== 0) return dateDelta;
      return b.id.localeCompare(a.id);
    });
  }, [sortedNotifications, sortedReports, sortedRequests]);

  const categoryItems = useMemo(() => {
    if (activeCategory === 'all') return allHistoryItems;
    return allHistoryItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, allHistoryItems]);

  const categories = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => {
        const count =
          category === 'all'
            ? allHistoryItems.length
            : category === 'requests'
              ? sortedRequests.length
              : category === 'notifications'
                  ? sortedNotifications.length
                  : sortedReports.length;

        return {
          id: category,
          label: resolveCategoryLabel(locale, category),
          count,
        };
      }),
    [allHistoryItems.length, locale, sortedNotifications.length, sortedReports.length, sortedRequests.length]
  );

  const activeCategoryLabel = resolveCategoryLabel(locale, activeCategory);

  const setCategory = (nextCategory: HistoryCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory === 'all') {
      params.delete('category');
    } else {
      params.set('category', nextCategory);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const renderHistoryCard = (item: HistoryFeedItem) => {
    const categoryText = resolveCategoryLabel(locale, item.category);

    if (item.kind === 'requests') {
      return (
        <Card key={`${item.kind}-${item.id}`} className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-[color:var(--resident-ink-900)]">{item.heading}</p>
              <p className="text-xs text-[color:var(--resident-ink-700)]">{item.summary}</p>
            </div>
            <StatusBadge tone={statusToneFromState(item.status)}>{getRequestStatusLabel(item.status, locale)}</StatusBadge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--resident-ink-500)]">
            <span className="rounded-full border border-[color:var(--resident-border-soft)] px-2 py-0.5">{categoryText}</span>
            <span>{formatDateTime(item.sortAt, locale)}</span>
          </div>
        </Card>
      );
    }

    if (item.kind === 'notifications') {
      return (
        <Card key={`${item.kind}-${item.id}`} className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] p-4">
          <p className="text-sm font-semibold text-[color:var(--resident-ink-900)]">{item.heading}</p>
          <p className="mt-1 text-xs text-[color:var(--resident-ink-700)]">{item.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--resident-ink-500)]">
            <span className="rounded-full border border-[color:var(--resident-border-soft)] px-2 py-0.5">{categoryText}</span>
            <span>{formatDateTime(item.sortAt, locale)}</span>
          </div>
        </Card>
      );
    }

    return (
      <Card key={`${item.kind}-${item.id}`} className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--resident-ink-500)]">{item.caseNumber}</p>
            <p className="text-sm font-semibold text-[color:var(--resident-ink-900)]">{item.heading}</p>
            <p className="text-xs text-[color:var(--resident-ink-700)]">{item.incidentMeta}</p>
          </div>
          <StatusBadge tone={statusToneFromState(item.status)}>{getReportStatusLabel(item.status, locale)}</StatusBadge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--resident-ink-500)]">
          <span className="rounded-full border border-[color:var(--resident-border-soft)] px-2 py-0.5">{categoryText}</span>
          <span>{copyText(locale, 'Submitted', 'Na-submit')}: {formatDateTime(item.submittedAt, locale)}</span>
          <span>{formatDateTime(item.sortAt, locale)}</span>
        </div>
      </Card>
    );
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
        title={copyText(locale, 'Service History', 'Kasaysayan ng Serbisyo')}
        description={copyText(locale, 'Request history, notifications, and report progress in one place.', 'Magkakasama rito ang request history, notifications, at report progress.')}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">{copyText(locale, 'Requests', 'Mga Kahilingan')}</p>
            <p className="mt-1 text-3xl font-semibold text-[color:var(--resident-ink-900)]">{sortedRequests.length}</p>
          </Card>
          <Card className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">{copyText(locale, 'Notifications', 'Mga Abiso')}</p>
            <p className="mt-1 text-3xl font-semibold text-[color:var(--resident-ink-900)]">{sortedNotifications.length}</p>
          </Card>
          <Card className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">{copyText(locale, 'Report Progress', 'Pag-usad ng Ulat')}</p>
            <p className="mt-1 text-3xl font-semibold text-[color:var(--resident-ink-900)]">{sortedReports.length}</p>
          </Card>
        </div>
      </ResidentSection>

      <ResidentSection
        title={copyText(locale, 'History Categories', 'Mga Kategorya ng History')}
        description={copyText(
          locale,
          'Switch between all records or focus on one category. Your selected category stays in the URL.',
          'Pumili sa lahat ng records o tumutok sa isang kategorya. Nananatili sa URL ang napiling kategorya.'
        )}
      >
        <div
          className="flex flex-wrap gap-2 rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:#f6faf7] p-2"
          role="tablist"
          aria-label={copyText(locale, 'Request history categories', 'Mga kategorya ng request history')}
        >
          {categories.map((category) => {
            const isActive = category.id === activeCategory;
            return (
              <Button
                key={category.id}
                type="button"
                size="sm"
                role="tab"
                aria-selected={isActive}
                variant={isActive ? 'residentOutline' : 'ghost'}
                aria-pressed={isActive}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`history-category-${category.id}`}
                onClick={() => setCategory(category.id)}
                className="relative gap-2 rounded-lg"
              >
                <span>{category.label}</span>
                <span className="rounded-full border border-current/40 px-2 py-0.5 text-[11px] leading-none">{category.count}</span>
                {isActive ? (
                  <span className="absolute bottom-[-8px] left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-[color:#1b6b46]" aria-hidden />
                ) : null}
              </Button>
            );
          })}
        </div>
      </ResidentSection>

      <ResidentSection
        title={activeCategoryLabel}
        description={copyText(
          locale,
          'Records are sorted by latest activity first with stable ordering for ties.',
          'Ayos ang records mula pinakabago pababa, na may stable na tie-break kapag pareho ang oras.'
        )}
      >
        {!categoryItems.length ? (
          <ResidentEmpty
            title={copyText(locale, 'No history yet in this category', 'Wala pang history sa kategoryang ito')}
            description={copyText(
              locale,
              'Try another category or submit a new request to start building your history.',
              'Subukan ang ibang kategorya o magsumite ng bagong request para masimulan ang iyong history.'
            )}
          />
        ) : (
          <div className="grid gap-2">{categoryItems.map((item) => renderHistoryCard(item))}</div>
        )}
      </ResidentSection>
    </ResidentShell>
  );
}

export default function ResidentRequestHistoryPage() {
  return (
    <Suspense fallback={null}>
      <ResidentRequestHistoryPageContent />
    </Suspense>
  );
}
