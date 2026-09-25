'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FormFeedback, InfoNotice, PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/formatters';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { ResidentEmpty, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import type { Equipment, Reservation } from '@/lib/types/models';

const DRAFT_KEY = 'eserbisyo.draft.reservation';

type ResourceType = 'barangay_hall' | 'covered_court' | 'equipment' | 'service_vehicle';
const RESOURCES: { id: ResourceType; label: Record<'en' | 'fil', string> }[] = [
  { id: 'barangay_hall', label: { en: 'Multi Purpose Hall', fil: 'Multi Purpose Hall' } },
  { id: 'covered_court', label: { en: 'Covered Court', fil: 'Covered Court' } },
  { id: 'service_vehicle', label: { en: 'Service Vehicle', fil: 'Service Vehicle' } },
  { id: 'equipment', label: { en: 'Equipment (Borrow)', fil: 'Equipment (Borrow)' } },
];

export default function ResidentReservationsPage() {
  const { state, user, locale } = useAppState();
  const [selectedResource, setSelectedResource] = useState<ResourceType | ''>('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [purpose, setPurpose] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelReservationId, setCancelReservationId] = useState<string | null>(null);
  const [isCancellingReservation, setIsCancellingReservation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reservationStatusFilter, setReservationStatusFilter] = useState<'all' | Reservation['status']>('all');

  const reservations = useMemo(
    () => (state.reservations || []).filter((reservation) => reservation.residentId === user?.id),
    [state.reservations, user?.id]
  );
  const visibleReservations = useMemo(() => {
    const matching = reservationStatusFilter === 'all'
      ? reservations
      : reservations.filter((reservation) => reservation.status === reservationStatusFilter);
    return [...matching].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  }, [reservations, reservationStatusFilter]);

  useEffect(() => {
    let cancelled = false;

    const loadEquipment = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const session = await getSupabaseSessionSafely(supabase);
        const token = session.data.session?.access_token;
        const response = await fetch('/api/v1/equipment', {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        const data = (await response.json().catch(() => null)) as { equipment?: Equipment[] } | null;
        if (!cancelled && data?.equipment) {
          setEquipment(data.equipment.filter((e) => !e.isDeleted));
        }
      } catch (error) {
        console.error('Failed to load equipment:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadEquipment();

    const handleStateUpdate = () => {
      void loadEquipment();
    };

    window.addEventListener('eserbisyo-state-updated', handleStateUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('eserbisyo-state-updated', handleStateUpdate);
    };
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        resource?: ResourceType;
        equipmentId?: string;
        quantity?: number;
        startAt?: string;
        endAt?: string;
        purpose?: string;
      };
      setSelectedResource(draft.resource || '');
      setSelectedEquipmentId(draft.equipmentId || '');
      setQuantity(draft.quantity || 1);
      setStartAt(draft.startAt || '');
      setEndAt(draft.endAt || '');
      setPurpose(draft.purpose || '');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ selectedResource, selectedEquipmentId, quantity, startAt, endAt, purpose }));
  }, [selectedResource, selectedEquipmentId, quantity, startAt, endAt, purpose]);

  const selectedEquipmentItem = useMemo(
    () => equipment.find((e) => e.id === selectedEquipmentId),
    [equipment, selectedEquipmentId]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedResource) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Please select a resource type', 'Pumili ng uri ng resource'),
      });
      return;
    }

    if (!startAt || !endAt) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Please select start and end times', 'Pumili ng start at end time'),
      });
      return;
    }

    if (!purpose.trim()) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Please provide a purpose', 'Magbigay ng layunin'),
      });
      return;
    }

    if (selectedResource === 'equipment') {
      if (!selectedEquipmentId) {
        setFeedback({
          tone: 'error',
          text: copyText(locale, 'Please select equipment to borrow', 'Pumili ng equipment'),
        });
        return;
      }

      if (quantity < 1) {
        setFeedback({
          tone: 'error',
          text: copyText(locale, 'Quantity must be at least 1', 'Minimum 1 ang quantity'),
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const session = await getSupabaseSessionSafely(supabase);
      const token = session.data.session?.access_token;

      const response = await fetch('/api/v1/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serviceType: selectedResource,
          itemName: selectedEquipmentId ? selectedEquipmentItem?.name : undefined,
          quantityRequested: selectedResource === 'equipment' ? quantity : 1,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          notes: purpose,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { success: true; data: Reservation }
        | { success: false; code?: string; message?: string; error?: { code?: string; message?: string } }
        | null;

      if (!response.ok || !result || !result.success) {
        const errorResult = result && !result.success ? result : null;
        const errorMsg = errorResult?.message || errorResult?.error?.message || 'Failed to create reservation';
        setFeedback({
          tone: 'error',
          text: copyText(locale, `Error: ${errorMsg}`, `Error: ${errorMsg}`),
        });
        return;
      }

      try {
        window.localStorage.setItem('eserbisyo-state-updated-at', String(Date.now()));
      } catch {
        // Ignore storage failures; the current tab already updated.
      }
      window.dispatchEvent(new Event('eserbisyo-state-updated'));

      setPurpose('');
      setSelectedResource('');
      setSelectedEquipmentId('');
      setQuantity(1);
      setStartAt('');
      setEndAt('');
      window.localStorage.removeItem(DRAFT_KEY);

      setFeedback({
        tone: 'success',
        text: copyText(
          locale,
          `Reservation submitted successfully. Reference: ${result.data.id}`,
          `Matagumpay na naisumite ang reservation. Reference: ${result.data.id}`
        ),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setFeedback({
        tone: 'error',
        text: copyText(locale, `Failed: ${errorMsg}`, `Failed: ${errorMsg}`),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    setIsCancellingReservation(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const session = await getSupabaseSessionSafely(supabase);
      const token = session.data.session?.access_token;

      const response = await fetch(`/api/v1/reservations/${reservationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          text: copyText(locale, 'Failed to cancel reservation', 'Hindi nakansel ang reservation'),
        });
        return;
      }

      setCancelReservationId(null);
      window.dispatchEvent(new Event('eserbisyo-state-updated'));

      setFeedback({
        tone: 'success',
        text: copyText(locale, 'Reservation cancelled', 'Nakansel ang reservation'),
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Error cancelling reservation', 'Error sa pagkansela'),
      });
    } finally {
      setIsCancellingReservation(false);
    }
  };

  const getResourceLabel = (resource: string): string => {
    const item = RESOURCES.find((r) => r.id === resource);
    return item?.label[locale] || resource;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, Record<'en' | 'fil', string>> = {
      pending: { en: 'Pending Review', fil: 'Naghihintay ng Review' },
      approved: { en: 'Approved', fil: 'Approved' },
      declined: { en: 'Declined', fil: 'Declined' },
      cancelled: { en: 'Cancelled', fil: 'Cancelled' },
      ready_for_pickup: { en: 'Ready for Pickup', fil: 'Handa nang kunin' },
      returned: { en: 'Returned', fil: 'Naibalik' },
      completed: { en: 'Completed', fil: 'Nakumpleto' },
    };
    return labels[status]?.[locale] || status;
  };

  return (
    <ResidentShell title={copyText(locale, 'Reservations', 'Reservations')} description={copyText(locale, 'Reserve facilities, vehicles, and equipment', 'Reserve facilities, vehicles, at equipment')} showHero={false}>
      <ResidentSection
        title={copyText(locale, 'Make a Reservation', 'Gumawa ng Reservation')}
        tone="accent"
      >
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-3 text-sm">
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'Resource Type', 'Tipo ng Resource')}</span>
              <Select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value as ResourceType)}
                required
              >
                <option value="">{copyText(locale, 'Select resource...', 'Pumili ng resource...')}</option>
                {RESOURCES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label[locale]}
                  </option>
                ))}
              </Select>
            </label>

            {selectedResource === 'equipment' && (
              <label className="grid gap-3 text-sm">
                <span className="font-medium text-[color:#123726]">{copyText(locale, 'Equipment', 'Equipment')}</span>
                <Select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  required={selectedResource === 'equipment'}
                >
                  <option value="">{copyText(locale, 'Select equipment...', 'Pumili ng equipment...')}</option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} (Available: {eq.quantity})
                    </option>
                  ))}
                </Select>
              </label>
            )}
          </div>

          {selectedResource === 'equipment' && selectedEquipmentItem && (
            <label className="grid gap-3 text-sm">
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'Quantity', 'Dami')}</span>
              <Input
                type="number"
                min="1"
                max={selectedEquipmentItem.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
              <span className="text-xs text-[color:#456453]">
                {copyText(locale, `Max available: ${selectedEquipmentItem.quantity}`, `Max available: ${selectedEquipmentItem.quantity}`)}
              </span>
            </label>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-3 text-sm">
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'Start Date & Time', 'Start Date & Time')}</span>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-3 text-sm">
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'End Date & Time', 'End Date & Time')}</span>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="grid gap-3 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Purpose', 'Layunin')}</span>
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="submit"
              variant="resident"
              disabled={isSubmitting}
              className="h-11 min-w-[200px] px-6 text-base"
            >
              {isSubmitting ? copyText(locale, 'Submitting...', 'Ipinapadala...') : copyText(locale, 'Submit Reservation', 'Ipadala ang Reservation')}
            </Button>
          </div>
        </form>

        {feedback ? <div className="mt-4"><FormFeedback tone={feedback.tone} text={feedback.text} /></div> : null}
      </ResidentSection>

      <ResidentSection
        title={copyText(locale, 'My Reservations', 'Mga Reservation Ko')}
        description={copyText(locale, 'Track your facility and equipment reservations by status.', 'Subaybayan ang status ng mga reservation mo sa pasilidad at equipment.')}
        actions={(
          <label className="grid w-full gap-1 text-sm sm:w-[220px]">
            <span className="sr-only">{copyText(locale, 'Sort reservations by status', 'I-filter ang reservation ayon sa status')}</span>
            <Select
              value={reservationStatusFilter}
              onChange={(event) => setReservationStatusFilter(event.target.value as 'all' | Reservation['status'])}
              aria-label={copyText(locale, 'Filter reservations by status', 'I-filter ang reservation ayon sa status')}
            >
              <option value="all">{copyText(locale, 'All reservations', 'Lahat ng reservation')}</option>
              <option value="pending">{copyText(locale, 'Pending', 'Naghihintay')}</option>
              <option value="approved">{copyText(locale, 'Approved', 'Aprubado')}</option>
              <option value="ready_for_pickup">{copyText(locale, 'Ready for Pickup', 'Handa nang kunin')}</option>
              <option value="returned">{copyText(locale, 'Returned', 'Naibalik')}</option>
              <option value="completed">{copyText(locale, 'Completed', 'Nakumpleto')}</option>
              <option value="declined">{copyText(locale, 'Declined', 'Tinanggihan')}</option>
              <option value="cancelled">{copyText(locale, 'Cancelled', 'Nakansela')}</option>
            </Select>
          </label>
        )}
        className="bg-white"
      >
        {!visibleReservations.length ? (
          <ResidentEmpty
            title={copyText(locale, 'No reservations found', 'Walang reservation na nakita')}
            description={copyText(locale, 'Your submitted reservations will appear here.', 'Lalabas dito ang mga naisumite mong reservation.')}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{copyText(locale, 'Resource', 'Resource')}</TableHead>
                  <TableHead className="text-center">{copyText(locale, 'Date & Time', 'Petsa at Oras')}</TableHead>
                  <TableHead className="text-center">{copyText(locale, 'Purpose', 'Layunin')}</TableHead>
                  <TableHead className="text-center">{copyText(locale, 'Status', 'Status')}</TableHead>
                  <TableHead className="text-center">{copyText(locale, 'Action', 'Aksyon')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReservations.map((reservation) => (
                  <TableRow key={reservation.id} className="hover:bg-transparent">
                    <TableCell className="text-center">
                      <p className="font-medium">{getResourceLabel(reservation.resource)}</p>
                      {reservation.itemName ? <p className="text-xs text-[color:#456453]">{reservation.itemName}{reservation.quantityRequested ? ` × ${reservation.quantityRequested}` : ''}</p> : null}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <p>{formatDateTime(reservation.startAt, locale)}</p>
                      <p className="text-xs text-[color:#456453]">{copyText(locale, 'to', 'hanggang')} {formatDateTime(reservation.endAt, locale)}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-center" title={reservation.purpose || ''}>{reservation.purpose || '—'}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge tone={statusToneFromState(reservation.status)}>{getStatusLabel(reservation.status)}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-center">
                      {reservation.status === 'pending' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-[color:var(--portal-ink-700)] hover:text-[color:var(--portal-ink-900)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCancelReservationId(reservation.id);
                          }}
                        >
                          {copyText(locale, 'Cancel Request', 'Kanselahin ang Request')}
                        </Button>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ResidentSection>
      <Dialog
        open={cancelReservationId !== null}
        onOpenChange={(open) => {
          if (!open && !isCancellingReservation) setCancelReservationId(null);
        }}
      >
        <DialogContent className="gap-8 p-8 sm:max-w-md">
          <DialogHeader className="items-center space-y-5 text-center">
            <DialogTitle>{copyText(locale, 'Cancel this reservation?', 'Kanselahin ang reservation?')}</DialogTitle>
            <DialogDescription className="mx-auto max-w-sm text-center leading-relaxed">
              {copyText(locale, 'Are you sure you want to cancel this reservation request?', 'Sigurado ka bang gusto mong kanselahin ang reservation request na ito?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="items-center justify-center gap-3 sm:flex-row sm:justify-center sm:space-x-0">
            <Button type="button" variant="ghost" className="min-w-32" disabled={isCancellingReservation} onClick={() => setCancelReservationId(null)}>
              {copyText(locale, 'No', 'Hindi')}
            </Button>
            <Button
              type="button"
              variant="resident"
              className="min-w-32"
              disabled={isCancellingReservation}
              onClick={() => {
                if (cancelReservationId) void handleCancelReservation(cancelReservationId);
              }}
            >
              {isCancellingReservation ? copyText(locale, 'Cancelling...', 'Kinakansela...') : copyText(locale, 'Yes', 'Oo')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResidentShell>
  );
}
