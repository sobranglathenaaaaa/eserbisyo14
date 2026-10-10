'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormFeedback, PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentRequestSummaryModal } from '@/features/resident/view/document-request-summary-modal';
import { copyText } from '@/features/resident/model/copy';
import { getResidentFeedback, getResidentReports, getResidentRequests } from '@/features/resident/model/selectors';
import { ResidentEmpty, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel, getRequestStatusLabel } from '@/lib/formatters';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { cancelPendingRequest } from '@/lib/frontend-data/store';
import type { CheckupAppointmentStatus, ReportStatus, RequestStatus, ReservationStatus } from '@/lib/types/models';

type HistoryCategory = 'all' | 'requests' | 'reservations' | 'report-progress' | 'appointments' | 'feedback';
type HistoryStatusFilter = 'all' | RequestStatus | ReservationStatus | ReportStatus | CheckupAppointmentStatus | 'submitted';

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
      kind: 'reservations';
      category: 'reservations';
      id: string;
      sortAt: string;
      heading: string;
      summary: string;
      status: ReservationStatus;
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
    }
  | {
      kind: 'appointments';
      category: 'appointments';
      id: string;
      sortAt: string;
      heading: string;
      summary: string;
      status: CheckupAppointmentStatus;
    }
  | {
      kind: 'feedback';
      category: 'feedback';
      id: string;
      sortAt: string;
      heading: string;
      summary: string;
      status: 'submitted';
    };

const CATEGORY_ORDER: HistoryCategory[] = ['all', 'requests', 'reservations', 'report-progress', 'appointments', 'feedback'];

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
  if (category === 'requests') return copyText(locale, 'Document Requests', 'Mga Kahilingan sa Dokumento');
  if (category === 'reservations') return copyText(locale, 'Facilities & Equipment', 'Pasilidad at Equipment');
  if (category === 'report-progress') return copyText(locale, 'Report Progress', 'Pag-usad ng Ulat');
  if (category === 'appointments') return copyText(locale, 'Appointments', 'Appointments');
  return copyText(locale, 'Feedback', 'Feedback');
}

function resolveActiveCategory(rawCategory: string | null): HistoryCategory {
  if (!rawCategory) return 'all';
  return CATEGORY_ORDER.includes(rawCategory as HistoryCategory) ? (rawCategory as HistoryCategory) : 'all';
}

function getReservationStatusLabel(status: ReservationStatus, locale: 'en' | 'fil') {
  const labels: Record<ReservationStatus, string> = {
    pending: copyText(locale, 'Pending', 'Pending'),
    approved: copyText(locale, 'Approved', 'Approved'),
    declined: copyText(locale, 'Declined', 'Declined'),
    cancelled: copyText(locale, 'Cancelled', 'Nakansela'),
      ready_for_pickup: copyText(locale, 'Ready for Pickup', 'Handa nang kunin'),
      received: copyText(locale, 'Received', 'Natanggap'),
      returned: copyText(locale, 'Returned', 'Naibalik'),
      completed: copyText(locale, 'Completed', 'Nakumpleto'),
  };
  return labels[status];
}

function getAppointmentStatusLabel(status: CheckupAppointmentStatus, locale: 'en' | 'fil') {
  const labels: Record<CheckupAppointmentStatus, string> = {
    pending: copyText(locale, 'Pending', 'Pending'),
    approved: copyText(locale, 'Approved', 'Approved'),
    proceed_to_barangay: copyText(locale, 'Proceed to Barangay', 'Pumunta sa Barangay'),
    declined: copyText(locale, 'Declined', 'Tinanggihan'),
    completed: copyText(locale, 'Completed', 'Nakumpleto'),
    cancelled: copyText(locale, 'Cancelled', 'Nakansela'),
  };
  return labels[status];
}

function getHistoryStatusOptions(locale: 'en' | 'fil', category: HistoryCategory) {
  const options = (values: Array<[HistoryStatusFilter, string, string]>) => [
    ['all' as const, copyText(locale, 'All', 'Lahat'), copyText(locale, 'All', 'Lahat')],
    ...values.map(([value, en, fil]) => [value, en, fil] as const),
  ];
  if (category === 'feedback') return [];
  if (category === 'requests') return options([
    ['pending', 'Pending', 'Pending'], ['approved', 'Approved', 'Approved'],
    ['ready_for_pickup', 'Ready for Pickup', 'Handa nang kunin'], ['completed', 'Completed', 'Nakumpleto'],
    ['declined', 'Declined', 'Tinanggihan'], ['cancelled', 'Cancelled', 'Nakansela'],
  ]);
  if (category === 'reservations') return options([
    ['pending', 'Pending', 'Pending'],
    ['approved', 'Approved', 'Approved'], ['declined', 'Declined', 'Tinanggihan'],
    ['ready_for_pickup', 'Ready for Pickup', 'Handa nang kunin'], ['received', 'Received', 'Natanggap'],
    ['returned', 'Returned', 'Naibalik'],
    ['completed', 'Completed', 'Nakumpleto'],
  ]);
  if (category === 'report-progress') return options([
    ['pending', 'Pending', 'Pending'],
    ['under_review', 'Under Review', 'Under Review'],
    ['resolved', 'Resolved', 'Resolved'],
    ['declined', 'Declined', 'Tinanggihan'],
  ]);
  if (category === 'appointments') return options([
    ['pending', 'Pending', 'Pending'],
    ['approved', 'Approved', 'Approved'],
    ['declined', 'Declined', 'Tinanggihan'],
  ]);
  return options([
    ['pending', 'Pending', 'Pending'], ['approved', 'Approved', 'Approved'],
    ['ready_for_pickup', 'Ready for Pickup', 'Handa nang kunin'], ['proceed_to_barangay', 'Proceed to Barangay', 'Pumunta sa Barangay'],
    ['returned', 'Returned', 'Naibalik'], ['completed', 'Completed', 'Nakumpleto'], ['resolved', 'Completed', 'Nakumpleto'],
    ['declined', 'Declined', 'Tinanggihan'], ['cancelled', 'Cancelled', 'Nakansela'], ['submitted', 'Submitted', 'Naipasa'],
  ]);
}

function ResidentRequestHistoryPageContent() {
  const { state, user, locale } = useAppState();
  const PAGE_SIZE = 10;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [historyPage, setHistoryPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const [summaryRequestId, setSummaryRequestId] = useState<string | null>(null);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);
  const [cancellationFeedback, setCancellationFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryFeedItem | null>(null);
  const pageCopy = getRolePageCopy('resident/request-history') ?? {
    title: { en: 'Service History', fil: 'Kasaysayan ng Serbisyo' },
    description: {
      en: 'Review your requests and report progress.',
      fil: 'Suriin ang requests at report progress mo.',
    },
  };

  const activeCategory = resolveActiveCategory(searchParams.get('category'));
  const requests = useMemo(() => getResidentRequests(state, user?.id), [state, user?.id]);
  const reservations = useMemo(
    () => state.reservations.filter((item) => item.residentId === user?.id),
    [state.reservations, user?.id]
  );
  const reports = useMemo(() => getResidentReports(state, user?.id), [state, user?.id]);
  const appointments = useMemo(
    () => state.checkupAppointments.filter((item) => item.residentId === user?.id),
    [state.checkupAppointments, user?.id]
  );
  const feedback = useMemo(
    () => getResidentFeedback(state, user?.id),
    [state, user?.id]
  );
  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => compareByDateDesc(a, b, (item) => item.updatedAt, (item) => item.id)),
    [requests]
  );

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => compareByDateDesc(a, b, (item) => item.updatedAt, (item) => item.id)),
    [reports]
  );

  const sortedReservations = useMemo(
    () => [...reservations].sort((a, b) => compareByDateDesc(a, b, (item) => item.updatedAt || item.createdAt, (item) => item.id)),
    [reservations]
  );

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => compareByDateDesc(a, b, (item) => item.updatedAt || item.createdAt, (item) => item.id)),
    [appointments]
  );

  const sortedFeedback = useMemo(
    () => [...feedback].sort((a, b) => compareByDateDesc(a, b, (item) => item.createdAt, (item) => item.id)),
    [feedback]
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

    const reservationItems: HistoryFeedItem[] = sortedReservations.map((item) => ({
      kind: 'reservations',
      category: 'reservations',
      id: item.id,
      sortAt: item.updatedAt || item.createdAt,
      heading: item.resource === 'covered_court'
        ? 'Covered Court'
        : item.resource === 'barangay_hall'
          ? 'Multi Purpose Hall'
          : item.resource === 'service_vehicle'
            ? 'Service Vehicle'
            : item.itemName || 'Equipment',
      summary: `${formatDateTime(item.startAt, locale)} - ${formatDateTime(item.endAt, locale)}${item.purpose ? ` · ${item.purpose}` : ''}`,
      status: item.status,
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

    const appointmentItems: HistoryFeedItem[] = sortedAppointments.map((item) => ({
      kind: 'appointments',
      category: 'appointments',
      id: item.id,
      sortAt: item.updatedAt || item.createdAt,
      heading: `Dr. ${item.doctorName}`,
      summary: `${item.date} ${item.startAt} - ${item.endAt}${item.reason ? ` - ${item.reason}` : ''}`,
      status: item.status,
    }));

    const feedbackItems: HistoryFeedItem[] = sortedFeedback.map((item) => ({
      kind: 'feedback',
      category: 'feedback',
      id: item.id,
      sortAt: item.createdAt,
      heading: item.requestId ?? copyText(locale, 'Assistant Feedback', 'Feedback sa Assistant'),
      summary: `${item.rating}/5${item.comment ? ` - ${item.comment}` : ''}`,
      status: 'submitted',
    }));

    return [...requestItems, ...reservationItems, ...reportItems, ...appointmentItems, ...feedbackItems].sort((a, b) => {
      const dateDelta = toEpoch(b.sortAt) - toEpoch(a.sortAt);
      if (dateDelta !== 0) return dateDelta;
      return b.id.localeCompare(a.id);
    });
  }, [locale, sortedAppointments, sortedFeedback, sortedReports, sortedRequests, sortedReservations]);

  const categoryItems = useMemo(() => {
    if (activeCategory === 'all') return allHistoryItems;
    return allHistoryItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, allHistoryItems]);

  const filteredCategoryItems = useMemo(
    () =>
      statusFilter === 'all'
        ? categoryItems
        : categoryItems.filter((item) => item.status === statusFilter),
    [categoryItems, statusFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filteredCategoryItems.length / PAGE_SIZE));
  const currentPage = Math.min(historyPage, totalPages);
  const visibleCategoryItems = filteredCategoryItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const categories = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => {
        const count =
          category === 'all'
            ? allHistoryItems.length
            : category === 'requests'
              ? sortedRequests.length
              : category === 'reservations'
                ? sortedReservations.length
                : category === 'report-progress'
                  ? sortedReports.length
                  : category === 'appointments'
                    ? sortedAppointments.length
                    : sortedFeedback.length;

        return {
          id: category,
          label: resolveCategoryLabel(locale, category),
          count,
        };
      }),
    [allHistoryItems.length, locale, sortedAppointments.length, sortedFeedback.length, sortedReports.length, sortedRequests.length, sortedReservations.length]
  );

  const activeCategoryLabel = resolveCategoryLabel(locale, activeCategory);
  const statusOptions = getHistoryStatusOptions(locale, activeCategory);
  const summaryRequest = requests.find((item) => item.id === summaryRequestId) ?? null;

  const openHistoryReview = (item: HistoryFeedItem) => {
    if (item.kind === 'requests') {
      setSummaryRequestId(item.id);
      return;
    }
    setSelectedHistoryItem(item);
  };

  const handleCancelRequest = async () => {
    if (!summaryRequestId) return;

    setIsCancellingRequest(true);
    try {
      await cancelPendingRequest(summaryRequestId);
      setSummaryRequestId(null);
      setCancellationFeedback({
        tone: 'success',
        text: copyText(locale, 'Request cancelled successfully.', 'Matagumpay na nakansela ang request.'),
      });
    } catch (error) {
      console.error('Failed to cancel request from history:', error);
      setCancellationFeedback({
        tone: 'error',
        text: error instanceof Error
          ? error.message
          : copyText(locale, 'Unable to cancel this request.', 'Hindi makansela ang request na ito.'),
      });
    } finally {
      setIsCancellingRequest(false);
    }
  };

  const reviewButton = (item: HistoryFeedItem) => (
    <div className="flex justify-center">
      <Button type="button" variant="ghost" onClick={() => openHistoryReview(item)}>
        {copyText(locale, 'Review', 'Suriin')}
      </Button>
    </div>
  );

  const getHistoryItemStatusLabel = (item: HistoryFeedItem) => {
    if (item.kind === 'requests') return getRequestStatusLabel(item.status, locale);
    if (item.kind === 'reservations') return getReservationStatusLabel(item.status, locale);
    if (item.kind === 'report-progress') return getReportStatusLabel(item.status, locale);
    if (item.kind === 'appointments') return getAppointmentStatusLabel(item.status, locale);
    return copyText(locale, 'Submitted', 'Naipasa');
  };

  const setCategory = (nextCategory: HistoryCategory) => {
    setHistoryPage(1);
    setStatusFilter('all');
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory === 'all') {
      params.delete('category');
    } else {
      params.set('category', nextCategory);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const renderHistoryRow = (item: HistoryFeedItem) => {
    const categoryText = resolveCategoryLabel(locale, item.category);

    if (item.kind === 'feedback') {
      return (
        <TableRow key={`${item.kind}-${item.id}`}>
          <TableCell className="max-w-0 truncate text-center font-medium" title={item.heading}>{item.heading}</TableCell>
          <TableCell className="text-center">{categoryText}</TableCell>
          <TableCell className="text-center"><StatusBadge tone="info">{copyText(locale, 'Submitted', 'Naipasa')}</StatusBadge></TableCell>
          <TableCell className="text-center">{formatDateTime(item.sortAt, locale)}</TableCell>
          <TableCell className="text-center">{reviewButton(item)}</TableCell>
        </TableRow>
      );
    }

    if (item.kind === 'appointments') {
      return (
        <TableRow key={`${item.kind}-${item.id}`}>
          <TableCell className="max-w-0 truncate text-center font-medium" title={item.heading}>{item.heading}</TableCell>
          <TableCell className="text-center">{categoryText}</TableCell>
          <TableCell className="text-center"><StatusBadge tone={statusToneFromState(item.status)}>{getAppointmentStatusLabel(item.status, locale)}</StatusBadge></TableCell>
          <TableCell className="text-center">{formatDateTime(item.sortAt, locale)}</TableCell>
          <TableCell className="text-center">{reviewButton(item)}</TableCell>
        </TableRow>
      );
    }

    if (item.kind === 'requests' || item.kind === 'reservations') {
      return (
        <TableRow key={`${item.kind}-${item.id}`}>
          <TableCell className="max-w-0 truncate text-center font-medium" title={item.heading}>{item.heading}</TableCell>
          <TableCell className="text-center">{categoryText}</TableCell>
          <TableCell className="text-center">
            <StatusBadge tone={statusToneFromState(item.status)}>
              {item.kind === 'requests' ? getRequestStatusLabel(item.status, locale) : getReservationStatusLabel(item.status, locale)}
            </StatusBadge>
          </TableCell>
          <TableCell className="text-center">{formatDateTime(item.sortAt, locale)}</TableCell>
          <TableCell className="text-center">{reviewButton(item)}</TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow key={`${item.kind}-${item.id}`}>
        <TableCell className="max-w-0 truncate text-center font-medium" title={`${item.caseNumber} - ${item.heading}`}>
          {item.caseNumber} - {item.heading}
        </TableCell>
        <TableCell className="text-center">{categoryText}</TableCell>
        <TableCell className="text-center">
          <StatusBadge tone={statusToneFromState(item.status)}>{getReportStatusLabel(item.status, locale)}</StatusBadge>
        </TableCell>
        <TableCell className="text-center">{formatDateTime(item.sortAt, locale)}</TableCell>
        <TableCell className="text-center">{reviewButton(item)}</TableCell>
      </TableRow>
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

      {cancellationFeedback ? <FormFeedback tone={cancellationFeedback.tone} text={cancellationFeedback.text} /> : null}

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
        className="bg-white"
        actions={
          <>
            {statusOptions.length ? (
              <>
                <label htmlFor="request-history-status" className="sr-only">
                  {copyText(locale, 'Filter by status', 'I-filter ayon sa status')}
                </label>
                <Select
                  id="request-history-status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as HistoryStatusFilter);
                    setHistoryPage(1);
                  }}
                  className="h-9 w-[190px] text-xs"
                >
                  {statusOptions.map(([value, en, fil]) => (
                    <option key={value} value={value}>{locale === 'fil' ? fil : en}</option>
                  ))}
                </Select>
              </>
            ) : null}
          </>
        }
        description={copyText(
          locale,
          'Records are sorted by latest activity first with stable ordering for ties.',
          'Ayos ang records mula pinakabago pababa, na may stable na tie-break kapag pareho ang oras.'
        )}
      >
        {!filteredCategoryItems.length ? (
          <ResidentEmpty
            title={copyText(locale, 'No history yet in this category', 'Wala pang history sa kategoryang ito')}
            description={copyText(
              locale,
              'Try another category or submit a new request to start building your history.',
              'Subukan ang ibang kategorya o magsumite ng bagong request para masimulan ang iyong history.'
            )}
          />
        ) : (
          <div>
            {/* Mobile View: Cards */}
            <div className="block md:hidden space-y-3">
              {visibleCategoryItems.map((item) => {
                const categoryText = resolveCategoryLabel(locale, item.category);
                const titleText = item.kind === 'report-progress'
                  ? `${item.caseNumber ? `${item.caseNumber} - ` : ''}${item.heading}`
                  : item.heading;

                return (
                  <div key={`m-rh-${item.kind}-${item.id}`} className="rounded-xl border border-[color:var(--portal-border-soft)] bg-white p-3.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-md bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                          {categoryText}
                        </span>
                        <h4 className="text-sm font-bold text-[color:var(--portal-ink-900)] leading-snug">{titleText}</h4>
                      </div>
                      <div>
                        {item.kind === 'feedback' ? (
                          <StatusBadge tone="info">{copyText(locale, 'Submitted', 'Naipasa')}</StatusBadge>
                        ) : item.kind === 'appointments' ? (
                          <StatusBadge tone={statusToneFromState(item.status)}>{getAppointmentStatusLabel(item.status, locale)}</StatusBadge>
                        ) : item.kind === 'requests' ? (
                          <StatusBadge tone={statusToneFromState(item.status)}>{getRequestStatusLabel(item.status, locale)}</StatusBadge>
                        ) : item.kind === 'reservations' ? (
                          <StatusBadge tone={statusToneFromState(item.status)}>{getReservationStatusLabel(item.status, locale)}</StatusBadge>
                        ) : (
                          <StatusBadge tone={statusToneFromState(item.status)}>{getReportStatusLabel(item.status, locale)}</StatusBadge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[color:var(--portal-border-soft)] pt-2.5 text-xs text-[color:var(--portal-ink-500)]">
                      <span>{formatDateTime(item.sortAt, locale)}</span>
                      <div>{reviewButton(item)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[color:var(--portal-border-soft)]">
              <Table className="min-w-[760px] table-fixed text-center">
                <TableHeader>
                  <TableRow className="bg-emerald-50/40">
                    <TableHead className="w-[30%] text-center font-bold">{copyText(locale, 'Record', 'Record')}</TableHead>
                    <TableHead className="w-[20%] text-center font-bold">{copyText(locale, 'Category', 'Kategorya')}</TableHead>
                    <TableHead className="w-[18%] text-center font-bold">{copyText(locale, 'Status', 'Katayuan')}</TableHead>
                    <TableHead className="w-[20%] text-center font-bold">{copyText(locale, 'Updated', 'Na-update')}</TableHead>
                    <TableHead className="w-[12%] text-center font-bold">{copyText(locale, 'Action', 'Aksyon')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{visibleCategoryItems.map((item) => renderHistoryRow(item))}</TableBody>
              </Table>
            </div>
          </div>
        )}
        {filteredCategoryItems.length > 0 ? (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[color:var(--portal-border-soft)] pt-3">
            <div className="text-xs sm:text-sm text-[color:var(--portal-ink-500)] text-center sm:text-left">
              {`Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredCategoryItems.length)} of ${filteredCategoryItems.length}`}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                className="text-xs sm:text-sm"
              >
                {locale === 'fil' ? 'Nakaraan' : 'Previous'}
              </Button>
              <div className="text-xs sm:text-sm font-semibold px-2 text-[color:var(--portal-ink-600)]">{currentPage} / {totalPages}</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setHistoryPage((page) => Math.min(totalPages, page + 1))}
                className="text-xs sm:text-sm"
              >
                {locale === 'fil' ? 'Susunod' : 'Next'}
              </Button>
            </div>
          </div>
        ) : null}
      </ResidentSection>

      <DocumentRequestSummaryModal
        open={Boolean(summaryRequest)}
        requestItem={summaryRequest}
        locale={locale}
        onClose={() => setSummaryRequestId(null)}
        onCancel={handleCancelRequest}
        isCancelling={isCancellingRequest}
      />
      <Dialog open={selectedHistoryItem !== null} onOpenChange={(open) => { if (!open) setSelectedHistoryItem(null); }}>
        <DialogContent className="gap-5 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedHistoryItem?.heading}</DialogTitle>
            <DialogDescription>
              {selectedHistoryItem ? resolveCategoryLabel(locale, selectedHistoryItem.category) : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedHistoryItem ? (
            <div className="grid gap-3 text-sm text-[color:var(--portal-ink-700)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{copyText(locale, 'Status', 'Katayuan')}</span>
                <StatusBadge tone={statusToneFromState(selectedHistoryItem.status)}>
                  {getHistoryItemStatusLabel(selectedHistoryItem)}
                </StatusBadge>
              </div>
              <p>
                <strong>{copyText(locale, 'Updated', 'Na-update')}:</strong> {formatDateTime(selectedHistoryItem.sortAt, locale)}
              </p>
              {selectedHistoryItem.kind === 'report-progress' ? (
                <>
                  <p><strong>{copyText(locale, 'Case Number', 'Case Number')}:</strong> {selectedHistoryItem.caseNumber}</p>
                  <p><strong>{copyText(locale, 'Incident', 'Insidente')}:</strong> {selectedHistoryItem.incidentMeta}</p>
                  <p><strong>{copyText(locale, 'Submitted', 'Naipasa')}:</strong> {formatDateTime(selectedHistoryItem.submittedAt, locale)}</p>
                </>
              ) : selectedHistoryItem.kind === 'appointments' || selectedHistoryItem.kind === 'reservations' || selectedHistoryItem.kind === 'feedback' ? (
                <p><strong>{copyText(locale, 'Details', 'Detalye')}:</strong> {selectedHistoryItem.summary}</p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
