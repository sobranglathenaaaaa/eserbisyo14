'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { X, Search, Eye, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { EmptyState, FieldLabel, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import DocumentRequestPreviewModal from '@/components/document-request-preview-modal';
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
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

function getRequestTemplateInfo(typeLabel?: string | null, category?: string | null) {
  const combined = `${typeLabel || ''} ${category || ''}`.toLowerCase();
  if (combined.includes('transient') || combined.includes('kasambahay') || combined.includes('household') || combined.includes('worker') || combined.includes('company employee')) {
    return { id: 'transient_employees', name: 'Transient Worker Certification Template', tone: 'indigo' as const };
  }
  if (combined.includes('delivery') || combined.includes('hauling') || combined.includes('concrete') || combined.includes('cement') || combined.includes('debris') || combined.includes('panambak')) {
    return { id: 'delivery_hauling_clearances', name: 'Delivery & Hauling Clearance Template', tone: 'amber' as const };
  }
  if (combined.includes('special') || combined.includes('shooting') || combined.includes('flyer') || combined.includes('sampler') || combined.includes('cable') || combined.includes('wire') || combined.includes('commercial')) {
    return { id: 'special_commercial_permits', name: 'Special & Commercial Permit Template', tone: 'purple' as const };
  }
  if (combined.includes('business') || combined.includes('negosyo') || combined.includes('micro') || combined.includes('trade')) {
    return { id: 'business_clearance', name: 'Business Clearance Template', tone: 'amber' as const };
  }
  if (
    combined.includes('construction') ||
    combined.includes('building') ||
    combined.includes('renovation') ||
    combined.includes('excavation') ||
    combined.includes('demolition') ||
    combined.includes('occupancy') ||
    combined.includes('fencing') ||
    combined.includes('pagpapatayo')
  ) {
    return { id: 'construction_clearances', name: 'Construction Clearance Template', tone: 'orange' as const };
  }
  if (combined.includes('lupon') || combined.includes('summons') || combined.includes('patawag') || combined.includes('cfa') || combined.includes('case')) {
    return { id: 'lupon_tagapamayapa', name: 'Lupon Summons (KP #9) Template', tone: 'rose' as const };
  }
  if (combined.includes('indigency') || combined.includes('financial') || combined.includes('medical assistance') || combined.includes('tulong')) {
    return { id: 'barangay_certification', name: 'Certificate of Indigency Template', tone: 'blue' as const };
  }
  if (combined.includes('residency') || combined.includes('tirahan') || combined.includes('permanent')) {
    return { id: 'barangay_certification', name: 'Certificate of Residency Template', tone: 'indigo' as const };
  }
  if (combined.includes('moral') || combined.includes('good moral')) {
    return { id: 'barangay_certification', name: 'Good Moral Character Template', tone: 'purple' as const };
  }
  return { id: 'barangay_certification', name: 'Barangay Certification Template', tone: 'emerald' as const };
}

export default function AdminDocumentRequestsPage() {
  const { state, locale } = useAppState();
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewRequestId, setPreviewRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'declined' | 'cancelled' | 'pending' | 'staff_reviewed' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageCopy = getRolePageCopy('admin/document-requests');

  const selectedRequest = selectedId ? (state.documentRequests ?? []).find((item) => item.id === selectedId) ?? null : null;
  const previewRequest = previewRequestId ? (state.documentRequests ?? []).find((item) => item.id === previewRequestId) ?? null : null;
  const previewResident = previewRequest ? (state.users ?? []).find((u) => u.id === previewRequest.residentId) ?? null : null;

  useBodyScrollLock(Boolean(selectedRequest || previewRequestId));

  const overlayRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 10;
  const filteredRequests = useMemo(() => {
    const base = statusFilter === 'all'
      ? state.documentRequests
      : state.documentRequests.filter((item) => item.status === statusFilter);

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((item) => {
      return (
        (item.referenceNumber || '').toLowerCase().includes(q) ||
        (item.residentName || '').toLowerCase().includes(q) ||
        (item.typeLabel || '').toLowerCase().includes(q) ||
        (item.purpose || '').toLowerCase().includes(q) ||
        String(item.amount).toLowerCase().includes(q)
      );
    });
  }, [state.documentRequests, statusFilter, search]);

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

      <SectionCard
        title={locale === 'fil' ? 'Mga Kahilingan sa Dokumento' : 'Document Requests'}
        description={locale === 'fil' ? 'Suriin, aprubahan, o silipin ang mga request gamit ang official document templates.' : 'Review, approve, and preview requests generated using official document templates.'}
      >
        {!state.documentRequests.length ? (
          <EmptyState
            title={locale === 'fil' ? 'Walang requests' : 'No requests yet'}
            description={locale === 'fil' ? 'Lalabas dito ang mga papasok na request mula sa mga residente.' : 'Incoming resident document requests will appear here.'}
          />
        ) : (
          <>
            {/* Search & Filter Controls */}
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--portal-ink-400)]" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={locale === 'fil' ? 'Hanapin (Reference, Pangalan, Uri, Dahilan)...' : 'Search by reference, resident, type, purpose...'}
                  className="pl-9 h-10 w-full bg-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="h-10 min-w-[170px] bg-white text-xs font-semibold"
                >
                  <option value="all">{locale === 'fil' ? 'Lahat ng Status' : 'All Status'}</option>
                  <option value="pending">{locale === 'fil' ? 'Naghihintay (Pending)' : 'Pending'}</option>
                  <option value="staff_reviewed">{locale === 'fil' ? 'Staff Reviewed' : 'Staff Reviewed'}</option>
                  <option value="approved">{locale === 'fil' ? 'Aprubado (Approved)' : 'Approved'}</option>
                  <option value="ready_for_pickup">{locale === 'fil' ? 'Ready for Pickup' : 'Ready for Pickup'}</option>
                  <option value="completed">{locale === 'fil' ? 'Nakumpleto (Completed)' : 'Completed'}</option>
                  <option value="declined">{locale === 'fil' ? 'Tinanggihan (Declined)' : 'Declined'}</option>
                  <option value="cancelled">{locale === 'fil' ? 'Kanselado (Cancelled)' : 'Cancelled'}</option>
                </Select>
              </div>
            </div>

            {/* Results Count & Order Info */}
            <div className="mb-3 flex items-center justify-between text-xs text-[color:var(--portal-ink-600)]">
              <p>
                <span className="font-semibold text-slate-900">{filteredRequests.length}</span> {locale === 'fil' ? 'kabuuang request' : 'total requests'}
                {newestRequestTimestamp ? ` · ${locale === 'fil' ? 'Pinakahuli' : 'Latest'}: ${relativeTime(newestRequestTimestamp, locale)}` : ''}
              </p>
            </div>

            {/* Document Requests Table */}
            <div className="overflow-x-auto rounded-[var(--portal-radius-md)] border border-slate-200 bg-white">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Reference</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Resident</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Document Type & Template</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Purpose</TableHead>
                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700">Amount</TableHead>
                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700">Status</TableHead>
                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-[color:var(--portal-ink-500)]">
                        {locale === 'fil' ? 'Walang nahanap na tugmang requests.' : 'No matching document requests found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((item) => {
                      const templateInfo = getRequestTemplateInfo(item.typeLabel, item.category);
                      const isSelected = selectedRequest?.id === item.id;

                      return (
                        <TableRow key={item.id} className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70 transition-colors'}>
                          <TableCell className="py-3 px-4 align-middle">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200/60">
                              {item.referenceNumber}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 px-4 align-middle">
                            <p className="text-sm font-semibold text-slate-900">{item.residentName}</p>
                          </TableCell>

                          <TableCell className="py-3 px-4 align-middle">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.typeLabel}</p>
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                                <FileText className="h-3 w-3 text-slate-400" />
                                <span>{templateInfo.name}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 px-4 align-middle max-w-[220px]">
                            <p className="text-xs text-slate-600 line-clamp-2" title={item.purpose || undefined}>
                              {item.purpose || '—'}
                            </p>
                          </TableCell>

                          <TableCell className="py-3 px-4 text-center align-middle">
                            <span className="text-xs font-semibold text-slate-900">
                              {item.amount === 0 ? (locale === 'fil' ? 'Libre' : 'Free') : `₱${item.amount.toLocaleString()}`}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 px-4 text-center align-middle">
                            <StatusBadge tone={statusToneFromState(item.status)}>
                              {getRequestStatusLabel(item.status, locale)}
                            </StatusBadge>
                          </TableCell>

                          <TableCell className="py-3 px-4 text-center align-middle">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="secondary"
                                size="sm"
                                type="button"
                                onClick={() => openReview(item.id)}
                                className="h-8 px-3 text-xs font-semibold"
                              >
                                {locale === 'fil' ? 'Suriin' : 'Review'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--portal-ink-600)]">
              <p>
                {filteredRequests.length === 0
                  ? ''
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of ${filteredRequests.length}`}
              </p>

              <div className="inline-flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="text-xs"
                >
                  {locale === 'fil' ? 'Nakaraan' : 'Previous'}
                </Button>
                <div className="rounded bg-slate-100 px-3 py-1 font-semibold text-slate-700 text-xs">
                  {`${currentPage} / ${totalPages}`}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs"
                >
                  {locale === 'fil' ? 'Susunod' : 'Next'}
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* ADMIN REVIEW & DECISION MODAL */}
      {selectedRequest ? (
        <div
          ref={overlayRef}
          onMouseDown={(e) => {
            if (e.target === overlayRef.current) closeReview();
          }}
          className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <section
            aria-labelledby="request-decision-title"
            aria-modal="true"
            className="w-full max-w-[640px] max-h-[92vh] overflow-y-auto rounded-[var(--portal-radius-lg)] border border-slate-200 bg-white shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4 bg-slate-50/70">
              <div>
                <p className="text-xs font-mono font-bold text-blue-700 flex items-center gap-2">
                  <span>{selectedRequest.referenceNumber}</span>
                </p>
                <h2 id="request-decision-title" className="mt-1 text-base font-bold text-slate-900">
                  {locale === 'fil' ? 'Pagsusuri at Desisyon sa Request' : 'Request Review & Decision'}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={closeReview} aria-label={locale === 'fil' ? 'Isara' : 'Close'}>
                <X size={16} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-4 px-6 py-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{locale === 'fil' ? 'Petsa ng Kahilingan' : 'Requested Date'}: {formatDateTime(selectedRequest.createdAt, locale)}</span>
                <StatusBadge tone={statusToneFromState(selectedRequest.status)}>
                  {getRequestStatusLabel(selectedRequest.status, locale)}
                </StatusBadge>
              </div>

              {/* Request Info Card */}
              <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Document Type</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedRequest.typeLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Template</p>
                    <span className="inline-flex items-center gap-1 mt-0.5 rounded bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                      <Sparkles className="h-3 w-3" />
                      {getRequestTemplateInfo(selectedRequest.typeLabel, selectedRequest.category).name}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2 text-xs text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">{locale === 'fil' ? 'Pangalan ng Residente' : 'Resident Name'}:</span> {selectedRequest.residentName}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">{locale === 'fil' ? 'Layunin / Purpose' : 'Purpose / Notes'}:</span> {selectedRequest.purpose || '—'}
                  </p>
                  {selectedRequest.adminDecisionReason && (
                    <p className="rounded bg-amber-50 p-2 border border-amber-200 text-amber-900">
                      <span className="font-semibold">{locale === 'fil' ? 'Naunang Dahilan / Tala' : 'Existing Reason / Note'}:</span> {selectedRequest.adminDecisionReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Decline Reason Input */}
              <FieldLabel
                label={locale === 'fil' ? 'Dahilan ng Decline (Kinakailangan kapag tatanggihan)' : 'Decline Reason (Required if declining)'}
                hint={locale === 'fil' ? 'Maaaring ilagay kung ano ang kulang na dokumento o requirement.' : 'Explain what requirements or verification are missing.'}
              >
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={locale === 'fil' ? 'Halimbawa: Hindi tugma ang valid ID o kulang ang proof of residency' : 'Example: Missing proof of residency or invalid ID'}
                  className="bg-white"
                />
              </FieldLabel>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewRequestId(selectedRequest.id)}
                className="gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                <Eye className="h-4 w-4 text-blue-600" />
                {locale === 'fil' ? 'Silipin ang Template Preview' : 'Preview Document Template'}
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={closeReview} className="text-xs">
                  {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
                </Button>

                {['pending', 'staff_reviewed', 'approved'].includes(selectedRequest.status) && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!reason.trim()}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3.5 shadow-xs disabled:opacity-50"
                    onClick={() => void declineSelectedRequest()}
                  >
                    {locale === 'fil' ? 'I-decline' : 'Decline'}
                  </Button>
                )}

                {['pending', 'staff_reviewed', 'approved'].includes(selectedRequest.status) && (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 shadow-xs"
                    onClick={() => void approveSelectedRequest()}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {locale === 'fil' ? 'Aprubahan' : 'Approve'}
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* AUTHENTIC DOCUMENT PREVIEW MODAL */}
      <DocumentRequestPreviewModal
        open={Boolean(previewRequestId)}
        onOpenChange={(open) => {
          if (!open) setPreviewRequestId(null);
        }}
        request={previewRequest}
        resident={previewResident}
        documentTemplates={state.documentTemplates}
        locale={locale}
      />
    </PortalShell>
  );
}
