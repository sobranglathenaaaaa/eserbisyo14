'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { FormFeedback, InfoNotice, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel } from '@/lib/formatters';
import { copyText } from '@/features/resident/model/copy';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { updateReportStatus, upsertIncidentCategory } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
export default function AdminIncidentsPage() {
  const { state, locale } = useAppState();
  const currentRole = state.session?.role;
  const isAdmin = currentRole === 'admin';
  const isStaff = currentRole === 'staff';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'under_review' | 'resolved' | 'declined' | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renamingCategoryValue, setRenamingCategoryValue] = useState('');
  const [categoryAction, setCategoryAction] = useState<{ id: string; kind: 'adding' | 'renaming' | 'archiving' | 'restoring' } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState<'none' | 'approved' | 'declined' | 'resolved'>('none');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [categoryFeedback, setCategoryFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const pageCopy = getRolePageCopy('admin/incidents');
  const visibleReportLimit = 10;
  const activeReports = useMemo(() => state.reports.filter((item) => item.status !== 'resolved'), [state.reports]);
  const resolvedReports = useMemo(() => state.reports.filter((item) => item.status === 'resolved'), [state.reports]);
  const selected =
    activeReports.find((item) => item.id === selectedId) ??
    resolvedReports.find((item) => item.id === selectedId) ??
    activeReports[0] ??
    resolvedReports[0] ??
    null;
  const categories = state.incidentCategories
    .slice()
    .sort((a, b) => (a.sortOrder === b.sortOrder ? a.name.localeCompare(b.name) : a.sortOrder - b.sortOrder));
  const statusCounts = useMemo(
    () => ({
      pending: state.reports.filter((item) => item.status === 'pending').length,
      under_review: state.reports.filter((item) => item.status === 'under_review').length,
      resolved: state.reports.filter((item) => item.status === 'resolved').length,
      declined: state.reports.filter((item) => item.status === 'declined').length,
    }),
    [state.reports]
  );

  const filteredActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.reports.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!q) return true;
      return [item.id, item.residentName, item.kind, item.location, item.otherCategoryText ?? '', item.details]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [state.reports, search, statusFilter]);

  const totalActivePages = Math.max(1, Math.ceil(filteredActive.length / visibleReportLimit));
  const currentActivePage = Math.min(activePage, totalActivePages);
  const activeStartIndex = (currentActivePage - 1) * visibleReportLimit;
  const visibleActiveReports = filteredActive.slice(activeStartIndex, activeStartIndex + visibleReportLimit);

  useEffect(() => {
    setActivePage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (!selected) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== selected.id) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (!categoryFeedback) return;
    const timeoutId = window.setTimeout(() => setCategoryFeedback(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [categoryFeedback]);

  useEffect(() => {
    if (!reviewOpen) return;
    setReviewNote('');
    setDeclineReason('');
  }, [reviewOpen, selected?.id]);

  useEffect(() => {
    if (!reviewOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [reviewOpen]);

  useEffect(() => {
    if (!reviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReviewModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reviewOpen]);

  const openReviewModal = (reportId: string) => {
    setSelectedId(reportId);
    setReviewNote('');
    setReviewOpen(true);
  };

  const closeReviewModal = () => {
    setReviewOpen(false);
    setReviewNote('');
    setDeclineReason('');
    setProcessingStatus('none');
  };

  const approveSelectedReport = async () => {
    if (!selected) return;
    setProcessingStatus('approved');
    try {
      await updateReportStatus(selected.id, 'under_review', reviewNote.trim() || undefined);
      setFeedback({
        tone: 'success',
        text: locale === 'fil'
          ? 'Ang report ay naaprubahan at nakatakda na sa under review. Email ay ipinadala na sa resident.'
          : 'The report has been approved and moved to under review. Email sent to resident.',
      });
      closeReviewModal();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to approve incident report.',
      });
    } finally {
      setProcessingStatus('none');
    }
  };

  const declineSelectedReport = async () => {
    if (!selected) return;
    if (!declineReason.trim()) {
      setFeedback({
        tone: 'error',
        text: locale === 'fil' ? 'Kailangan ang dahilan bago i-decline ang report.' : 'A decline reason is required before declining the report.',
      });
      return;
    }
    setProcessingStatus('declined');
    try {
      await updateReportStatus(selected.id, 'declined', declineReason.trim() || undefined);
      setFeedback({
        tone: 'success',
        text: locale === 'fil'
          ? 'Ang report ay tinanggihan.'
          : 'The report has been declined.',
      });
      closeReviewModal();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to decline incident report.',
      });
    } finally {
      setProcessingStatus('none');
    }
  };

  const markReportResolved = async () => {
    if (!selected) return;
    setProcessingStatus('resolved');
    try {
      await updateReportStatus(selected.id, 'resolved', reviewNote.trim() || undefined);
      setFeedback({
        tone: 'success',
        text: locale === 'fil'
          ? 'Ang report ay na-mark na bilang resolved.'
          : 'The report has been marked as resolved.',
      });
      closeReviewModal();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to mark incident report as resolved.',
      });
    } finally {
      setProcessingStatus('none');
    }
  };

  const renderReportRow = (item: (typeof state.reports)[number]) => (
    <TableRow
      key={item.id}
      onClick={() => setSelectedId(item.id)}
      className={`cursor-pointer ${selected?.id === item.id ? 'bg-[color:var(--portal-surface-3)]' : ''}`}
    >
      <TableCell className="text-center whitespace-nowrap text-xs font-medium text-[color:var(--portal-ink-700)]">
        {formatIncidentCaseNumber(item.id, item.createdAt)}
      </TableCell>
      <TableCell className="text-center">{formatDateTime(item.createdAt, locale)}</TableCell>
      <TableCell className="text-center capitalize">
        {item.kind}
        {item.otherCategoryText ? `: ${item.otherCategoryText}` : ''}
      </TableCell>
      <TableCell className="text-center">{item.residentName}</TableCell>
      <TableCell className="text-center">
        <StatusBadge tone={statusToneFromState(item.status)}>{getReportStatusLabel(item.status, locale)}</StatusBadge>
      </TableCell>
      <TableCell className="text-center">
        {item.status === 'resolved' ? (
          formatDateTime(item.updatedAt, locale)
        ) : (
          <Button variant="ghost" type="button" onClick={() => openReviewModal(item.id)}>
            {locale === 'fil' ? 'Suriin' : 'Review'}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <PortalShell role="admin" allowedRoles={['admin', 'staff']} title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {feedback ? (
        <div className="mb-4">
          <InfoNotice
            title={feedback.tone === 'success' ? (locale === 'fil' ? 'Success' : 'Success') : (locale === 'fil' ? 'Error' : 'Error')}
            description={feedback.text}
          />
        </div>
      ) : null}

      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <div className="grid gap-4">
        <SectionCard title={locale === 'fil' ? 'Ulat ng Insidente' : 'Incident Reports'}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-4">
              <label className="grid gap-1 text-sm flex-1">
                <span>{locale === 'fil' ? 'Hanapin ang Ulat' : 'Search Reports'}</span>
                <Input
                  className="w-full max-w-[560px]"
                  placeholder={locale === 'fil' ? 'Case, resident, lokasyon' : 'Case, resident, location'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--portal-ink-500)]">
              {filteredActive.length} {locale === 'fil' ? 'ulat · Filtered' : 'reports · Filtered'} {statusFilter ? `(${statusFilter === 'pending' ? locale === 'fil' ? 'Pending' : 'Pending' : statusFilter === 'under_review' ? locale === 'fil' ? 'Under Review' : 'Under Review' : statusFilter === 'declined' ? locale === 'fil' ? 'Declined' : 'Declined' : locale === 'fil' ? 'Resolved' : 'Resolved'})` : ''}
            </p>

            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === null ? 'bg-[color:var(--portal-border-soft)]' : 'hover:bg-[color:var(--portal-border-soft)]'}`}
                onClick={() => setStatusFilter(null)}
              >
                {locale === 'fil' ? 'Lahat' : 'All'} ({state.reports.length})
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'pending' ? 'bg-[color:#fff7ed]' : 'hover:bg-[color:#fff7ed]'}`}
                onClick={() => setStatusFilter((prev) => (prev === 'pending' ? null : 'pending'))}
              >
                <div className="relative inline-block">
                  {locale === 'fil' ? 'Pending' : 'Pending'} ({statusCounts.pending})
                  {statusCounts.pending > 0 && (
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full" />
                  )}
                </div>
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'under_review' ? 'bg-[color:#ecfdf5]' : 'hover:bg-[color:#ecfdf5]'}`}
                onClick={() => setStatusFilter((prev) => (prev === 'under_review' ? null : 'under_review'))}
              >
                {locale === 'fil' ? 'Under Review' : 'Under Review'} ({statusCounts.under_review})
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'resolved' ? 'bg-[color:#dbeafe]' : 'hover:bg-[color:#dbeafe]'}`}
                onClick={() => setStatusFilter((prev) => (prev === 'resolved' ? null : 'resolved'))}
              >
                {locale === 'fil' ? 'Resolved' : 'Resolved'} ({statusCounts.resolved})
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'declined' ? 'bg-[color:#fee2e2]' : 'hover:bg-[color:#fee2e2]'}`}
                onClick={() => setStatusFilter((prev) => (prev === 'declined' ? null : 'declined'))}
              >
                {locale === 'fil' ? 'Declined' : 'Declined'} ({statusCounts.declined})
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[var(--portal-radius-md)]">
            <Table className="min-w-[980px] text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16%] text-center">{locale === 'fil' ? 'Case / Reference' : 'Case / Reference'}</TableHead>
                  <TableHead className="w-[18%] text-center">{locale === 'fil' ? 'Na-submit' : 'Submitted'}</TableHead>
                  <TableHead className="w-[22%] text-center">{locale === 'fil' ? 'Uri' : 'Type'}</TableHead>
                  <TableHead className="w-[18%] text-center">{locale === 'fil' ? 'Resident' : 'Resident'}</TableHead>
                  <TableHead className="w-[14%] text-center">{locale === 'fil' ? 'Status' : 'Status'}</TableHead>
                  <TableHead className="w-[12%] text-center">{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleActiveReports.length ? (
                  visibleActiveReports.map((item) => renderReportRow(item))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-[color:var(--portal-ink-600)]">
                      {copyText(locale, 'No incident reports.', 'Wala pang incident reports.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--portal-border-soft)] pt-4">
            <div className="text-sm text-[color:var(--portal-ink-700)]">
              {locale === 'fil'
                ? `Showing ${filteredActive.length ? activeStartIndex + 1 : 0}–${Math.min(activeStartIndex + visibleReportLimit, filteredActive.length)} of ${filteredActive.length}`
                : `Showing ${filteredActive.length ? activeStartIndex + 1 : 0}–${Math.min(activeStartIndex + visibleReportLimit, filteredActive.length)} of ${filteredActive.length}`}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="residentOutlineGray" size="sm" disabled={currentActivePage <= 1} onClick={() => setActivePage((value) => Math.max(1, value - 1))}>
                {locale === 'fil' ? 'Previous' : 'Previous'}
              </Button>
              <div className="min-w-[52px] text-center text-sm font-semibold text-[color:var(--portal-ink-900)]">
                {currentActivePage} / {totalActivePages}
              </div>
              <Button
                type="button"
                variant="residentOutlineGray"
                size="sm"
                disabled={currentActivePage >= totalActivePages}
                onClick={() => setActivePage((value) => Math.min(totalActivePages, value + 1))}
              >
                {locale === 'fil' ? 'Next' : 'Next'}
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      {reviewOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReviewModal();
          }}
        >
          <section
            aria-labelledby="incident-decision-title"
            aria-modal="true"
            className="w-full max-w-[620px] max-h-[90vh] overflow-auto rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[0_24px_70px_rgba(13,45,29,0.28)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
              <div>
                <p className="text-xs text-[color:var(--portal-ink-500)] flex items-center gap-2">
                  <span>{selected ? formatIncidentCaseNumber(selected.id, selected.createdAt) : ''}</span>
                </p>
                <h2 id="incident-decision-title" className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]">
                  {locale === 'fil' ? 'Detail at Review ng Incident Report' : 'Incident Report Detail and Review'}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 min-h-8 px-2" onClick={closeReviewModal} aria-label={locale === 'fil' ? 'Isara' : 'Close'}>
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            {selected ? (
              <div className="grid gap-4 px-5 py-4">
                <p className="text-xs font-medium text-[color:var(--portal-ink-500)]">
                  {locale === 'fil' ? 'Nareport' : 'Reported'}: {formatDateTime(selected.createdAt, locale)}
                </p>

                <div className="grid gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{selected.title}</p>
                    <StatusBadge tone={statusToneFromState(selected.status)}>{getReportStatusLabel(selected.status, locale)}</StatusBadge>
                  </div>
                  <div className="grid gap-1 text-sm text-[color:var(--portal-ink-700)]">
                    <p>
                      {locale === 'fil' ? 'Resident' : 'Resident'}: <strong>{selected.residentName}</strong>
                    </p>
                    <p>
                      {locale === 'fil' ? 'Uri' : 'Type'}: {selected.kind}{selected.otherCategoryText ? `: ${selected.otherCategoryText}` : ''}
                    </p>
                    <p>
                      {locale === 'fil' ? 'Lokasyon' : 'Location'}: {selected.location}
                    </p>
                    <p>
                      {locale === 'fil' ? 'Petsa ng insidente' : 'Date of incident'}: {selected.dateOfIncident}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">{locale === 'fil' ? 'Full Details' : 'Full Details'}</p>
                  <p className="text-sm whitespace-pre-wrap leading-6 text-[color:var(--portal-ink-800)]">{selected.details}</p>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[color:var(--portal-ink-900)]">{locale === 'fil' ? 'Review note' : 'Review note'}</span>
                  <Textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder={locale === 'fil' ? 'Maglagay ng note' : 'Add a note...'}
                    className="min-h-[100px] resize-none"
                  />
                </label>

                {selected?.status === 'pending' ? (
                  <>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-[color:var(--portal-ink-900)]">{locale === 'fil' ? 'Decline reason' : 'Decline reason'}</span>
                      <Input
                        value={declineReason}
                        onChange={(event) => setDeclineReason(event.target.value)}
                        placeholder={locale === 'fil' ? 'Example: incomplete' : 'Example: incomplete'}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-[color:var(--portal-border-soft)] px-5 py-4">
              <Button variant="ghost" type="button" onClick={closeReviewModal}>
                {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
              </Button>
              {selected?.status === 'pending' && (
                <>
                  <Button
                    type="button"
                    className="w-full md:w-auto border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)]"
                    disabled={processingStatus !== 'none'}
                    onClick={() => void approveSelectedReport()}
                  >
                    {processingStatus === 'approved'
                      ? locale === 'fil'
                        ? 'Ina-approve...'
                        : 'Approving...'
                      : locale === 'fil'
                        ? 'Aprubahan'
                        : 'Approve'}
                  </Button>
                  <Button
                    type="button"
                    disabled={!declineReason.trim() || processingStatus !== 'none'}
                    className="bg-[linear-gradient(180deg,#9f1239_0%,#7f112b_100%)] text-white px-4 py-2 shadow-[0_10px_24px_rgba(159,18,57,0.24)] hover:bg-[linear-gradient(180deg,#b91c3f_0%,#881337_100%)] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => void declineSelectedReport()}
                  >
                    {processingStatus === 'declined'
                      ? locale === 'fil'
                        ? 'Tinatanggihan...'
                        : 'Declining...'
                      : locale === 'fil'
                        ? 'I-decline'
                        : 'Decline'}
                  </Button>
                </>
              )}
              {selected?.status === 'under_review' && (
                <Button
                  type="button"
                  className="w-full md:w-auto border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={processingStatus !== 'none'}
                  onClick={() => void markReportResolved()}
                >
                  {processingStatus === 'resolved'
                    ? locale === 'fil'
                      ? 'Ina-update...'
                      : 'Updating...'
                    : locale === 'fil'
                      ? 'Mark Resolved'
                      : 'Mark Resolved'}
                </Button>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <SectionCard title={locale === 'fil' ? 'Incident Categories' : 'Incident Categories'}>
        <div className="grid gap-3">
          {categoryFeedback ? (
            <FormFeedback tone={categoryFeedback.tone} text={categoryFeedback.text} />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder={locale === 'fil' ? 'Bagong category' : 'New category'}
              className="max-w-[280px]"
            />
            <Button
              type="button"
              className="border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={categoryAction?.kind === 'adding'}
              onClick={async () => {
                const trimmedName = newCategoryName.trim();
                if (!trimmedName) return;
                setCategoryAction({ id: 'new-category', kind: 'adding' });
                try {
                  await upsertIncidentCategory({ name: trimmedName });
                  setCategoryFeedback({
                    tone: 'success',
                    text: locale === 'fil' ? 'Category added successfully.' : 'Category added successfully.',
                  });
                  setNewCategoryName('');
                } catch (error) {
                  setCategoryFeedback({
                    tone: 'error',
                    text: error instanceof Error ? error.message : 'Unable to add category.',
                  });
                } finally {
                  setCategoryAction(null);
                }
              }}
            >
              {categoryAction?.kind === 'adding' ? (locale === 'fil' ? 'Adding...' : 'Adding...') : locale === 'fil' ? 'Idagdag' : 'Add'}
            </Button>
          </div>
          <div className="grid gap-2">
            {categories.map((item) => {
              const isRenaming = renamingCategoryId === item.id;
              return (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--portal-radius-sm)] border border-[color:var(--portal-border-soft)] px-3 py-2">
                  <div className="text-sm">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renamingCategoryValue}
                          onChange={(event) => setRenamingCategoryValue(event.target.value)}
                          className="max-w-[220px]"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-4 py-2 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)] disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={categoryAction?.kind === 'renaming'}
                          onClick={async () => {
                            const trimmed = renamingCategoryValue.trim();
                            if (!trimmed || trimmed === item.name) {
                              setRenamingCategoryId(null);
                              setRenamingCategoryValue('');
                              return;
                            }
                            setCategoryAction({ id: item.id, kind: 'renaming' });
                            try {
                              await upsertIncidentCategory({
                                id: item.id,
                                name: trimmed,
                                sortOrder: item.sortOrder,
                                isActive: item.isActive,
                              });
                              setCategoryFeedback({
                                tone: 'success',
                                text: locale === 'fil' ? 'Category renamed successfully.' : 'Category renamed successfully.',
                              });
                              setRenamingCategoryId(null);
                              setRenamingCategoryValue('');
                            } catch (error) {
                              setCategoryFeedback({
                                tone: 'error',
                                text: error instanceof Error ? error.message : 'Unable to rename category.',
                              });
                            } finally {
                              setCategoryAction(null);
                            }
                          }}
                        >
                          {categoryAction?.id === item.id && categoryAction.kind === 'renaming' ? (locale === 'fil' ? 'Saving...' : 'Saving...') : locale === 'fil' ? 'I-save' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRenamingCategoryId(null);
                            setRenamingCategoryValue('');
                          }}
                        >
                          {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
                        </Button>
                      </div>
                    ) : (
                      <p className="font-semibold text-[color:var(--portal-ink-900)]">{item.name}</p>
                    )}
                    {!isRenaming ? (
                      <p className="text-xs text-[color:var(--portal-ink-700)]">{item.isActive ? (locale === 'fil' ? 'Aktibo' : 'Active') : (locale === 'fil' ? 'Archived' : 'Archived')}</p>
                    ) : null}
                  </div>
                  {!isRenaming ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRenamingCategoryId(item.id);
                          setRenamingCategoryValue(item.name);
                        }}
                      >
                        {locale === 'fil' ? 'Palitan ang pangalan' : 'Rename'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className={item.isActive ? 'bg-[linear-gradient(180deg,#9f1239_0%,#7f112b_100%)] text-white px-4 py-2 shadow-[0_10px_24px_rgba(159,18,57,0.24)] hover:bg-[linear-gradient(180deg,#b91c3f_0%,#881337_100%)] disabled:opacity-60 disabled:cursor-not-allowed' : 'border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-4 py-2 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)] disabled:opacity-60 disabled:cursor-not-allowed'}
                        disabled={categoryAction?.id === item.id}
                        onClick={async () => {
                          const nextKind = item.isActive ? 'archiving' : 'restoring';
                          setCategoryAction({ id: item.id, kind: nextKind });
                          try {
                            await upsertIncidentCategory({ id: item.id, name: item.name, sortOrder: item.sortOrder, isActive: !item.isActive });
                            setCategoryFeedback({
                              tone: item.isActive ? 'error' : 'success',
                              text: item.isActive
                                ? locale === 'fil' ? 'Category archived successfully.' : 'Category archived successfully.'
                                : locale === 'fil' ? 'Category restored successfully.' : 'Category restored successfully.',
                            });
                          } catch (error) {
                            setCategoryFeedback({
                              tone: 'error',
                              text: error instanceof Error ? error.message : item.isActive ? 'Unable to archive category.' : 'Unable to restore category.',
                            });
                          } finally {
                            setCategoryAction(null);
                          }
                        }}
                      >
                        {categoryAction?.id === item.id && categoryAction.kind === 'archiving' ? (locale === 'fil' ? 'Archiving' : 'Archiving') : categoryAction?.id === item.id && categoryAction.kind === 'restoring' ? (locale === 'fil' ? 'Restoring' : 'Restoring') : item.isActive ? (locale === 'fil' ? 'I-archive' : 'Archive') : (locale === 'fil' ? 'Ibalik' : 'Restore')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </PortalShell>
  );
}
