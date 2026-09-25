'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EmptyState, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, getReportStatusLabel, getRequestStatusLabel } from '@/lib/formatters';
import PortalShell from '../../../components/portal-shell';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

type HistoryCategory = 'all' | 'requests' | 'reservations' | 'report-progress' | 'appointments' | 'feedback';
type HistoryRow = {
  id: string;
  category: Exclude<HistoryCategory, 'all'>;
  residentName: string;
  record: string;
  detail: string;
  status: string;
  updatedAt: string;
};

const CATEGORY_ORDER: HistoryCategory[] = ['all', 'requests', 'reservations', 'report-progress', 'appointments', 'feedback'];
const CATEGORY_LABELS: Record<HistoryCategory, { en: string; fil: string }> = {
  all: { en: 'All History', fil: 'Lahat ng History' },
  requests: { en: 'Document Requests', fil: 'Mga Kahilingan sa Dokumento' },
  reservations: { en: 'Facilities & Equipment', fil: 'Pasilidad at Equipment' },
  'report-progress': { en: 'Report Progress', fil: 'Pag-usad ng Ulat' },
  appointments: { en: 'Appointments', fil: 'Appointments' },
  feedback: { en: 'Feedback', fil: 'Feedback' },
};

const STATUS_OPTIONS: Partial<Record<Exclude<HistoryCategory, 'all'>, string[]>> = {
  requests: ['pending', 'staff_reviewed', 'approved', 'ready_for_pickup', 'completed', 'declined', 'cancelled'],
  reservations: ['pending', 'approved', 'ready_for_pickup', 'returned', 'completed', 'declined', 'cancelled'],
  'report-progress': ['pending', 'under_review', 'approved', 'proceed_to_barangay', 'resolved', 'declined'],
  appointments: ['pending', 'approved', 'proceed_to_barangay', 'completed', 'declined', 'cancelled'],
};

function categoryLabel(category: HistoryCategory, locale: 'en' | 'fil') {
  return CATEGORY_LABELS[category][locale];
}

function getStatusLabel(status: string, locale: 'en' | 'fil', category?: HistoryCategory) {
  if (category === 'requests') return getRequestStatusLabel(status as Parameters<typeof getRequestStatusLabel>[0], locale);
  if (category === 'report-progress') return getReportStatusLabel(status as Parameters<typeof getReportStatusLabel>[0], locale);
  const labels: Record<string, { en: string; fil: string }> = {
    all: { en: 'All', fil: 'Lahat' },
    pending: { en: 'Pending', fil: 'Pending' },
    staff_reviewed: { en: 'Staff reviewed', fil: 'Nasuri ng staff' },
    under_review: { en: 'Under review', fil: 'Sinusuri' },
    approved: { en: 'Approved', fil: 'Approved' },
    ready_for_pickup: { en: 'Ready for Pickup', fil: 'Handa nang kunin' },
    proceed_to_barangay: { en: 'Proceed to Barangay', fil: 'Pumunta sa Barangay' },
    returned: { en: 'Returned', fil: 'Naibalik' },
    completed: { en: 'Completed', fil: 'Nakumpleto' },
    resolved: { en: 'Completed', fil: 'Nakumpleto' },
    declined: { en: 'Declined', fil: 'Tinanggihan' },
    cancelled: { en: 'Cancelled', fil: 'Nakansela' },
    submitted: { en: 'Submitted', fil: 'Naipasa' },
  };
  return labels[status]?.[locale] ?? status;
}

export default function AdminRequestHistoryPage() {
  const { state, locale } = useAppState();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const activeCategory = CATEGORY_ORDER.includes(searchParams.get('category') as HistoryCategory)
    ? (searchParams.get('category') as HistoryCategory)
    : 'all';

  const history = useMemo<HistoryRow[]>(() => {
    const requests: HistoryRow[] = state.documentRequests.map((item) => ({
      id: `request-${item.id}`,
      category: 'requests',
      residentName: item.residentName,
      record: item.referenceNumber,
      detail: item.typeLabel,
      status: item.status,
      updatedAt: item.updatedAt || item.createdAt,
    }));
    const reservations: HistoryRow[] = state.reservations.map((item) => ({
      id: `reservation-${item.id}`,
      category: 'reservations',
      residentName: item.residentName,
      record: item.resource + (item.itemName ? ` - ${item.itemName}` : ''),
      detail: item.purpose || `${item.date} ${item.startAt} - ${item.endAt}`,
      status: item.status,
      updatedAt: item.updatedAt || item.createdAt,
    }));
    const reports: HistoryRow[] = state.reports.map((item) => ({
      id: `report-${item.id}`,
      category: 'report-progress',
      residentName: item.residentName,
      record: item.title,
      detail: `${item.kind} · ${item.location}`,
      status: item.status,
      updatedAt: item.updatedAt || item.createdAt,
    }));
    const appointments: HistoryRow[] = state.checkupAppointments.map((item) => ({
      id: `appointment-${item.id}`,
      category: 'appointments',
      residentName: item.residentName,
      record: `Dr. ${item.doctorName}`,
      detail: item.date,
      status: item.status,
      updatedAt: item.updatedAt || item.createdAt,
    }));
    const feedback: HistoryRow[] = state.feedback.map((item) => ({
      id: `feedback-${item.id}`,
      category: 'feedback',
      residentName: state.users.find((resident) => resident.id === item.residentId)?.fullName ?? '—',
      record: item.requestId ?? (locale === 'fil' ? 'Feedback sa Assistant' : 'Assistant Feedback'),
      detail: `${item.rating}/5${item.comment ? ` · ${item.comment}` : ''}`,
      status: 'submitted',
      updatedAt: item.createdAt,
    }));
    return [...requests, ...reservations, ...reports, ...appointments, ...feedback]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id.localeCompare(a.id));
  }, [state.checkupAppointments, state.documentRequests, state.feedback, state.reports, state.reservations, state.users]);

  const categoryCounts = useMemo(() => {
    const counts: Record<HistoryCategory, number> = { all: history.length, requests: 0, reservations: 0, 'report-progress': 0, appointments: 0, feedback: 0 };
    history.forEach((item) => { counts[item.category] += 1; });
    return counts;
  }, [history]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return history
      .filter((item) => activeCategory === 'all' || item.category === activeCategory)
      .filter((item) => statusFilter === 'all' || item.status === statusFilter)
      .filter((item) => !query || [item.residentName, item.record, item.detail].some((value) => value.toLocaleLowerCase().includes(query)));
  }, [activeCategory, history, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const pageItems = visibleItems.slice((page - 1) * pageSize, page * pageSize);
  const statusOptions = activeCategory === 'all' ? [] : STATUS_OPTIONS[activeCategory] ?? [];

  const setCategory = (category: HistoryCategory) => {
    setCurrentPage(1);
    setStatusFilter('all');
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') params.delete('category');
    else params.set('category', category);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <PortalShell
      role="admin"
      title={{ en: 'Request History', fil: 'History ng mga Kahilingan' }}
      description={{ en: 'Review resident requests and service records by category.', fil: 'Tingnan ang mga request at service record ng residente ayon sa kategorya.' }}
      showHero={false}
    >
      <SectionCard title={locale === 'fil' ? 'Mga Kategorya ng History' : 'History Categories'}>
        <div className="flex flex-wrap gap-2 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-2" role="tablist" aria-label="Request history categories">
          {CATEGORY_ORDER.map((category) => {
            const active = category === activeCategory;
            return (
              <Button
                key={category}
                type="button"
                size="sm"
                role="tab"
                aria-selected={active}
                aria-pressed={active}
                variant={active ? 'residentOutline' : 'ghost'}
                onClick={() => setCategory(category)}
                className="gap-2 rounded-lg"
              >
                <span>{categoryLabel(category, locale)}</span>
                <span className="rounded-full border border-current/40 px-2 py-0.5 text-[11px] leading-none">{categoryCounts[category]}</span>
              </Button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={categoryLabel(activeCategory, locale)}
        description={locale === 'fil' ? 'Ayos mula sa pinakabagong update.' : 'Sorted by most recent update.'}
        actions={statusOptions.length ? (
          <Select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }}
            aria-label={locale === 'fil' ? 'Salain ayon sa status' : 'Filter by status'}
            className="h-9 w-[190px] text-xs"
          >
            <option value="all">{locale === 'fil' ? 'Lahat ng status' : 'All statuses'}</option>
            {statusOptions.map((status) => <option key={status} value={status}>{getStatusLabel(status, locale, activeCategory)}</option>)}
          </Select>
        ) : null}
      >
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
          placeholder={locale === 'fil' ? 'Pangalan ng residente o record' : 'Resident name or record'}
          aria-label={locale === 'fil' ? 'Maghanap sa history' : 'Search history'}
          className="mb-1 sm:max-w-sm"
        />

        {!visibleItems.length ? (
          <EmptyState
            title={locale === 'fil' ? 'Walang history sa kategoryang ito' : 'No history in this category'}
            description={locale === 'fil' ? 'Subukan ang ibang kategorya o status filter.' : 'Try another category or status filter.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{locale === 'fil' ? 'Pangalan ng residente' : 'Resident name'}</TableHead>
                  <TableHead className="text-center">{locale === 'fil' ? 'Record' : 'Record'}</TableHead>
                  <TableHead className="text-center">{locale === 'fil' ? 'Kategorya' : 'Category'}</TableHead>
                  <TableHead className="text-center">{locale === 'fil' ? 'Status' : 'Status'}</TableHead>
                  <TableHead className="text-center">{locale === 'fil' ? 'Na-update' : 'Updated'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-medium">{item.residentName}</TableCell>
                    <TableCell className="text-center">
                      <p className="font-medium">{item.record}</p>
                      {item.detail ? <p className="mx-auto max-w-[320px] truncate text-xs font-normal text-[color:var(--portal-ink-500)]" title={item.detail}>{item.detail}</p> : null}
                    </TableCell>
                    <TableCell className="text-center">{categoryLabel(item.category, locale)}</TableCell>
                    <TableCell className="text-center"><StatusBadge tone={statusToneFromState(item.status)}>{getStatusLabel(item.status, locale, item.category)}</StatusBadge></TableCell>
                    <TableCell className="text-center">{formatDateTime(item.updatedAt, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {visibleItems.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--portal-ink-500)]">
              {`Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, visibleItems.length)} of ${visibleItems.length}`}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={page <= 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}>
                {locale === 'fil' ? 'Nakaraan' : 'Previous'}
              </Button>
              <span className="text-sm text-[color:var(--portal-ink-600)]">{page} / {totalPages}</span>
              <Button type="button" variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}>
                {locale === 'fil' ? 'Susunod' : 'Next'}
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </PortalShell>
  );
}
