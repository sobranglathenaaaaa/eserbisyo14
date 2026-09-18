'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { X, Funnel } from 'lucide-react';
import { EmptyState, FieldLabel, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, getRequestStatusLabel, relativeTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { adminReviewRequest } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';



export default function AdminDocumentRequestsPage() {
  const { state, locale } = useAppState();
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'declined' | 'cancelled' | 'pending' | 'staff_reviewed' | 'processing'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageCopy = getRolePageCopy('admin/document-requests');

  const approved = useMemo(() => state.documentRequests.filter((item) => item.status === 'approved'), [state.documentRequests]);
  const pending = useMemo(() => state.documentRequests.filter((item) => item.status === 'pending'), [state.documentRequests]);
  const staffReviewed = useMemo(() => state.documentRequests.filter((item) => item.status === 'staff_reviewed'), [state.documentRequests]);
  const selectedRequest = selectedId ? state.documentRequests.find((item) => item.id === selectedId) ?? null : null;

  

  const statusSelectRef = useRef<HTMLSelectElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  

  const PAGE_SIZE = 10;
  const filteredRequests = useMemo(() => {
    const base = statusFilter === 'all'
      ? state.documentRequests.filter((item) => item.status !== 'processing')
      : statusFilter === 'staff_reviewed'
        ? staffReviewed
        : statusFilter === 'declined'
          ? state.documentRequests.filter((item) => item.status === 'declined')
          : statusFilter === 'pending'
            ? pending
            : state.documentRequests.filter((item) => item.status === statusFilter);

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((item) => {
      return (
        (item.referenceNumber || '').toLowerCase().includes(q) ||
        (item.residentName || '').toLowerCase().includes(q) ||
        (item.typeLabel || '').toLowerCase().includes(q) ||
        String(item.amount).toLowerCase().includes(q)
      );
    });
  }, [state.documentRequests, statusFilter, search, pending, staffReviewed]);

  const totalPages = Math.max(1, Math.ceil((filteredRequests.length ?? 0) / PAGE_SIZE));
  useEffect(() => {
    setCurrentPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, currentPage]);

  const newestRequestTimestamp = useMemo(() => {
    if (!filteredRequests.length) return null;
    return filteredRequests[0]?.createdAt || null;
  }, [filteredRequests]);

  const openReview = (requestId: string) => {
    setSelectedId(requestId);
    setReason('');
  };

  const closeReview = () => {
    setSelectedId(null);
    setReason('');
  };

  // Prevent background scrolling when the review modal is open
  useEffect(() => {
    if (!selectedRequest) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selectedRequest]);

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    if (!selectedRequest) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRequest]);

  const approveSelectedRequest = async () => {
    if (!selectedRequest) return;

    await adminReviewRequest(selectedRequest.id, 'approved', reason.trim() || undefined);
    closeReview();
  };

  const declineSelectedRequest = async () => {
    if (!selectedRequest) return;

    await adminReviewRequest(selectedRequest.id, 'declined', reason.trim());
    closeReview();
  };

  

  return (
    <PortalShell role="admin" title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      {/* Top summary cards removed per admin request */}

      <SectionCard
        title={locale === 'fil' ? 'Mga Kahilingan sa Dokumento' : 'Document Requests'}
        description={locale === 'fil' ? 'Hanapin ang mga request' : 'Search Requests'}
      >
        {!state.documentRequests.length ? (
          <EmptyState
            title={locale === 'fil' ? 'Walang requests' : 'No requests yet'}
            description={locale === 'fil' ? 'Lalabas dito ang mga papasok na request.' : 'Incoming requests will appear here.'}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="grid gap-1 text-sm w-[70px] md:w-[150px] lg:w-[190px]">
                  <span className="sr-only">{locale === 'fil' ? 'Hanapin' : 'Search'}</span>
                    <Input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder={locale === 'fil' ? 'Reference, pangalan, uri' : 'Reference, name, type'} />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-[color:var(--portal-ink-500)]">
                  {filteredRequests.length} {locale === 'fil' ? 'requests' : 'requests'} · {locale === 'fil' ? 'Nakaayos mula pinakahuling request' : 'Sorted by most recent request'}
                  {newestRequestTimestamp ? ` · ${locale === 'fil' ? 'Pinakahuli' : 'Latest'}: ${relativeTime(newestRequestTimestamp, locale)}` : ''}
                </p>

                <div className="inline-flex items-center gap-2">
                  <label className="sr-only">{locale === 'fil' ? 'Filter status' : 'Filter status'}</label>
                  <div className="relative">
                    <Select ref={statusSelectRef} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}>
                    <option value="all">{locale === 'fil' ? 'Lahat' : 'All'}</option>
                    <option value="pending">{locale === 'fil' ? 'Naghihintay' : 'Pending'}</option>
                    <option value="approved">{locale === 'fil' ? 'Aprubado' : 'Approved'}</option>
                    <option value="declined">{locale === 'fil' ? 'Tinanggihan' : 'Declined'}</option>
                    <option value="completed">{locale === 'fil' ? 'Nakumpleto' : 'Completed'}</option>
                    <option value="cancelled">{locale === 'fil' ? 'Kanselado' : 'Cancelled'}</option>
                    </Select>
                    
                  </div>
                  <button
                    type="button"
                    aria-label={locale === 'fil' ? 'Filter' : 'Filter'}
                    onClick={() => {
                      setStatusFilter('pending');
                      setCurrentPage(1);
                      // focus the select and attempt to open it
                      statusSelectRef.current?.focus();
                      setTimeout(() => {
                        try {
                          statusSelectRef.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
                        } catch (e) {
                          // no-op
                        }
                      }, 60);
                    }}
                    className="relative rounded p-2 text-[color:var(--portal-ink-600)] hover:bg-[color:var(--portal-border-soft)]"
                  >
                    <Funnel size={16} />
                    {pending.length > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-block h-2 w-2 rounded-full bg-red-600" aria-hidden />
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '12%' }}>ID</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '15%' }}>{locale === 'fil' ? 'Reference' : 'Reference'}</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '25%' }}>{locale === 'fil' ? 'Resident' : 'Resident'}</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '18%' }}>{locale === 'fil' ? 'Uri' : 'Type'}</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '12%' }}>{locale === 'fil' ? 'Bayad' : 'Amount'}</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '12%' }}>{locale === 'fil' ? 'Status' : 'Status'}</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '6%' }}>{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Walang resulta' : 'No matching requests'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow key={item.id} className={selectedRequest?.id === item.id ? 'bg-[color:var(--portal-surface-3)]' : ''}>
                      <TableCell className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] align-middle text-center font-mono text-[10px] text-[color:var(--portal-ink-500)] select-all">{item.id}</TableCell>
                      <TableCell className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] align-middle text-center">{item.referenceNumber}</TableCell>
                      <TableCell className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] align-middle text-center">{item.residentName}</TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle">{item.typeLabel}</TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle">{item.amount === 0 ? (locale === 'fil' ? 'Libre' : 'Free') : `P${item.amount}`}</TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle">
                        <StatusBadge tone={statusToneFromState(item.status)}>{getRequestStatusLabel(item.status, locale)}</StatusBadge>
                      </TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle">
                        <div className="flex justify-center">
                          <Button variant="ghost" type="button" onClick={() => openReview(item.id)}>
                            {locale === 'fil' ? 'Suriin' : 'Review'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-[color:var(--portal-ink-500)]">
                {filteredRequests.length === 0 ? '' : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of ${filteredRequests.length}`}
              </p>
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    {locale === 'fil' ? 'Nakaraan' : 'Previous'}
                  </Button>
                  <div className="text-sm text-[color:var(--portal-ink-600)]">{`${currentPage} / ${totalPages}`}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {locale === 'fil' ? 'Susunod' : 'Next'}
                  </Button>
                </div>
            </div>
          </>
        )}
      </SectionCard>

      {selectedRequest ? (
        <div
          ref={overlayRef}
          onMouseDown={(e) => {
            if (e.target === overlayRef.current) closeReview();
          }}
          className="fixed inset-0 z-[80] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4"
        >
          <section
            aria-labelledby="request-decision-title"
            aria-modal="true"
            className="w-full max-w-[620px] max-h-[90vh] overflow-auto rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[0_24px_70px_rgba(13,45,29,0.28)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
              <div>
                <p className="text-xs text-[color:var(--portal-ink-500)] flex items-center gap-2">
                  <span>{selectedRequest.referenceNumber}</span>
                </p>
                <h2 id="request-decision-title" className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]">
                  {locale === 'fil' ? 'Request Detail at Decision' : 'Request Detail and Decision'}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 min-h-8 px-2" onClick={closeReview} aria-label={locale === 'fil' ? 'Isara' : 'Close'}>
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-4 px-5 py-4">
              <p className="text-xs font-medium text-[color:var(--portal-ink-500)]">
                {locale === 'fil' ? 'Hiniling' : 'Requested'}: {formatDateTime(selectedRequest.createdAt, locale)}
              </p>

              <div className="grid gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{selectedRequest.typeLabel}</p>
                  <StatusBadge tone={statusToneFromState(selectedRequest.status)}>{getRequestStatusLabel(selectedRequest.status, locale)}</StatusBadge>
                </div>
                <div className="grid gap-1 text-sm text-[color:var(--portal-ink-700)]">
                  <p>
                    {locale === 'fil' ? 'Resident' : 'Resident'}: <strong>{selectedRequest.residentName}</strong>
                  </p>
                  <p>
                    {locale === 'fil' ? 'Purpose / Notes' : 'Purpose / Notes'}: {selectedRequest.purpose}
                  </p>
                  <p>
                    {locale === 'fil' ? 'Naunang dahilan' : 'Existing reason'}: {selectedRequest.adminDecisionReason ?? selectedRequest.processingDeclineReason ?? '-'}
                  </p>
                </div>
              </div>

              

              

              <FieldLabel
                label={locale === 'fil' ? 'Dahilan ng decline (required kapag decline)' : 'Decline reason (required for decline)'}
                hint={locale === 'fil' ? 'Hindi mae-enable ang decline kung walang dahilan.' : 'Decline is disabled until a reason is entered.'}
              >
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={locale === 'fil' ? 'Halimbawa: kulang ang requirements' : 'Example: missing requirements'}
                />
              </FieldLabel>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[color:var(--portal-border-soft)] px-5 py-4">
              <Button variant="ghost" type="button" onClick={closeReview}>
                {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
              </Button>
              {['pending', 'staff_reviewed', 'approved'].includes(selectedRequest.status) && (
                <Button
                  type="button"
                  className="w-full md:w-auto border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)]"
                  onClick={() => void approveSelectedRequest()}
                >
                  {locale === 'fil' ? 'Aprubahan' : 'Approve'}
                </Button>
              )}
              {['pending', 'staff_reviewed', 'approved', 'processing'].includes(selectedRequest.status) && (
                <Button
                  type="button"
                  disabled={!reason.trim()}
                  className="bg-[linear-gradient(180deg,#9f1239_0%,#7f112b_100%)] text-white px-4 py-2 shadow-[0_10px_24px_rgba(159,18,57,0.24)] hover:bg-[linear-gradient(180deg,#b91c3f_0%,#881337_100%)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => void declineSelectedRequest()}
                >
                  {locale === 'fil' ? 'I-decline' : 'Decline'}
                </Button>
              )}
              
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
