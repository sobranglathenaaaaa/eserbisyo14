'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { X, Funnel } from 'lucide-react';
import { EmptyState, FieldLabel, FormFeedback, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, relativeTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import type { Reservation } from '@/lib/types/models';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

export default function StaffReservationsPage() {
  const { state, locale } = useAppState();
  const [reason, setReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState<Reservation['status'] | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Reservation['status'] | 'finished'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageCopy = getRolePageCopy('staff/reservations') ?? {
    title: { en: 'Reservations', fil: 'Mga Reservation' },
    description: { en: 'Review and approve reservations.', fil: 'Suriin at aprubahan ang reservations.' },
  };
  const PAGE_SIZE = 10;

  const pending = useMemo(() => (state.reservations ?? []).filter((item) => item.status === 'pending'), [state.reservations]);
  const selectedReservation = selectedId ? (state.reservations ?? []).find((item) => item.id === selectedId) ?? null : null;
  useBodyScrollLock(Boolean(selectedReservation));

  const statusSelectRef = useRef<HTMLSelectElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!actionFeedback) return;
    const timeout = window.setTimeout(() => setActionFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [actionFeedback]);

  useEffect(() => {
    let active = true;
    const checkReturnReminders = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const session = await getSupabaseSessionSafely(supabase);
        const token = session.data.session?.access_token;
        if (!active || !token) return;
        await fetch('/api/v1/reservations/reminders', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Unable to check equipment return reminders:', error);
      }
    };
    void checkReturnReminders();
    const interval = window.setInterval(() => void checkReturnReminders(), 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredReservations = useMemo(() => {
    const reservations = state.reservations ?? [];
    const base = statusFilter === 'all'
      ? reservations
      : statusFilter === 'finished'
        ? reservations.filter((item) => item.status === 'returned' || item.status === 'completed')
        : reservations.filter((item) => item.status === statusFilter);

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((item) => {
      return (
        (item.residentName || '').toLowerCase().includes(q) ||
        (item.resource || '').toLowerCase().includes(q) ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.purpose || '').toLowerCase().includes(q)
      );
    });
  }, [state.reservations, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil((filteredReservations.length ?? 0) / PAGE_SIZE));
  useEffect(() => {
    setCurrentPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReservations.slice(start, start + PAGE_SIZE);
  }, [filteredReservations, currentPage]);

  const newestRequestTimestamp = useMemo(() => {
    if (!filteredReservations.length) return null;
    return filteredReservations[0]?.createdAt || null;
  }, [filteredReservations]);

  const openReview = (reservationId: string) => {
    setSelectedId(reservationId);
    setReason('');
  };

  const closeReview = () => {
    setSelectedId(null);
    setReason('');
  };

  useEffect(() => {
    if (!selectedReservation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedReservation]);

  const updateReservationStatus = async (status: Reservation['status'], decisionReason?: string) => {
    if (!selectedReservation || processingStatus) return;
    setProcessingStatus(status);
    try {
      const supabase = getSupabaseBrowserClient();
      const session = await getSupabaseSessionSafely(supabase);
      const token = session.data.session?.access_token;

      const response = await fetch(`/api/v1/reservations/${selectedReservation.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status, reason: decisionReason }),
      });

      const result = await response.json().catch(() => null);
      if (response.ok) {
        window.dispatchEvent(new Event('eserbisyo-state-updated'));
        closeReview();
        setActionFeedback(result?.data?.emailError
          ? { tone: 'error', text: `${locale === 'fil' ? 'Na-update ang reservation pero hindi naipadala ang email' : 'Reservation updated, but the email could not be sent'}: ${result.data.emailError}` }
          : { tone: 'success', text: locale === 'fil' ? 'Matagumpay na na-update ang reservation.' : 'Reservation updated successfully.' });
      } else {
        const message = result?.error?.message ?? response.statusText;
        setActionFeedback({ tone: 'error', text: message });
        console.error('Unable to update reservation status:', message);
      }
    } catch (error) {
      console.error('Error updating reservation status:', error);
      setActionFeedback({
        tone: 'error',
        text: locale === 'fil' ? 'Hindi na-update ang reservation.' : 'Unable to update reservation.',
      });
    } finally {
      setProcessingStatus(null);
    }
  };

  const approveReservation = () => updateReservationStatus('approved');
  const declineReservation = () => updateReservationStatus('declined', reason.trim());

  const getResourceLabel = (resource: string): string => {
    const labels: Record<string, string> = {
      barangay_hall: 'Multi Purpose Hall',
      covered_court: 'Covered Court',
      service_vehicle: 'Service Vehicle',
      equipment: 'Equipment',
    };
    return labels[resource] || resource;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, Record<'en' | 'fil', string>> = {
      pending: { en: 'Pending', fil: 'Naghihintay' },
      approved: { en: 'Approved', fil: 'Aprubado' },
      declined: { en: 'Declined', fil: 'Tinanggihan' },
      cancelled: { en: 'Cancelled', fil: 'Kanselado' },
      ready_for_pickup: { en: 'Ready for Pickup', fil: 'Handa nang kunin' },
      received: { en: 'Received', fil: 'Natanggap' },
      returned: { en: 'Returned', fil: 'Naibalik' },
      completed: { en: 'Completed', fil: 'Nakumpleto' },
    };
    return labels[status]?.[locale] || status;
  };

  return (
    <PortalShell role="staff" title={pageCopy.title || 'Reservations'} description={pageCopy.description || 'Review and approve reservations'} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      {actionFeedback ? <FormFeedback tone={actionFeedback.tone} text={actionFeedback.text} /> : null}

      <SectionCard
        title={locale === 'fil' ? 'Mga Reservations' : 'Reservations'}
        description={locale === 'fil' ? 'Hanapin at suriing mga reservation' : 'Search and review reservations'}
      >
        {!(state.reservations ?? []).length ? (
          <EmptyState
            title={locale === 'fil' ? 'Walang reservations' : 'No reservations yet'}
            description={locale === 'fil' ? 'Lalabas dito ang mga papasok na reservation.' : 'Incoming reservations will appear here.'}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="grid gap-1 text-sm w-[70px] md:w-[150px] lg:w-[190px]">
                  <span className="sr-only">{locale === 'fil' ? 'Hanapin' : 'Search'}</span>
                  <Input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder={locale === 'fil' ? 'Pangalan, resource, item' : 'Name, resource, item'} />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-[color:var(--portal-ink-500)]">
                  {filteredReservations.length} {locale === 'fil' ? 'reservations' : 'reservations'} · {locale === 'fil' ? 'Nakaayos mula pinakahuling' : 'Sorted by most recent'}
                  {newestRequestTimestamp ? ` · ${locale === 'fil' ? 'Pinakahuli' : 'Latest'}: ${relativeTime(newestRequestTimestamp, locale)}` : ''}
                </p>

                <div className="inline-flex items-center gap-2">
                  <label className="sr-only">{locale === 'fil' ? 'Filter status' : 'Filter status'}</label>
                  <div className="relative">
                    <Select ref={statusSelectRef} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}>
                      <option value="all">{locale === 'fil' ? 'Lahat' : 'All'}</option>
                      <option value="pending">{locale === 'fil' ? 'Naghihintay' : 'Pending'}</option>
                      <option value="approved">{locale === 'fil' ? 'Aprubado' : 'Approved'}</option>
                      <option value="ready_for_pickup">{locale === 'fil' ? 'Handa nang kunin' : 'Ready for Pickup'}</option>
                      <option value="received">{locale === 'fil' ? 'Natanggap' : 'Received'}</option>
                      <option value="finished">{locale === 'fil' ? 'Naibalik / Nakumpleto' : 'Returned / Completed'}</option>
                      <option value="declined">{locale === 'fil' ? 'Tinanggihan' : 'Declined'}</option>
                      <option value="cancelled">{locale === 'fil' ? 'Nakansela' : 'Cancelled'}</option>
                    </Select>
                  </div>
                  <button
                    type="button"
                    aria-label={locale === 'fil' ? 'Filter' : 'Filter'}
                    onClick={() => {
                      setStatusFilter('pending');
                      setCurrentPage(1);
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
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '15%' }}>Resource</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '20%' }}>Resident</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '25%' }}>Date & Time</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '15%' }}>{locale === 'fil' ? 'Status' : 'Status'}</TableHead>
                  <TableHead className="py-2 pr-2 align-middle text-center text-sm text-[color:var(--portal-ink-700)] normal-case tracking-normal" style={{ width: '8%' }}>{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Walang resulta' : 'No matching reservations'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={`${selectedReservation?.id === item.id ? 'bg-[color:var(--portal-surface-3)]' : ''} hover:bg-transparent`}
                    >
                      <TableCell className="py-2 pr-2 text-center align-middle">
                        {item.resource === 'equipment' && item.itemName ? item.itemName : getResourceLabel(item.resource)}
                      </TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle text-sm">{item.residentName}</TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle text-sm">
                        {item.startAt && item.endAt ? (
                          <div>
                            <div>{formatDateTime(item.startAt, locale)}</div>
                            <div className="text-xs text-[color:var(--portal-ink-500)]">to {formatDateTime(item.endAt, locale)}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle">
                        <StatusBadge tone={statusToneFromState(item.status)}>{getStatusLabel(item.status)}</StatusBadge>
                      </TableCell>
                      <TableCell className="py-2 pr-2 text-center align-middle">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            type="button"
                            className="rounded-full border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] px-5 hover:bg-[color:var(--portal-surface-3)]"
                            onClick={() => openReview(item.id)}
                          >
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
                {filteredReservations.length === 0 ? '' : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredReservations.length)} of ${filteredReservations.length}`}
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

      {selectedReservation ? (
        <div
          ref={overlayRef}
          onMouseDown={(e) => {
            if (e.target === overlayRef.current) closeReview();
          }}
          className="fixed inset-0 z-[80] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4"
        >
          <section
            aria-labelledby="reservation-decision-title"
            aria-modal="true"
            className="w-full max-w-[620px] max-h-[90vh] overflow-auto rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[0_24px_70px_rgba(13,45,29,0.28)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
              <div>
                <p className="text-xs text-[color:var(--portal-ink-500)]">
                  {selectedReservation.residentName}
                </p>
                <h2 id="reservation-decision-title" className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]">
                  {locale === 'fil' ? 'Reservation Detail at Decision' : 'Reservation Detail and Decision'}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 min-h-8 px-2" onClick={closeReview} aria-label={locale === 'fil' ? 'Isara' : 'Close'}>
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-4 px-5 py-4">
              <p className="text-xs font-medium text-[color:var(--portal-ink-500)]">
                {locale === 'fil' ? 'Hinihingi' : 'Requested'}: {formatDateTime(selectedReservation.createdAt, locale)}
              </p>

              <div className="grid gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{getResourceLabel(selectedReservation.resource)}</p>
                  <StatusBadge tone={statusToneFromState(selectedReservation.status)}>{getStatusLabel(selectedReservation.status)}</StatusBadge>
                </div>
                <div className="grid gap-2 text-sm text-[color:var(--portal-ink-700)]">
                  <p>
                    <strong>{locale === 'fil' ? 'Resource' : 'Resource'}:</strong> {getResourceLabel(selectedReservation.resource)}
                  </p>
                  {selectedReservation.resource === 'equipment' && selectedReservation.itemName && (
                    <p>
                      <strong>{locale === 'fil' ? 'Item' : 'Item'}:</strong> {selectedReservation.itemName}
                      {selectedReservation.quantityRequested && ` (Qty: ${selectedReservation.quantityRequested})`}
                    </p>
                  )}
                  {selectedReservation.startAt && selectedReservation.endAt && (
                    <p>
                      <strong>{locale === 'fil' ? 'Date & Time' : 'Date & Time'}:</strong> {formatDateTime(selectedReservation.startAt, locale)} - {formatDateTime(selectedReservation.endAt, locale)}
                    </p>
                  )}
                  <p>
                    <strong>{locale === 'fil' ? 'Purpose' : 'Purpose'}:</strong> {selectedReservation.purpose}
                  </p>
                  {selectedReservation.reason && (
                    <p>
                      <strong>{locale === 'fil' ? 'Dahilan' : 'Reason'}:</strong> {selectedReservation.reason}
                    </p>
                  )}
                </div>
              </div>

              {selectedReservation.status === 'pending' ? (
                <FieldLabel
                  label={locale === 'fil' ? 'Dahilan (required kapag decline)' : 'Reason (required for decline)'}
                  hint={locale === 'fil' ? 'Hindi mae-enable ang decline kung walang dahilan.' : 'Decline is disabled until a reason is entered.'}
                >
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={locale === 'fil' ? 'Halimbawa: occupied schedule' : 'Example: occupied schedule'}
                    className="min-h-[80px]"
                  />
                </FieldLabel>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[color:var(--portal-border-soft)] px-5 py-4">
              <Button variant="ghost" type="button" disabled={processingStatus !== null} onClick={closeReview}>
                {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
              </Button>
              {selectedReservation.status === 'pending' && (
                <>
                  <Button
                    type="button"
                    disabled={processingStatus !== null}
                    className="w-full md:w-auto border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)]"
                    onClick={() => void approveReservation()}
                  >
                    {processingStatus === 'approved'
                      ? locale === 'fil' ? 'Inaaprubahan...' : 'Approving...'
                      : locale === 'fil' ? 'Aprubahan' : 'Approve'}
                  </Button>
                  <Button
                    type="button"
                    disabled={!reason.trim() || processingStatus !== null}
                    className="bg-[linear-gradient(180deg,#9f1239_0%,#7f112b_100%)] text-white px-4 py-2 shadow-[0_10px_24px_rgba(159,18,57,0.24)] hover:bg-[linear-gradient(180deg,#b91c3f_0%,#881337_100%)] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => void declineReservation()}
                  >
                    {processingStatus === 'declined'
                      ? locale === 'fil' ? 'Tinatanggihan...' : 'Declining...'
                      : locale === 'fil' ? 'I-decline' : 'Decline'}
                  </Button>
                </>
              )}
              {selectedReservation.status === 'approved' && selectedReservation.resource === 'equipment' ? (
                <Button type="button" variant="resident" disabled={processingStatus !== null} onClick={() => void updateReservationStatus('ready_for_pickup')}>
                  {processingStatus === 'ready_for_pickup'
                    ? locale === 'fil' ? 'Minamarkahang handa na...' : 'Marking ready...'
                    : locale === 'fil' ? 'Markahan bilang Ready for Pickup' : 'Mark Ready for Pickup'}
                </Button>
              ) : null}
              {selectedReservation.status === 'approved' && selectedReservation.resource !== 'equipment' ? (
                <Button type="button" variant="resident" disabled={processingStatus !== null} onClick={() => void updateReservationStatus('completed')}>
                  {processingStatus === 'completed'
                    ? locale === 'fil' ? 'Kinukumpleto...' : 'Completing...'
                    : locale === 'fil' ? 'Markahan bilang Nakumpleto' : 'Mark as Completed'}
                </Button>
              ) : null}
              {selectedReservation.status === 'ready_for_pickup' && selectedReservation.resource === 'equipment' ? (
                <Button type="button" variant="resident" disabled={processingStatus !== null} onClick={() => void updateReservationStatus('received')}>
                  {processingStatus === 'received'
                    ? locale === 'fil' ? 'Minamarkahang natanggap...' : 'Marking received...'
                    : locale === 'fil' ? 'Markahan bilang Natanggap' : 'Mark as Received'}
                </Button>
              ) : null}
              {selectedReservation.status === 'received' && selectedReservation.resource === 'equipment' ? (
                <Button type="button" variant="resident" disabled={processingStatus !== null} onClick={() => void updateReservationStatus('returned')}>
                  {processingStatus === 'returned'
                    ? locale === 'fil' ? 'Minamarkahang naibalik...' : 'Marking returned...'
                    : locale === 'fil' ? 'Markahan bilang Naibalik' : 'Mark as Returned'}
                </Button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
