'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
} from 'lucide-react';
import { FormFeedback, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
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

interface AvailabilitySlot {
  id: string;
  resource: string;
  item_name?: string;
  quantity_requested?: number;
  start_at: string;
  end_at: string;
  status: 'pending' | 'approved' | 'ready_for_pickup' | 'received';
}

function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ResidentReservationsPage() {
  const { state, locale } = useAppState();
  const user = state.users.find((item) => item.id === state.session?.userId);
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
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [reservationStatusFilter, setReservationStatusFilter] = useState<'all' | Reservation['status'] | 'finished'>('all');
  const [reservationsPage, setReservationsPage] = useState(1);
  const [cancelReservationId, setCancelReservationId] = useState<string | null>(null);
  const [isCancellingReservation, setIsCancellingReservation] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const reservations = useMemo(
    () => (state.reservations || []).filter((reservation) => reservation.residentId === user?.id),
    [state.reservations, user?.id]
  );
  const visibleReservations = useMemo(() => {
    const matching = reservationStatusFilter === 'all'
      ? reservations
      : reservationStatusFilter === 'finished'
        ? reservations.filter((reservation) => reservation.status === 'returned' || reservation.status === 'completed')
        : reservations.filter((reservation) => reservation.status === reservationStatusFilter);
    return [...matching].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  }, [reservations, reservationStatusFilter]);
  const reservationsPerPage = 10;
  const reservationsPageCount = Math.max(1, Math.ceil(visibleReservations.length / reservationsPerPage));
  const paginatedReservations = useMemo(
    () => visibleReservations.slice((reservationsPage - 1) * reservationsPerPage, reservationsPage * reservationsPerPage),
    [visibleReservations, reservationsPage]
  );

  useEffect(() => {
    setReservationsPage((page) => Math.min(page, reservationsPageCount));
  }, [reservationsPageCount]);

  const loadEquipmentAndAvailability = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const session = await getSupabaseSessionSafely(supabase);
      const token = session.data.session?.access_token;
      const headers: HeadersInit = token ? { authorization: `Bearer ${token}` } : {};

      const [equipRes, availRes] = await Promise.all([
        fetch('/api/v1/equipment', { headers }),
        fetch('/api/v1/reservations/availability', { headers }),
      ]);

      const equipData = (await equipRes.json().catch(() => null)) as {
        success?: boolean;
        data?: { equipment?: Array<{ id: string; name: string; quantity: number; is_deleted?: boolean }> };
      } | null;
      if (equipData?.success && equipData.data?.equipment) {
        setEquipment(equipData.data.equipment
          .filter((item) => !item.is_deleted)
          .map((item) => ({
            id: item.id,
            name: item.name,
            quantity: Number(item.quantity ?? 0),
            isDeleted: Boolean(item.is_deleted),
            updatedAt: '',
          })));
      }

      const availData = (await availRes.json().catch(() => null)) as {
        success?: boolean;
        data?: { availability?: AvailabilitySlot[] };
      } | null;
      if (availData?.success && availData.data?.availability) {
        setAvailability(availData.data.availability);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEquipmentAndAvailability();

    const handleStateUpdate = () => {
      void loadEquipmentAndAvailability();
    };

    window.addEventListener('eserbisyo-state-updated', handleStateUpdate);
    return () => {
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
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ selectedResource, selectedEquipmentId, quantity, startAt, endAt, purpose })
    );
  }, [selectedResource, selectedEquipmentId, quantity, startAt, endAt, purpose]);

  const selectedEquipmentItem = useMemo(
    () => equipment.find((e) => e.id === selectedEquipmentId),
    [equipment, selectedEquipmentId]
  );

  const getResourceLabel = (resource: string): string => {
    const item = RESOURCES.find((r) => r.id === resource);
    return item?.label[locale] || resource;
  };

  // Show all availability slots if no resource is selected yet, or filter when a resource is selected
  const filteredAvailability = useMemo(() => {
    if (!selectedResource) return availability;
    return availability.filter((slot) => {
      if (slot.resource !== selectedResource) return false;
      if (selectedResource === 'equipment' && selectedEquipmentItem) {
        return slot.item_name?.toLowerCase() === selectedEquipmentItem.name.toLowerCase();
      }
      return true;
    });
  }, [availability, selectedResource, selectedEquipmentItem]);

  const todayIso = useMemo(() => formatDateIso(new Date()), []);
  const weekHeaders = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale === 'fil' ? 'fil-PH' : 'en-US', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 0, 7 + index)));
  }, [locale]);

  // Calendar Grid Generator
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dateIso: string;
      isPast: boolean;
      slots: AvailabilitySlot[];
    }> = [];

    // Leading padding days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      const dateIso = formatDateIso(date);
      days.push({
        date,
        isCurrentMonth: false,
        dateIso,
        isPast: true,
        slots: [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateIso = formatDateIso(date);
      const isPast = dateIso < todayIso;

      const startOfDay = new Date(year, month, day, 0, 0, 0).getTime();
      const endOfDay = new Date(year, month, day, 23, 59, 59).getTime();

      const daySlots = filteredAvailability.filter((slot) => {
        const slotStart = new Date(slot.start_at).getTime();
        const slotEnd = new Date(slot.end_at).getTime();
        return slotStart <= endOfDay && slotEnd >= startOfDay;
      });

      days.push({
        date,
        isCurrentMonth: true,
        dateIso,
        isPast,
        slots: daySlots,
      });
    }

    // Trailing padding days for next month to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      const dateIso = formatDateIso(date);
      days.push({
        date,
        isCurrentMonth: false,
        dateIso,
        isPast: false,
        slots: [],
      });
    }

    return days;
  }, [calendarMonth, filteredAvailability, todayIso]);

  const startDateStr = useMemo(() => (startAt ? startAt.slice(0, 10) : ''), [startAt]);
  const endDateStr = useMemo(() => (endAt ? endAt.slice(0, 10) : ''), [endAt]);

  const handleDateClick = (dayObj: { date: Date; isCurrentMonth: boolean; isPast: boolean; slots: AvailabilitySlot[] }) => {
    if (!dayObj.isCurrentMonth || dayObj.isPast) return;

    const approvedSlots = dayObj.slots.filter((s) => s.status === 'approved');
    if (approvedSlots.length > 0) {
      setFeedback({
        tone: 'error',
        text: copyText(
          locale,
          'This date is fully booked (Approved) and cannot be reserved.',
          'Ang petsang ito ay naka-book na (Approved) at hindi na puwedeng i-reserve.'
        ),
      });
      return;
    }

    const newDateStr = formatDateIso(dayObj.date);

    let startTime = '08:00';
    if (startAt && startAt.includes('T')) {
      const parts = startAt.split('T');
      if (parts[1]) startTime = parts[1];
    }

    let endTime = '17:00';
    if (endAt && endAt.includes('T')) {
      const parts = endAt.split('T');
      if (parts[1]) endTime = parts[1];
    }

    // Range Selection logic with Solid Dark Emerald (#123726) badge:
    if (!startDateStr || (startDateStr && endDateStr && startDateStr !== endDateStr)) {
      setStartAt(`${newDateStr}T${startTime}`);
      setEndAt(`${newDateStr}T${endTime}`);
    } else if (startDateStr && (!endDateStr || startDateStr === endDateStr)) {
      if (newDateStr >= startDateStr) {
        setEndAt(`${newDateStr}T${endTime}`);
      } else {
        setStartAt(`${newDateStr}T${startTime}`);
        setEndAt(`${newDateStr}T${endTime}`);
      }
    }

    const pendingSlots = dayObj.slots.filter((s) => s.status === 'pending');
    if (pendingSlots.length > 0) {
      setFeedback({
        tone: 'info',
        text: copyText(
          locale,
          `Date selected: ${newDateStr}. Note: There is a pending request for this date under review.`,
          `Napingot na petsa: ${newDateStr}. Paalala: May pending request sa petsang ito na sinusuri pa.`
        ),
      });
    } else {
      setFeedback({
        tone: 'info',
        text: copyText(
          locale,
          `Date selected: ${newDateStr}. You can adjust start and end times on the left panel.`,
          `Napingot na petsa: ${newDateStr}. Maaari mong i-adjust ang oras sa kaliwang panel.`
        ),
      });
    }
  };

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

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

    const startDateOnly = startAt.slice(0, 10);
    if (startDateOnly < todayIso) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Cannot reserve past dates', 'Hindi puwedeng mag-reserve sa nakalipas na petsa'),
      });
      return;
    }

    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();

    if (endMs <= startMs) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'End time must be after start time', 'Dapat mas huli ang end time kaysa start time'),
      });
      return;
    }

    const hasApprovedOverlap = filteredAvailability.some((slot) => {
      if (!['approved', 'ready_for_pickup', 'received'].includes(slot.status)) return false;
      const slotStart = new Date(slot.start_at).getTime();
      const slotEnd = new Date(slot.end_at).getTime();
      return slotStart < endMs && slotEnd > startMs;
    });

    if (hasApprovedOverlap) {
      setFeedback({
        tone: 'error',
        text: copyText(
          locale,
          'Selected date and time conflicts with an approved reservation.',
          'Ang napiling petsa at oras ay tumatama sa naka-book (Approved) na reservation.'
        ),
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
        // Ignore storage failures
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

      void loadEquipmentAndAvailability();
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
      window.dispatchEvent(new Event('eserbisyo-state-updated'));
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Error cancelling reservation', 'Error sa pagkansela'),
      });
    } finally {
      setIsCancellingReservation(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, Record<'en' | 'fil', string>> = {
      pending: { en: 'Pending Review', fil: 'Naghihintay ng Review' },
      approved: { en: 'Approved', fil: 'Approved' },
      declined: { en: 'Declined', fil: 'Declined' },
      cancelled: { en: 'Cancelled', fil: 'Cancelled' },
      ready_for_pickup: { en: 'Ready for Pickup', fil: 'Handa nang kunin' },
      received: { en: 'Received', fil: 'Natanggap' },
      returned: { en: 'Returned', fil: 'Naibalik' },
      completed: { en: 'Completed', fil: 'Nakumpleto' },
    };
    return labels[status]?.[locale] || status;
  };

  return (
    <ResidentShell
      title={copyText(locale, 'Facility & Resource Reservations', 'Reservations ng Pasilidad at Kagamitan')}
      description={copyText(
        locale,
        'Reserve facilities, vehicles, and equipment with live availability schedule',
        'Mag-reserve ng mga pasilidad, sasakyan, at kagamitan gamit ang live availability calendar'
      )}
      showHero={false}
    >
      <ResidentSection
        title={copyText(locale, 'Make a Reservation', 'Gumawa ng Reservation')}
        tone="accent"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Main Top Grid: Left Panel & Right Panel matched in height */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* LEFT PANEL: Resource, Equipment, & Schedule Inputs */}
            <div className="lg:col-span-5 space-y-3.5 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[color:rgba(18,55,38,0.14)] shadow-sm flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-[color:rgba(18,55,38,0.12)]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[color:#1d7a53] text-white font-bold text-xs shadow-sm">
                    1
                  </span>
                  <h3 className="font-bold text-[color:#123726] text-sm sm:text-base">
                    {copyText(locale, 'Resource & Schedule', 'Resource at Iskedyul')}
                  </h3>
                </div>

                {/* Resource Type */}
                <label className="grid gap-1.5 text-xs sm:text-sm">
                  <span className="font-semibold text-[color:#123726]">
                    {copyText(locale, 'Resource Type', 'Uri ng Resource')}
                  </span>
                  <Select
                    value={selectedResource}
                    onChange={(e) => {
                      setSelectedResource(e.target.value as ResourceType);
                      setSelectedEquipmentId('');
                    }}
                    required
                    className="h-10 text-xs sm:text-sm border-[color:rgba(18,55,38,0.22)] focus:ring-2 focus:ring-[color:#1d7a53]"
                  >
                    <option value="">{copyText(locale, 'Select resource...', 'Pumili ng resource...')}</option>
                    {RESOURCES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label[locale]}
                      </option>
                    ))}
                  </Select>
                </label>

                {/* Equipment Options (Conditional) */}
                {selectedResource === 'equipment' && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
                    <label className="grid gap-1.5 text-xs sm:text-sm">
                      <span className="font-semibold text-[color:#123726]">
                        {copyText(locale, 'Equipment Item', 'Kagamitan')}
                      </span>
                      <Select
                        value={selectedEquipmentId}
                        onChange={(e) => setSelectedEquipmentId(e.target.value)}
                        required={selectedResource === 'equipment'}
                        className="bg-white h-9 text-xs sm:text-sm"
                      >
                        <option value="">{copyText(locale, 'Select equipment...', 'Pumili ng equipment...')}</option>
                        {equipment.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} ({copyText(locale, `Available: ${eq.quantity}`, `Available: ${eq.quantity}`)})
                          </option>
                        ))}
                      </Select>
                    </label>

                    {selectedEquipmentItem && (
                      <label className="grid gap-1 text-xs sm:text-sm">
                        <span className="font-semibold text-[color:#123726]">
                          {copyText(locale, 'Quantity', 'Dami')}
                        </span>
                        <Input
                          type="number"
                          min="1"
                          max={selectedEquipmentItem.quantity}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          required
                          className="bg-white h-9 text-xs sm:text-sm"
                        />
                        <span className="text-[11px] text-[color:#3d5e4d] font-medium">
                          {copyText(
                            locale,
                            `Max stock: ${selectedEquipmentItem.quantity}`,
                            `Maksimum: ${selectedEquipmentItem.quantity}`
                          )}
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* Start Date & Time */}
                <label className="grid gap-1.5 text-xs sm:text-sm">
                  <span className="font-semibold text-[color:#123726]">
                    {copyText(locale, 'Start Date & Time', 'Petsa at Oras ng Simula')}
                  </span>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    min={`${todayIso}T00:00`}
                    required
                    className="h-10 text-xs sm:text-sm border-[color:rgba(18,55,38,0.22)] focus:ring-2 focus:ring-[color:#1d7a53]"
                  />
                </label>

                {/* End Date & Time */}
                <label className="grid gap-1.5 text-xs sm:text-sm">
                  <span className="font-semibold text-[color:#123726]">
                    {copyText(locale, 'End Date & Time', 'Petsa at Oras ng Pagtatapos')}
                  </span>
                  <Input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    min={`${todayIso}T00:00`}
                    required
                    className="h-10 text-xs sm:text-sm border-[color:rgba(18,55,38,0.22)] focus:ring-2 focus:ring-[color:#1d7a53]"
                  />
                </label>
              </div>

              <div className="p-2.5 rounded-xl bg-[color:rgba(29,122,82,0.06)] border border-[color:rgba(29,122,82,0.18)] text-[11px] sm:text-xs text-[color:#1b4a36] flex items-start gap-2 mt-2">
                <Info className="w-3.5 h-3.5 shrink-0 text-[color:#1d7a53] mt-0.5" />
                <span>
                  {copyText(
                    locale,
                    'Tip: Click start date then end date on the calendar to set your date range.',
                    'Tip: I-click ang simula at katapusang petsa sa kalendaryo para sa date range.'
                  )}
                </span>
              </div>
            </div>

            {/* RIGHT PANEL: Compact Height Availability Calendar matching Left Panel */}
            <div className="lg:col-span-7 space-y-3 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[color:rgba(18,55,38,0.14)] shadow-sm flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[color:rgba(18,55,38,0.12)]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[color:#1d7a53] text-white font-bold text-xs shadow-sm">
                      2
                    </span>
                    <div>
                      <h3 className="font-bold text-[color:#123726] text-sm sm:text-base leading-tight">
                        {copyText(locale, 'Availability Calendar', 'Kalendaryo ng Availability')}
                      </h3>
                    </div>
                  </div>

                  {selectedResource ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[color:#124731] border border-emerald-300">
                      {getResourceLabel(selectedResource)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {copyText(locale, 'All Resources', 'Lahat ng Resource')}
                    </span>
                  )}
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between bg-[color:rgba(29,122,82,0.05)] px-3 py-1.5 rounded-xl border border-[color:rgba(29,122,82,0.12)]">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-white text-[color:#123726] transition-colors border border-transparent hover:border-emerald-200"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="font-bold text-xs sm:text-sm text-[color:#123726] capitalize flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-[color:#1d7a53]" />
                    {calendarMonth.toLocaleDateString(locale === 'fil' ? 'fil-PH' : 'en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-white text-[color:#123726] transition-colors border border-transparent hover:border-emerald-200"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-[color:#173928]">
                  {weekHeaders.map((dayName, idx) => (
                    <div key={`${dayName}-${idx}`} className="py-0.5">
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Compact Calendar Days Grid with Solid Dark Emerald Badge & Range Highlighting */}
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {calendarDays.map((dayObj, idx) => {
                    const isToday = dayObj.dateIso === todayIso;
                    const isPast = dayObj.isPast;
                    const approvedSlots = dayObj.slots.filter((s) => s.status === 'approved');
                    const pendingSlots = dayObj.slots.filter((s) => s.status === 'pending');
                    const isBooked = approvedSlots.length > 0;
                    const isPending = pendingSlots.length > 0;

                    const isStartDate = startDateStr === dayObj.dateIso;
                    const isEndDate = endDateStr === dayObj.dateIso;
                    const isInRange =
                      startDateStr &&
                      endDateStr &&
                      dayObj.dateIso >= startDateStr &&
                      dayObj.dateIso <= endDateStr;

                    // Hover tooltip details for booked/pending slots
                    const hoverTooltipText = isBooked
                      ? approvedSlots
                          .map(
                            (s) =>
                              `🔴 Booked: ${formatDateTime(s.start_at, locale)} - ${formatDateTime(
                                s.end_at,
                                locale
                              )} (Approved)`
                          )
                          .join('\n')
                      : isPending
                      ? pendingSlots
                          .map(
                            (s) =>
                              `🟡 Pending: ${formatDateTime(s.start_at, locale)} - ${formatDateTime(
                                s.end_at,
                                locale
                              )} (Under Review)`
                          )
                          .join('\n')
                      : undefined;

                    return (
                      <button
                        key={`${dayObj.dateIso}-${idx}`}
                        type="button"
                        disabled={!dayObj.isCurrentMonth || isPast || isBooked}
                        onClick={() => handleDateClick(dayObj)}
                        title={hoverTooltipText}
                        className={`
                          min-h-[38px] p-1 rounded-xl border flex flex-col justify-between items-center text-center transition-all relative group
                          ${
                            !dayObj.isCurrentMonth
                              ? 'bg-gray-50/40 border-transparent text-gray-300 cursor-default opacity-40'
                              : isPast
                              ? 'bg-gray-50/70 border-transparent text-gray-300 line-through cursor-not-allowed'
                              : isBooked
                              ? 'bg-red-100/90 border-red-300 text-red-900 font-bold cursor-not-allowed shadow-inner'
                              : isStartDate || isEndDate
                              ? 'bg-[#123726] text-white font-bold shadow-md ring-2 ring-[#123726] border-[#123726] z-10'
                              : isInRange
                              ? 'bg-emerald-100/90 text-[color:#123726] font-semibold border-y border-emerald-300 rounded-none'
                              : isPending
                              ? 'bg-amber-100/90 text-amber-900 border-amber-300 font-semibold hover:bg-amber-200'
                              : 'bg-white border-gray-200 text-gray-800 hover:border-[color:#1d7a53] hover:bg-emerald-50/50'
                          }
                          ${isToday && !isStartDate && !isEndDate ? 'ring-1 ring-emerald-500 font-bold' : ''}
                        `}
                      >
                        <span className="text-[11px] leading-none mt-0.5">{dayObj.date.getDate()}</span>

                        {/* Status Dots / Indicators */}
                        {dayObj.isCurrentMonth && !isPast && (
                          <div className="w-full flex items-center justify-center gap-0.5 mb-0.5">
                            {isBooked && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-red-200 text-red-900 font-bold">
                                🔴
                              </span>
                            )}
                            {!isBooked && isPending && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                                🟡
                              </span>
                            )}
                          </div>
                        )}

                        {/* Hover Tooltip Card */}
                        {hoverTooltipText && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 min-w-[190px] p-2 rounded-xl bg-gray-900 text-white text-[10px] font-normal leading-tight shadow-xl pointer-events-none transition-all text-left">
                            <div className="font-semibold text-emerald-400 mb-1 border-b border-gray-700 pb-0.5">
                              {dayObj.date.toLocaleDateString(locale === 'fil' ? 'fil-PH' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            {approvedSlots.map((s) => (
                              <div key={s.id} className="text-red-300 font-medium">
                                🔴 {formatDateTime(s.start_at, locale)} — {formatDateTime(s.end_at, locale)}
                              </div>
                            ))}
                            {pendingSlots.map((s) => (
                              <div key={s.id} className="text-amber-300 font-medium">
                                🟡 {formatDateTime(s.start_at, locale)} — {formatDateTime(s.end_at, locale)}
                              </div>
                            ))}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend (Amber = Pending Request, Red = Booked / Unavailable) */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] sm:text-xs border-t border-gray-100 mt-1">
                <div className="flex flex-wrap items-center gap-3.5 text-[color:#2d4a3b]">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                    <span>{copyText(locale, 'Booked (Unavailable)', 'Naka-book (Hindi Available)')}</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                    <span>{copyText(locale, 'Pending Request', 'May Pending Request')}</span>
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 italic">
                  {copyText(locale, 'Hover dates for details', 'I-hover para sa detalye')}
                </div>
              </div>

            </div>

          </div>

          {/* BOTTOM PANEL: Purpose / Notes & Submit Action */}
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-[color:rgba(18,55,38,0.14)] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[color:rgba(18,55,38,0.12)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:#1d7a53] text-white font-bold text-xs shadow-sm">
                3
              </span>
              <div>
                <h3 className="font-bold text-[color:#123726] text-base leading-tight">
                  {copyText(locale, 'Purpose & Confirmation', 'Layunin at Pagpapatibay')}
                </h3>
                <p className="text-xs text-[color:#49695a]">
                  {copyText(locale, 'Provide details regarding your request', 'Magbigay ng detalye tungkol sa iyong hiling')}
                </p>
              </div>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[color:#123726]">
                {copyText(locale, 'Purpose / Event Description', 'Layunin / Paglalarawan ng Gawain')}
              </span>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={copyText(
                  locale,
                  'State the purpose of reservation (e.g., Community meeting, Basketball tournament, Medical mission...)',
                  'Isulat ang layunin ng reservation (hal. Pulong ng komunidad, Palaro ng basketbol, Medical mission...)'
                )}
                className="min-h-[90px] border-[color:rgba(18,55,38,0.22)] focus:ring-2 focus:ring-[color:#1d7a53]"
                required
              />
            </label>

            {feedback && (
              <div className="pt-1">
                <FormFeedback tone={feedback.tone} text={feedback.text} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs text-[color:#49695a]">
                {copyText(
                  locale,
                  'Reservations require staff review before approval.',
                  'Nangangailangan ng pagsusuri ng staff bago ma-aprubahan ang reservation.'
                )}
              </div>
              <Button
                type="submit"
                variant="resident"
                disabled={isSubmitting}
                className="h-11 min-w-[220px] px-6 text-base font-bold shadow-md"
              >
                {isSubmitting
                  ? copyText(locale, 'Submitting...', 'Ipinapadala...')
                  : copyText(locale, 'Submit Reservation', 'Ipadala ang Reservation')}
              </Button>
            </div>
          </div>
        </form>
      </ResidentSection>

      <ResidentSection
        title={copyText(locale, 'My Reservations', 'Mga Reservation Ko')}
        description={copyText(locale, 'Track your facility and equipment reservations by status.', 'Subaybayan ang status ng mga reservation mo sa pasilidad at equipment.')}
        actions={(
          <label className="grid w-full gap-1 text-sm sm:w-[220px]">
            <span className="sr-only">{copyText(locale, 'Sort reservations by status', 'I-filter ang reservation ayon sa status')}</span>
            <Select
              value={reservationStatusFilter}
              onChange={(event) => {
                setReservationStatusFilter(event.target.value as 'all' | Reservation['status'] | 'finished');
                setReservationsPage(1);
              }}
              aria-label={copyText(locale, 'Filter reservations by status', 'I-filter ang reservation ayon sa status')}
            >
              <option value="all">{copyText(locale, 'All reservations', 'Lahat ng reservation')}</option>
              <option value="pending">{copyText(locale, 'Pending', 'Naghihintay')}</option>
              <option value="approved">{copyText(locale, 'Approved', 'Aprubado')}</option>
              <option value="ready_for_pickup">{copyText(locale, 'Ready for Pickup', 'Handa nang kunin')}</option>
              <option value="received">{copyText(locale, 'Received', 'Natanggap')}</option>
              <option value="finished">{copyText(locale, 'Returned / Completed', 'Naibalik / Nakumpleto')}</option>
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
                {paginatedReservations.map((reservation) => (
                  <TableRow key={reservation.id} className="hover:bg-transparent">
                    <TableCell className="text-center">
                      <p className="font-medium">{getResourceLabel(reservation.resource)}</p>
                      {reservation.resource === 'equipment' && reservation.itemName ? (
                        <p className="text-xs text-[color:#456453]">
                          {reservation.itemName}{reservation.quantityRequested ? ` × ${reservation.quantityRequested}` : ''}
                        </p>
                      ) : null}
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[color:#456453]">
                {copyText(locale, 'Showing', 'Ipinapakita')} {(reservationsPage - 1) * reservationsPerPage + 1}–{Math.min(reservationsPage * reservationsPerPage, visibleReservations.length)} {copyText(locale, 'of', 'sa')} {visibleReservations.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={reservationsPage <= 1}
                  onClick={() => setReservationsPage((page) => Math.max(1, page - 1))}
                >
                  {copyText(locale, 'Previous', 'Nakaraan')}
                </Button>
                <span className="min-w-16 text-center text-sm font-medium text-[color:#123726]">
                  {reservationsPage} / {reservationsPageCount}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={reservationsPage >= reservationsPageCount}
                  onClick={() => setReservationsPage((page) => Math.min(reservationsPageCount, page + 1))}
                >
                  {copyText(locale, 'Next', 'Susunod')}
                </Button>
              </div>
            </div>
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
