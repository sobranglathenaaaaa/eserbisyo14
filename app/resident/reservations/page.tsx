'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FormFeedback, InfoNotice, PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/formatters';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { ResidentEmpty, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import type { Reservation } from '@/lib/types/models';

const DRAFT_KEY = 'eserbisyo.draft.reservation';

interface Equipment {
  id: string;
  name: string;
  quantity: number;
}

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
  const [isLoading, setIsLoading] = useState(true);

  const reservations = useMemo(() => state.reservations || [], [state.reservations]);

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
          setEquipment(data.equipment.filter((e) => !e.is_deleted));
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

      if (!response.ok || !result?.success) {
        const errorMsg = result?.message || result?.error?.message || 'Failed to create reservation';
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
    if (!window.confirm(copyText(locale, 'Cancel this reservation?', 'Kanselahin ang reservation?'))) {
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const session = await getSupabaseSessionSafely(supabase);
      const token = session.data.session?.access_token;

      const response = await fetch(`/api/v1/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          text: copyText(locale, 'Failed to cancel reservation', 'Hindi nakansel ang reservation'),
        });
        return;
      }

      setFeedback({
        tone: 'success',
        text: copyText(locale, 'Reservation cancelled', 'Nakansel ang reservation'),
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Error cancelling reservation', 'Error sa pagkansela'),
      });
    }
  };

  const getResourceLabel = (resource: ResourceType): string => {
    const item = RESOURCES.find((r) => r.id === resource);
    return item?.label[locale] || resource;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, Record<'en' | 'fil', string>> = {
      pending: { en: 'Pending Review', fil: 'Naghihintay ng Review' },
      approved: { en: 'Approved', fil: 'Approved' },
      declined: { en: 'Declined', fil: 'Declined' },
      cancelled: { en: 'Cancelled', fil: 'Cancelled' },
    };
    return labels[status]?.[locale] || status;
  };

  const activeReservations = reservations.filter((r) => r.status === 'pending' || r.status === 'approved');
  const completedReservations = reservations.filter((r) => r.status === 'declined' || r.status === 'cancelled');

  return (
    <ResidentShell title={copyText(locale, 'Reservations', 'Reservations')} description={copyText(locale, 'Reserve facilities, vehicles, and equipment', 'Reserve facilities, vehicles, at equipment')} showHero={false}>
      <ResidentSection
        title={copyText(locale, 'Make a Reservation', 'Gumawa ng Reservation')}
        tone="accent"
      >
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-3 text-sm">
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'Resource Type *', 'Tipo ng Resource *')}</span>
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
                <span className="font-medium text-[color:#123726]">{copyText(locale, 'Equipment *', 'Equipment *')}</span>
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
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'Quantity *', 'Dami *')}</span>
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
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'Start Date & Time *', 'Start Date & Time *')}</span>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-3 text-sm">
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'End Date & Time *', 'End Date & Time *')}</span>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="grid gap-3 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Purpose *', 'Layunin *')}</span>
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
        title={copyText(locale, 'Your Reservations', 'Ang Iyong Reservations')}
        description={copyText(locale, 'View the status of your reservation requests', 'Tingnan ang status ng requests')}
      >
        {isLoading ? (
          <div className="text-center text-sm text-[color:#456453]">
            {copyText(locale, 'Loading...', 'Loading...')}
          </div>
        ) : !reservations.length ? (
          <ResidentEmpty
            title={copyText(locale, 'No reservations yet', 'Walang reservations pa')}
            description={copyText(locale, 'Create your first reservation above', 'Gumawa ng first reservation sa itaas')}
          />
        ) : (
          <div className="grid gap-3">
            {activeReservations.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[color:#123726]">
                  {copyText(locale, 'Active Reservations', 'Active Reservations')}
                </h3>
                <div className="grid gap-3">
                  {activeReservations.map((res) => (
                    <Card key={res.id} className="rounded-xl border-[color:#d2e5da] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[color:#123726]">{getResourceLabel(res.resource)}</p>
                            <StatusBadge status={res.status} tone={statusToneFromState(res.status)} label={getStatusLabel(res.status)} />
                          </div>
                          {res.itemName && <p className="mt-2 text-xs text-[color:#456453]">Item: {res.itemName}{res.quantityRequested ? ` (x${res.quantityRequested})` : ''}</p>}
                          {res.startAt && res.endAt && (
                            <p className="mt-1 text-xs text-[color:#456453]">
                              {formatDateTime(res.startAt, locale)} - {formatDateTime(res.endAt, locale)}
                            </p>
                          )}
                          <p className="mt-2 text-sm text-[color:#456453]">{res.purpose}</p>
                        </div>
                        {res.status === 'pending' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="residentOutline"
                            onClick={() => handleCancelReservation(res.id)}
                          >
                            {copyText(locale, 'Cancel', 'Kanselahin')}
                          </Button>
                        )}
                      </div>
                      {res.reason && res.status === 'declined' && (
                        <div className="mt-3 rounded-lg bg-[#fee4e2] p-3 text-xs text-[#c41c00]">
                          <p className="font-medium">{copyText(locale, 'Reason:', 'Dahilan:')}</p>
                          <p>{res.reason}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {completedReservations.length > 0 && (
              <div>
                <h3 className="mb-3 mt-6 text-sm font-semibold text-[color:#123726]">
                  {copyText(locale, 'Completed', 'Completed')}
                </h3>
                <div className="grid gap-3">
                  {completedReservations.map((res) => (
                    <Card key={res.id} className="rounded-xl border-[color:#e0e0e0] bg-[color:#f5f5f5] p-4 opacity-75">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[color:#456453]">{getResourceLabel(res.resource)}</p>
                            <StatusBadge status={res.status} tone={statusToneFromState(res.status)} label={getStatusLabel(res.status)} />
                          </div>
                          {res.itemName && <p className="mt-2 text-xs text-[color:#888]">Item: {res.itemName}</p>}
                          <p className="mt-2 text-sm text-[color:#888]">{res.purpose}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ResidentSection>
    </ResidentShell>
  );
}
