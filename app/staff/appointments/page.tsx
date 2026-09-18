'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { X, Trash2, Pencil, Loader2 } from 'lucide-react';
import PortalShell from '../../../components/portal-shell';
import {
  EmptyState,
  FormFeedback,
  SectionCard,
  StatusBadge,
  statusToneFromState,
} from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import {
  createDoctorAvailabilitySlot,
  deleteDoctorAvailabilitySlot,
  updateCheckupAppointmentStatus,
  updateDoctorAvailabilitySlot,
  upsertDoctor,
  deleteDoctor,
} from '@/lib/frontend-data/store';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function slotLabel(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const formatter = new Intl.DateTimeFormat('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatTime12h(timeStr: string) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatSessionRange(startAt: string, endAt: string) {
  return `${formatTime12h(startAt)} - ${formatTime12h(endAt)}`;
}

function defaultDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function generateWeeklyDates(days: number[], weeksCount: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  const totalDays = Math.max(1, weeksCount) * 7;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (days.includes(d.getDay())) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  return dates;
}

type SessionType = 'morning' | 'afternoon';

type SessionConfig = {
  enabled: boolean;
  startAt: string;
  endAt: string;
};

export default function StaffAppointmentsPage() {
  const { state, locale } = useAppState();

  const [doctorName, setDoctorName] = useState('');
  const [scheduleType, setScheduleType] = useState<'weekly' | 'single'>('weekly');
  const [selectedDate, setSelectedDate] = useState(defaultDateValue);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([2, 4]); // Tuesday (2), Thursday (4) by default
  const [weeksCount, setWeeksCount] = useState<number>(4); // 4 weeks by default

  const [sessionTimes, setSessionTimes] = useState<
    Record<SessionType, SessionConfig>
  >({
    morning: {
      enabled: true,
      startAt: '08:00',
      endAt: '11:30',
    },
    afternoon: {
      enabled: false,
      startAt: '13:00',
      endAt: '17:00',
    },
  });

  const [capacity, setCapacity] = useState(7);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpecialization, setNewDoctorSpecialization] = useState('');
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'info' | 'neutral';
    text: string;
  } | null>(null);
  const [staffNote, setStaffNote] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [reviewDeclineReason, setReviewDeclineReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'declined' | 'cancelled'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<string | null>(
    null
  );
  const [confirmDeleteAppointmentId, setConfirmDeleteAppointmentId] = useState<
    string | null
  >(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [showDoctorsModal, setShowDoctorsModal] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [appointmentPage, setAppointmentPage] = useState(1);
  const slotsSectionRef = useRef<HTMLDivElement | null>(null);

  const doctorSpecializationMap = useMemo(() => {
    const map = new Map<string, string>();

    state.doctors.forEach((d) => {
      if (d.name && d.specialization) {
        map.set(d.name.trim().toLowerCase(), d.specialization);
      }
    });

    return map;
  }, [state.doctors]);

  const [deletedSlotIds, setDeletedSlotIds] = useState<string[]>([]);

  const slots = useMemo(
    () =>
      state.doctorAvailabilitySlots
        .filter((slot) => !deletedSlotIds.includes(slot.id))
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [state.doctorAvailabilitySlots, deletedSlotIds]
  );

  const appointments = useMemo(
    () =>
      [...state.checkupAppointments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [state.checkupAppointments]
  );

  const filteredAppointments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchesStatus =
        statusFilter === 'cancelled'
          ? appointment.status === 'cancelled'
          : statusFilter === 'all'
            ? appointment.status !== 'cancelled'
            : appointment.status === statusFilter;

      const searchable =
        `${appointment.residentName} ${appointment.status} ${appointment.createdAt} ${appointment.updatedAt}`.toLowerCase();

      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [appointments, searchTerm, statusFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(
    filteredAppointments.length / itemsPerPage
  );

  const paginatedAppointments = useMemo(
    () =>
      filteredAppointments.slice(
        (appointmentPage - 1) * itemsPerPage,
        appointmentPage * itemsPerPage
      ),
    [filteredAppointments, appointmentPage]
  );

  const selectedAppointment = useMemo(
    () =>
      selectedAppointmentId
        ? state.checkupAppointments.find(
            (a) => a.id === selectedAppointmentId
          ) ?? null
        : null,
    [state.checkupAppointments, selectedAppointmentId]
  );

  const newestAppointmentTimestamp = useMemo(
    () => filteredAppointments[0]?.createdAt ?? null,
    [filteredAppointments]
  );

  useEffect(() => {
    setAppointmentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (!showSlotsModal) return;

    slotsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [showSlotsModal]);

  const updateSession = (
    session: SessionType,
    field: keyof SessionConfig,
    value: boolean | string
  ) => {
    setSessionTimes((previous) => ({
      ...previous,
      [session]: {
        ...previous[session],
        [field]: value,
      },
    }));
  };

  const onCreateSlot = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<boolean> => {
    event.preventDefault();

    if (!doctorName.trim()) {
      setFeedback({
        tone: 'error',
        text:
          locale === 'fil'
            ? 'Kailangan ang pangalan ng doktor.'
            : 'Doctor name is required.',
      });

      return false;
    }

    if (capacity < 5 || capacity > 15) {
      setFeedback({
        tone: 'error',
        text:
          locale === 'fil'
            ? 'Ang kapasidad ay dapat nasa pagitan ng 5 at 15.'
            : 'Capacity must be between 5 and 15.',
      });

      return false;
    }

    const sessions = (Object.keys(sessionTimes) as SessionType[]).filter(
      (session) => sessionTimes[session].enabled
    );

    if (!sessions.length) {
      setFeedback({
        tone: 'error',
        text:
          locale === 'fil'
            ? 'Pumili ng kahit isang session.'
            : 'Select at least one session.',
      });

      return false;
    }

    for (const session of sessions) {
      const { startAt, endAt } = sessionTimes[session];

      if (endAt <= startAt) {
        setFeedback({
          tone: 'error',
          text:
            locale === 'fil'
              ? `Invalid na oras para sa ${session} session.`
              : `Invalid time range for ${session} session.`,
        });

        return false;
      }
    }

    const targetDates =
      scheduleType === 'weekly'
        ? generateWeeklyDates(weeklyDays, weeksCount)
        : [selectedDate];

    if (!targetDates.length) {
      setFeedback({
        tone: 'error',
        text:
          locale === 'fil'
            ? 'Pumili ng kahit isang araw para sa weekly schedule.'
            : 'Select at least one day for the weekly schedule.',
      });

      return false;
    }

    try {
      let createdCount = 0;

      for (const dateStr of targetDates) {
        for (const session of sessions) {
          const { startAt, endAt } = sessionTimes[session];

          await createDoctorAvailabilitySlot({
            doctorName: doctorName.trim(),
            date: dateStr,
            startAt,
            endAt,
            capacity,
            notes: notes.trim() || undefined,
          });
          createdCount++;
        }
      }

      setFeedback({
        tone: 'success',
        text:
          locale === 'fil'
            ? `Matagumpay na na-generate ang ${createdCount} availability slot(s) para sa schedule.`
            : `Successfully generated ${createdCount} availability slot(s) for the schedule.`,
      });

      setDoctorName('');
      setCapacity(7);
      setNotes('');

      return true;
    } catch (error) {
      setFeedback({
        tone: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to create availability.',
      });

      return false;
    }
  };

  const onDeleteDoctor = async (doctorId: string) => {
    await deleteDoctor(doctorId);
  };

  const onToggleBlocked = async (slotId: string, isBlocked: boolean) => {
    setBusySlotId(slotId);

    try {
      await updateDoctorAvailabilitySlot(slotId, {
        isBlocked: !isBlocked,
      });

      setFeedback({
        tone: isBlocked ? 'success' : 'neutral',
        text: isBlocked
          ? locale === 'fil'
            ? 'Binuksan ang slot (Open).'
            : 'Slot is now open.'
          : locale === 'fil'
            ? 'Isinara ang slot (Close).'
            : 'Slot is now closed.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to update slot.',
      });
    } finally {
      setBusySlotId(null);
    }
  };

  const onDeleteSlot = async (slotId: string) => {
    setBusySlotId(slotId);
    setDeletedSlotIds((prev) => [...prev, slotId]);

    try {
      await deleteDoctorAvailabilitySlot(slotId);

      setFeedback({
        tone: 'success',
        text:
          locale === 'fil'
            ? 'Inalis ang slot sa Doctor Availability Slots.'
            : 'Slot removed from Doctor Availability Slots.',
      });
    } catch (error) {
      setDeletedSlotIds((prev) => prev.filter((id) => id !== slotId));
      setFeedback({
        tone: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to delete slot.',
      });
    } finally {
      setBusySlotId(null);
    }
  };

  const onUpdateAppointmentStatus = async (
    appointmentId: string,
    status:
      | 'pending'
      | 'approved'
      | 'completed'
      | 'declined'
      | 'cancelled'
  ) => {
    setBusyAppointmentId(appointmentId);

    try {
      await updateCheckupAppointmentStatus(
        appointmentId,
        status,
        staffNote.trim() || undefined
      );

      setStaffNote('');

      setFeedback({
        tone: 'success',
        text:
          locale === 'fil'
            ? 'Na-update ang appointment status.'
            : 'Appointment status updated.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to update appointment.',
      });
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const openReviewModal = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setReviewDeclineReason('');
  };

  const closeReviewModal = () => {
    setSelectedAppointmentId(null);
    setReviewDeclineReason('');
    setConfirmDeleteAppointmentId(null);
  };

  const approveSelectedAppointment = async () => {
    if (!selectedAppointment) return;

    setBusyAppointmentId(selectedAppointment.id);

    try {
      await updateCheckupAppointmentStatus(
        selectedAppointment.id,
        'approved',
        reviewDeclineReason.trim() || undefined
      );

      setFeedback({
        tone: 'success',
        text:
          locale === 'fil'
            ? 'Na-approve ang appointment.'
            : 'Appointment approved.',
      });

      closeReviewModal();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to approve appointment.',
      });
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const declineSelectedAppointment = async () => {
    if (!selectedAppointment) return;

    if (!reviewDeclineReason.trim()) {
      setFeedback({
        tone: 'error',
        text:
          locale === 'fil'
            ? 'Kailangan ang dahilan bago mag-decline.'
            : 'A decline reason is required before proceeding.',
      });

      return;
    }

    setBusyAppointmentId(selectedAppointment.id);

    try {
      await updateCheckupAppointmentStatus(
        selectedAppointment.id,
        'declined',
        reviewDeclineReason.trim()
      );

      setFeedback({
        tone: 'success',
        text:
          locale === 'fil'
            ? 'Na-decline ang appointment.'
            : 'Appointment declined.',
      });

      closeReviewModal();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to decline appointment.',
      });
    } finally {
      setBusyAppointmentId(null);
    }
  };

  return (
    <PortalShell
      role="staff"
      title={
        locale === 'fil'
          ? 'Doctor Schedule at Appointments'
          : 'Doctor Schedule and Appointments'
      }
      description={
        locale === 'fil'
          ? 'I-configure ang schedule ng doktor at i-manage ang check-up bookings. Available lang ang doktor sa center tuwing Tuesday at Thursday.'
          : 'Configure doctor schedule and manage check-up bookings. Doctor availability at the center is every Tuesday and Thursday only.'
      }
      showHero={false}
    >
      {feedback ? (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1">
            <FormFeedback tone={feedback.tone} text={feedback.text} />
          </div>
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-600"
            onClick={() => setFeedback(null)}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="mb-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="border border-[color:var(--portal-border-soft)]"
          onClick={() => setShowSlotsModal((value) => !value)}
        >
          {showSlotsModal
            ? locale === 'fil'
              ? 'Itago'
              : 'Hide'
            : locale === 'fil'
              ? 'Ipakita'
              : 'Show'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="border border-[color:var(--portal-border-soft)]"
          onClick={() => setShowDoctorsModal(true)}
        >
          {locale === 'fil' ? 'Imanage ang Doctors' : 'Manage Doctors'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[color:var(--portal-ink-500)]">
          {filteredAppointments.length}{' '}
          {locale === 'fil' ? 'appointments' : 'appointments'} ·{' '}
          {locale === 'fil'
            ? 'Nakaayos mula pinakahuli'
            : 'Sorted by most recent'}
          {newestAppointmentTimestamp
            ? ` · ${
                locale === 'fil' ? 'Pinakahuli' : 'Latest'
              }: ${formatDateTime(newestAppointmentTimestamp, locale)}`
            : ''}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${
              statusFilter === 'all'
                ? 'bg-[color:var(--portal-border-soft)]'
                : 'hover:bg-[color:var(--portal-border-soft)]'
            }`}
            onClick={() => setStatusFilter('all')}
          >
            {locale === 'fil' ? 'Lahat' : 'All'} (
            {appointments.filter((a) => a.status !== 'cancelled').length})
          </button>

          <div className="relative">
            <button
              type="button"
              className={`rounded px-3 py-1 text-sm ${
                statusFilter === 'pending'
                  ? 'bg-[color:#fff7ed]'
                  : 'hover:bg-[color:#fff7ed]'
              }`}
              onClick={() => setStatusFilter('pending')}
            >
              {locale === 'fil' ? 'Pending' : 'Pending'} (
              {appointments.filter((a) => a.status === 'pending').length})
            </button>

            {appointments.some(
              (appointment) => appointment.status === 'pending'
            ) ? (
              <span
                className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-red-500"
                aria-hidden
              />
            ) : null}
          </div>

          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${
              statusFilter === 'approved'
                ? 'bg-[color:#ecfdf5]'
                : 'hover:bg-[color:#ecfdf5]'
            }`}
            onClick={() => setStatusFilter('approved')}
          >
            {locale === 'fil' ? 'Aprubado' : 'Approved'} (
            {appointments.filter((a) => a.status === 'approved').length})
          </button>

          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${
              statusFilter === 'declined'
                ? 'bg-[color:#fff1f2]'
                : 'hover:bg-[color:#fff1f2]'
            }`}
            onClick={() => setStatusFilter('declined')}
          >
            {locale === 'fil' ? 'Tinanggihan' : 'Declined'} (
            {appointments.filter((a) => a.status === 'declined').length})
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <SectionCard
          title={
            locale === 'fil'
              ? 'Check-up Appointments'
              : 'Check-up Appointments'
          }
        >
          {!filteredAppointments.length ? (
            <EmptyState
              title={
                locale === 'fil'
                  ? 'Walang nahanap na appointments'
                  : 'No appointments found'
              }
              description={
                locale === 'fil'
                  ? 'Subukan ang ibang search query o filter.'
                  : 'Try adjusting your search query or filter.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[color:var(--portal-border-soft)]">
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Resident' : 'Resident'}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Doktor' : 'Doctor'}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Petsa' : 'Date'}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Oras' : 'Time'}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Dahilan' : 'Reason'}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Status' : 'Status'}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Aksyon' : 'Actions'}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedAppointments.map((appointment) => {
                      const slot = state.doctorAvailabilitySlots.find(
                        (s) => s.id === appointment.slotId
                      );
                      const isPending = appointment.status === 'pending';

                      return (
                        <tr
                          key={appointment.id}
                          className="border-b border-[color:var(--portal-border-soft)] hover:bg-[color:var(--portal-surface-2)]"
                        >
                          <td className="px-3 py-2 text-center text-sm font-medium text-[color:var(--portal-ink-900)]">
                            {appointment.residentName}
                          </td>

                          <td className="px-3 py-2 text-center text-sm text-[color:var(--portal-ink-700)]">
                            Dr. {slot?.doctorName ?? '-'}
                          </td>

                          <td className="px-3 py-2 text-center text-sm text-[color:var(--portal-ink-700)]">
                            {slot?.date ?? '-'}
                          </td>

                          <td className="px-3 py-2 text-center text-sm text-[color:var(--portal-ink-700)]">
                            {slot
                              ? slotLabel(slot.startAt, slot.endAt)
                              : '-'}
                          </td>

                          <td
                            className="max-w-[200px] truncate px-3 py-2 text-center text-sm text-[color:var(--portal-ink-700)]"
                            title={appointment.reason}
                          >
                            {appointment.reason}
                          </td>

                          <td className="px-3 py-2 text-center">
                            <StatusBadge
                              tone={statusToneFromState(appointment.status)}
                            >
                              {appointment.status}
                            </StatusBadge>
                          </td>

                          <td className="px-3 py-2 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                isPending ? 'default' : 'secondary'
                              }
                              onClick={() =>
                                openReviewModal(appointment.id)
                              }
                            >
                              {locale === 'fil' ? 'Tingnan' : 'Review'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-[color:var(--portal-border-soft)] pt-3">
                  <div className="text-xs text-[color:var(--portal-ink-500)]">
                    {locale === 'fil'
                      ? `Ipinapakita ang ${
                          (appointmentPage - 1) * itemsPerPage + 1
                        } hanggang ${Math.min(
                          appointmentPage * itemsPerPage,
                          filteredAppointments.length
                        )} ng ${filteredAppointments.length}`
                      : `Showing ${
                          (appointmentPage - 1) * itemsPerPage + 1
                        } to ${Math.min(
                          appointmentPage * itemsPerPage,
                          filteredAppointments.length
                        )} of ${filteredAppointments.length}`}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setAppointmentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={appointmentPage === 1}
                    >
                      {locale === 'fil' ? 'Nakaraan' : 'Previous'}
                    </Button>

                    <div className="text-sm text-[color:var(--portal-ink-600)]">
                      {`${appointmentPage} / ${totalPages}`}
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setAppointmentPage((p) =>
                          Math.min(totalPages, p + 1)
                        )
                      }
                      disabled={appointmentPage === totalPages}
                    >
                      {locale === 'fil' ? 'Susunod' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {showSlotsModal ? (
          <div ref={slotsSectionRef} className="scroll-mt-28">
            <SectionCard
              title={
                locale === 'fil'
                  ? 'Doctor Availability Slots'
                  : 'Doctor Availability Slots'
              }
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="border border-[color:var(--portal-border-soft)]"
                    onClick={() => setShowDoctorsModal(true)}
                  >
                    {locale === 'fil'
                      ? 'Imanage ang Doctors'
                      : 'Manage Doctors'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="border border-[color:var(--portal-border-soft)]"
                    onClick={() => setShowSlotsModal(false)}
                  >
                    {locale === 'fil' ? 'Itago' : 'Hide'}
                  </Button>
                </div>
              }
            >
              {!slots.length ? (
                <EmptyState
                  title={
                    locale === 'fil'
                      ? 'Walang schedule slots'
                      : 'No schedule slots'
                  }
                  description={
                    locale === 'fil'
                      ? 'Magdagdag muna ng slot gamit ang Manage Doctors.'
                      : 'Create a slot first via Manage Doctors.'
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[color:var(--portal-border-soft)]">
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                          {locale === 'fil' ? 'Doktor' : 'Doctor'}
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                          {locale === 'fil'
                            ? 'Espesyalisasyon'
                            : 'Specialization'}
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                          {locale === 'fil' ? 'Petsa' : 'Date'}
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                          {locale === 'fil' ? 'Oras' : 'Time'}
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                          {locale === 'fil' ? 'Status' : 'Status'}
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                          {locale === 'fil' ? 'Aksyon' : 'Actions'}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {slots.map((slot) => {
                        const specialization =
                          doctorSpecializationMap.get(
                            slot.doctorName.trim().toLowerCase()
                          );

                        return (
                          <tr
                            key={slot.id}
                            className="border-b border-[color:var(--portal-border-soft)] hover:bg-[color:var(--portal-surface-2)]"
                          >
                            <td className="px-3 py-2 text-center text-sm text-[color:var(--portal-ink-900)]">
                              Dr. {slot.doctorName}
                            </td>

                            <td className="px-3 py-2 text-center text-sm text-[color:var(--portal-ink-700)]">
                              {specialization || '-'}
                            </td>

                            <td className="px-3 py-2 text-center text-sm text-[color:var(--portal-ink-700)]">
                              {slot.date}
                            </td>

                            <td className="px-3 py-2 text-center text-sm text-[color:var(--portal-ink-700)]">
                              {slotLabel(slot.startAt, slot.endAt)}
                            </td>

                            <td className="px-3 py-2 text-center">
                              <StatusBadge
                                tone={
                                  slot.isBlocked
                                    ? 'neutral'
                                    : 'success'
                                }
                              >
                                {slot.isBlocked
                                  ? locale === 'fil'
                                    ? 'Close'
                                    : 'Close'
                                  : locale === 'fil'
                                    ? 'Open'
                                    : 'Open'}
                              </StatusBadge>
                            </td>

                            <td className="px-3 py-2 text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={busySlotId === slot.id}
                                  onClick={() =>
                                    void onToggleBlocked(
                                      slot.id,
                                      slot.isBlocked
                                    )
                                  }
                                  className="min-w-[140px] border border-[color:var(--portal-border-soft)]"
                                >
                                  {busySlotId === slot.id ? (
                                    <span className="flex items-center justify-center gap-1.5">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--portal-ink-700)]" />
                                      <span>
                                        {locale === 'fil'
                                          ? 'Naglo-load...'
                                          : 'Loading...'}
                                      </span>
                                    </span>
                                  ) : slot.isBlocked ? (
                                    locale === 'fil'
                                      ? 'I-mark as Available'
                                      : 'Mark as Available'
                                  ) : locale === 'fil' ? (
                                    'I-mark as Unavailable'
                                  ) : (
                                    'Mark as Unavailable'
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="border border-[color:var(--portal-border-soft)]"
                                  onClick={() =>
                                    setSelectedSlotId(slot.id)
                                  }
                                >
                                  Show
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title={
                                    locale === 'fil'
                                      ? 'Alisin ang Slot'
                                      : 'Remove Slot'
                                  }
                                  disabled={busySlotId === slot.id}
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        locale === 'fil'
                                          ? 'Sigurado ka bang gusto mong alisin ang slot na ito?'
                                          : 'Are you sure you want to remove this slot?'
                                      )
                                    ) {
                                      await onDeleteSlot(slot.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        ) : null}
      </div>

      {selectedAppointment ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4">
          <section
            aria-labelledby="appointment-decision-title"
            aria-modal="true"
            className="w-full max-w-[620px] overflow-hidden rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[0_24px_70px_rgba(13,45,29,0.28)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
              <div>
                <p className="text-xs text-[color:var(--portal-ink-500)]">
                  {selectedAppointment.id.substring(0, 8)}
                </p>

                <h2
                  id="appointment-decision-title"
                  className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]"
                >
                  {locale === 'fil'
                    ? 'Suriin ang Appointment'
                    : 'Review Appointment'}
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 min-h-8 px-2"
                onClick={closeReviewModal}
                aria-label={locale === 'fil' ? 'Isara' : 'Close'}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-4 px-5 py-4">
              <div className="grid gap-2 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">
                    {selectedAppointment.residentName}
                  </p>

                  <StatusBadge
                    tone={statusToneFromState(selectedAppointment.status)}
                  >
                    {selectedAppointment.status}
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[color:var(--portal-ink-700)]">
                  <div>
                    <span className="text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Doktor:' : 'Doctor:'}{' '}
                    </span>
                    Dr.{' '}
                    {state.doctorAvailabilitySlots.find(
                      (s) => s.id === selectedAppointment.slotId
                    )?.doctorName ?? '-'}
                  </div>

                  <div>
                    <span className="text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Petsa:' : 'Date:'}{' '}
                    </span>
                    {state.doctorAvailabilitySlots.find(
                      (s) => s.id === selectedAppointment.slotId
                    )?.date ?? '-'}
                  </div>

                  <div>
                    <span className="text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Oras:' : 'Time:'}{' '}
                    </span>

                    {(() => {
                      const s = state.doctorAvailabilitySlots.find(
                        (slot) =>
                          slot.id === selectedAppointment.slotId
                      );

                      return s
                        ? slotLabel(s.startAt, s.endAt)
                        : '-';
                    })()}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-[color:var(--portal-ink-500)]">
                    {locale === 'fil'
                      ? 'Dahilan ng Check-up:'
                      : 'Reason for Check-up:'}
                  </p>

                  <p className="mt-0.5 text-xs text-[color:var(--portal-ink-800)]">
                    {selectedAppointment.reason}
                  </p>
                </div>
              </div>

              {selectedAppointment.status === 'pending' ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-[color:var(--portal-ink-800)]">
                    {locale === 'fil'
                      ? 'Tala para sa Resident (opsyonal para sa apruba, kailangan kapag tatanggihan):'
                      : 'Note for Resident (optional for approval, required for decline):'}
                  </span>

                  <Textarea
                    value={reviewDeclineReason}
                    onChange={(e) =>
                      setReviewDeclineReason(e.target.value)
                    }
                    placeholder={
                      locale === 'fil'
                        ? 'Maglagay ng mensahe...'
                        : 'Enter a message...'
                    }
                    className="min-h-[80px]"
                  />
                </label>
              ) : null}

              {feedback ? (
                <FormFeedback
                  tone={feedback.tone}
                  text={feedback.text}
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--portal-border-soft)] px-5 py-4">
              <div>
                {confirmDeleteAppointmentId ===
                selectedAppointment.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">
                      {locale === 'fil' ? 'Sigurado?' : 'Confirm?'}
                    </span>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={
                        busyAppointmentId ===
                        selectedAppointment.id
                      }
                      onClick={() =>
                        void onUpdateAppointmentStatus(
                          selectedAppointment.id,
                          'cancelled'
                        )
                      }
                    >
                      {locale === 'fil'
                        ? 'Oo, Kanselahin'
                        : 'Yes, Cancel'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirmDeleteAppointmentId(null)
                      }
                    >
                      {locale === 'fil' ? 'Huwag' : 'No'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() =>
                      setConfirmDeleteAppointmentId(
                        selectedAppointment.id
                      )
                    }
                  >
                    {locale === 'fil'
                      ? 'Kanselahin ang Appointment'
                      : 'Cancel Appointment'}
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {selectedAppointment.status === 'pending' ? (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={
                        busyAppointmentId ===
                        selectedAppointment.id
                      }
                      onClick={() =>
                        void declineSelectedAppointment()
                      }
                    >
                      {locale === 'fil'
                        ? 'Tanggihan'
                        : 'Decline'}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        busyAppointmentId ===
                        selectedAppointment.id
                      }
                      onClick={() =>
                        void approveSelectedAppointment()
                      }
                    >
                      {locale === 'fil'
                        ? 'Aprubahan'
                        : 'Approve'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={closeReviewModal}
                  >
                    {locale === 'fil' ? 'Isara' : 'Close'}
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {showAddSlotModal ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4">
          <section
            aria-labelledby="add-slot-modal-title"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-[750px] flex-col overflow-hidden rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[0_24px_70px_rgba(13,45,29,0.28)]"
            role="dialog"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
              <h2
                id="add-slot-modal-title"
                className="text-base font-semibold text-[color:var(--portal-ink-900)]"
              >
                {locale === 'fil'
                  ? 'Magdagdag ng Schedule Slot'
                  : 'Add Schedule Slot'}
              </h2>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 min-h-8 px-2"
                onClick={() => setShowAddSlotModal(false)}
                aria-label={locale === 'fil' ? 'Isara' : 'Close'}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid flex-1 gap-3 px-5 py-4">
              <form
                className="grid gap-4 rounded-lg border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-4"
                onSubmit={async (event) => {
                  const ok = await onCreateSlot(event);

                  if (ok) {
                    setShowAddSlotModal(false);
                  }
                }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="grid gap-1 text-sm md:col-span-2">
                    <span>
                      {locale === 'fil' ? 'Doktor' : 'Doctor'}
                    </span>

                    <Select
                      value={doctorName}
                      onChange={(event) =>
                        setDoctorName(event.target.value)
                      }
                      required
                    >
                      <option value="">
                        {locale === 'fil'
                          ? 'Pumili ng doktor'
                          : 'Select a doctor'}
                      </option>

                      {state.doctors
                        .filter((d) => d.isActive)
                        .map((doc) => (
                          <option key={doc.id} value={doc.name}>
                            {doc.name}{' '}
                            {doc.specialization
                              ? `(${doc.specialization})`
                              : ''}
                          </option>
                        ))}
                    </Select>
                  </label>

                  <label className="grid gap-1 text-sm md:col-span-1">
                    <span>
                      {locale === 'fil'
                        ? 'Kapasidad (5-15)'
                        : 'Capacity (5-15)'}
                    </span>

                    <Input
                      type="number"
                      min={5}
                      max={15}
                      value={capacity}
                      onChange={(e) =>
                        setCapacity(Number(e.target.value))
                      }
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 rounded-xl border border-[color:var(--portal-border-soft)] bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[color:var(--portal-ink-800)]">
                      {locale === 'fil' ? 'Uri ng Schedule' : 'Schedule Type'}
                    </span>

                    <div className="flex rounded-md border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-0.5 text-xs">
                      <button
                        type="button"
                        className={cn(
                          'rounded px-3 py-1 font-medium transition-colors',
                          scheduleType === 'weekly'
                            ? 'bg-white text-[color:var(--portal-ink-900)] shadow-sm font-semibold'
                            : 'text-[color:var(--portal-ink-600)] hover:text-[color:var(--portal-ink-900)]'
                        )}
                        onClick={() => setScheduleType('weekly')}
                      >
                        {locale === 'fil' ? 'Lingguhan (Weekly)' : 'Weekly Recurring'}
                      </button>

                      <button
                        type="button"
                        className={cn(
                          'rounded px-3 py-1 font-medium transition-colors',
                          scheduleType === 'single'
                            ? 'bg-white text-[color:var(--portal-ink-900)] shadow-sm font-semibold'
                            : 'text-[color:var(--portal-ink-600)] hover:text-[color:var(--portal-ink-900)]'
                        )}
                        onClick={() => setScheduleType('single')}
                      >
                        {locale === 'fil' ? 'Isang Petsa (Single Date)' : 'Single Date'}
                      </button>
                    </div>
                  </div>

                  {scheduleType === 'weekly' ? (
                    <div className="grid gap-4 pt-1">
                      <div>
                        <span className="text-xs text-[color:var(--portal-ink-600)]">
                          {locale === 'fil'
                            ? 'Mga Araw ng Pagbisita (Days of Week)'
                            : 'Recurring Days'}
                        </span>

                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {[
                            { day: 1, labelFil: 'Lunes', labelEn: 'Mon' },
                            { day: 2, labelFil: 'Martes', labelEn: 'Tue' },
                            { day: 3, labelFil: 'Miyerkules', labelEn: 'Wed' },
                            { day: 4, labelFil: 'Huwebes', labelEn: 'Thu' },
                            { day: 5, labelFil: 'Biyernes', labelEn: 'Fri' },
                            { day: 6, labelFil: 'Sabado', labelEn: 'Sat' },
                            { day: 0, labelFil: 'Linggo', labelEn: 'Sun' },
                          ].map(({ day, labelFil, labelEn }) => {
                            const isSelected = weeklyDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                className={cn(
                                  'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                                  isSelected
                                    ? 'border-[#123824] bg-[#f2f8f4] text-[#123824] font-semibold shadow-xs'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                )}
                                onClick={() => {
                                  setWeeklyDays((prev) =>
                                    isSelected
                                      ? prev.filter((d) => d !== day)
                                      : [...prev, day]
                                  );
                                }}
                              >
                                {locale === 'fil' ? labelFil : labelEn}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr] items-end">
                        <label className="grid gap-1.5 text-xs">
                          <span className="font-medium text-[color:var(--portal-ink-700)]">
                            {locale === 'fil'
                              ? 'Saklaw (Duration)'
                              : 'Schedule Duration'}
                          </span>

                          <Select
                            value={weeksCount}
                            onChange={(e) =>
                              setWeeksCount(Number(e.target.value))
                            }
                            className="h-10 text-xs sm:text-sm bg-white border-gray-200 px-3 py-1.5 min-w-[220px]"
                          >
                            <option value={1}>
                              {locale === 'fil' ? '1 Linggo (1 Week)' : '1 Week'}
                            </option>
                            <option value={2}>
                              {locale === 'fil' ? '2 Linggo (2 Weeks)' : '2 Weeks'}
                            </option>
                            <option value={4}>
                              {locale === 'fil' ? '4 na Linggo (1 Month)' : '4 Weeks (1 Month)'}
                            </option>
                          </Select>
                        </label>

                        <div className="flex h-10 items-center rounded-lg bg-[color:var(--portal-surface-2)] border border-[color:var(--portal-border-soft)] px-3.5 text-xs font-medium text-[color:var(--portal-ink-800)] shadow-xs">
                          <span>
                            {locale === 'fil'
                              ? `Kabuuan: ${
                                  generateWeeklyDates(weeklyDays, weeksCount).length
                                } araw ang ma-ischeduli`
                              : `Total: ${
                                  generateWeeklyDates(weeklyDays, weeksCount).length
                                } scheduled days`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="grid gap-1.5 text-xs">
                      <span className="font-medium text-[color:var(--portal-ink-700)]">
                        {locale === 'fil' ? 'Petsa' : 'Select Date'}
                      </span>

                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        required
                        className="h-10 text-xs sm:text-sm bg-white border-gray-200 px-3"
                      />
                    </label>
                  )}
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-[color:var(--portal-ink-800)]">
                    {locale === 'fil'
                      ? 'Mga Sesyon / Oras'
                      : 'Session / Time'}
                  </span>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {(
                      [
                        ['morning', 'Morning'],
                        ['afternoon', 'Afternoon'],
                      ] as const
                    ).map(([session, label]) => {
                      const config = sessionTimes[session];

                      return (
                        <div
                          key={session}
                          onClick={() =>
                            updateSession(
                              session,
                              'enabled',
                              !config.enabled
                            )
                          }
                          className={`cursor-pointer select-none rounded-xl p-3 transition-all border-2 ${
                            config.enabled
                              ? 'border-[#123824] bg-[#f2f8f4] shadow-xs'
                              : 'border-[color:var(--portal-border-soft)] bg-white opacity-80'
                          }`}
                        >
                          <div className="mb-1.5 flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                config.enabled
                                  ? 'text-[#123824]'
                                  : 'text-gray-700'
                              }`}
                            >
                              {label}
                            </span>

                            <span className="text-[10px] text-gray-500 font-medium">
                              {config.enabled
                                ? locale === 'fil'
                                  ? 'Naka-on'
                                  : 'Enabled'
                                : locale === 'fil'
                                  ? 'Naka-off'
                                  : 'Disabled'}
                            </span>
                          </div>

                          <div
                            className="grid grid-cols-2 gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="grid gap-0.5 text-xs">
                              <span className="text-[color:var(--portal-ink-600)]">
                                {locale === 'fil' ? 'Simula' : 'Start'}
                              </span>

                              <Input
                                type="time"
                                value={config.startAt}
                                disabled={!config.enabled}
                                onChange={(event) =>
                                  updateSession(
                                    session,
                                    'startAt',
                                    event.target.value
                                  )
                                }
                                className="h-7 px-2 text-xs bg-white border-gray-200"
                                required={config.enabled}
                              />
                            </label>

                            <label className="grid gap-0.5 text-xs">
                              <span className="text-[color:var(--portal-ink-600)]">
                                {locale === 'fil' ? 'Tapos' : 'End'}
                              </span>

                              <Input
                                type="time"
                                value={config.endAt}
                                disabled={!config.enabled}
                                onChange={(event) =>
                                  updateSession(
                                    session,
                                    'endAt',
                                    event.target.value
                                  )
                                }
                                className="h-7 px-2 text-xs bg-white border-gray-200"
                                required={config.enabled}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <label className="grid gap-1 text-xs">
                  <span className="font-medium text-[color:var(--portal-ink-800)]">
                    {locale === 'fil'
                      ? 'Tala (opsyonal)'
                      : 'Note (optional)'}
                  </span>

                  <Textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    className="min-h-[48px] h-[48px] text-xs resize-none"
                    placeholder={
                      locale === 'fil'
                        ? 'Magdagdag ng karagdagang tala...'
                        : 'Add optional note...'
                    }
                  />
                </label>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="border border-[color:var(--portal-border-soft)]"
                  >
                    {locale === 'fil'
                      ? 'Idagdag Slot'
                      : 'Add Slot'}
                  </Button>
                </div>
              </form>

              {feedback ? (
                <FormFeedback
                  tone={feedback.tone}
                  text={feedback.text}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {selectedSlotId ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4">
          <section
            aria-labelledby="slot-detail-modal-title"
            aria-modal="true"
            className="w-full max-w-[620px] overflow-hidden rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[0_24px_70px_rgba(13,45,29,0.28)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
              <div>
                <p className="text-xs text-[color:var(--portal-ink-500)]">
                  {selectedSlotId.substring(0, 8)}
                </p>

                <h2
                  id="slot-detail-modal-title"
                  className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]"
                >
                  {locale === 'fil'
                    ? 'Doctor Availability Slot'
                    : 'Doctor Availability Slot'}
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 min-h-8 px-2"
                onClick={() => setSelectedSlotId(null)}
                aria-label={locale === 'fil' ? 'Isara' : 'Close'}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-4 px-5 py-4">
              {slots.find((s) => s.id === selectedSlotId) ? (
                (() => {
                  const slot = slots.find(
                    (s) => s.id === selectedSlotId
                  )!;

                  return (
                    <div className="grid gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">
                            Dr. {slot.doctorName}
                          </p>

                          {doctorSpecializationMap.get(
                            slot.doctorName.trim().toLowerCase()
                          ) && (
                            <p className="text-xs text-[color:var(--portal-ink-500)]">
                              {doctorSpecializationMap.get(
                                slot.doctorName
                                  .trim()
                                  .toLowerCase()
                              )}
                            </p>
                          )}
                        </div>

                        <StatusBadge
                          tone={
                            slot.isBlocked
                              ? 'neutral'
                              : 'success'
                          }
                        >
                          {slot.isBlocked
                            ? locale === 'fil'
                              ? 'Close'
                              : 'Close'
                            : locale === 'fil'
                              ? 'Open'
                              : 'Open'}
                        </StatusBadge>
                      </div>

                      <div className="grid gap-1 text-sm text-[color:var(--portal-ink-700)]">
                        <p>
                          {locale === 'fil' ? 'Petsa' : 'Date'}:{' '}
                          <strong>{slot.date}</strong>
                        </p>

                        <p>
                          {locale === 'fil' ? 'Oras' : 'Time'}:{' '}
                          <strong>
                            {slotLabel(
                              slot.startAt,
                              slot.endAt
                            )}
                          </strong>
                        </p>

                        {slot.notes && (
                          <p>
                            {locale === 'fil'
                              ? 'Tala'
                              : 'Notes'}:{' '}
                            <strong>{slot.notes}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p>
                  {locale === 'fil'
                    ? 'Hindi nahanap ang slot.'
                    : 'Slot not found.'}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[color:var(--portal-border-soft)] px-5 py-4">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setSelectedSlotId(null)}
              >
                {locale === 'fil' ? 'Isara' : 'Close'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {showDoctorsModal ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4">
          <section
            aria-labelledby="manage-doctors-modal-title"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[0_24px_70px_rgba(13,45,29,0.28)]"
            role="dialog"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
              <h2
                id="manage-doctors-modal-title"
                className="text-base font-semibold text-[color:var(--portal-ink-900)]"
              >
                {locale === 'fil'
                  ? 'Imanage ang Doctors'
                  : 'Manage Doctors'}
              </h2>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 min-h-8 px-2"
                onClick={() => {
                  setShowDoctorsModal(false);
                  setEditingDoctorId(null);
                  setNewDoctorName('');
                  setNewDoctorSpecialization('');
                }}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            <div className="grid flex-1 gap-6 overflow-y-auto px-5 py-4">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  await upsertDoctor({
                    id: editingDoctorId || undefined,
                    name: newDoctorName,
                    specialization:
                      newDoctorSpecialization || undefined,
                    isActive: true,
                  });

                  setEditingDoctorId(null);
                  setNewDoctorName('');
                  setNewDoctorSpecialization('');
                }}
                className="grid gap-4 rounded-lg border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {editingDoctorId
                      ? locale === 'fil'
                        ? 'I-edit ang Doktor'
                        : 'Edit Doctor'
                      : locale === 'fil'
                        ? 'Magdagdag ng Doktor'
                        : 'Add New Doctor'}
                  </h3>

                  {editingDoctorId ? (
                    <button
                      type="button"
                      className="text-xs text-[color:var(--portal-ink-500)] underline hover:text-[color:var(--portal-ink-800)]"
                      onClick={() => {
                        setEditingDoctorId(null);
                        setNewDoctorName('');
                        setNewDoctorSpecialization('');
                      }}
                    >
                      {locale === 'fil'
                        ? 'Kanselahin ang Edit'
                        : 'Cancel Edit'}
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span>
                      {locale === 'fil' ? 'Pangalan' : 'Name'}
                    </span>

                    <Input
                      value={newDoctorName}
                      onChange={(e) =>
                        setNewDoctorName(e.target.value)
                      }
                      required
                      placeholder="e.g. Juan dela Cruz"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span>
                      {locale === 'fil'
                        ? 'Espesyalisasyon'
                        : 'Specialization'}{' '}
                      (Optional)
                    </span>

                    <Input
                      value={newDoctorSpecialization}
                      onChange={(e) =>
                        setNewDoctorSpecialization(
                          e.target.value
                        )
                      }
                      placeholder="e.g. General Practitioner"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="border border-[color:var(--portal-border-soft)]"
                  >
                    {editingDoctorId
                      ? locale === 'fil'
                        ? 'I-save ang Pagbabago'
                        : 'Save Changes'
                      : locale === 'fil'
                        ? 'Idagdag'
                        : 'Add Doctor'}
                  </Button>
                </div>
              </form>

              <div>
                <h3 className="mb-3 text-sm font-medium">
                  {locale === 'fil'
                    ? 'Listahan ng mga Doktor'
                    : 'Doctor List'}
                </h3>

                <div className="overflow-x-auto rounded-lg border border-[color:var(--portal-border-soft)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[color:var(--portal-surface-2)]">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">
                          {locale === 'fil'
                            ? 'Pangalan'
                            : 'Name'}
                        </th>

                        <th className="px-3 py-2 text-left font-semibold">
                          {locale === 'fil'
                            ? 'Espesyalisasyon'
                            : 'Specialization'}
                        </th>

                        <th className="px-3 py-2 text-center font-semibold">
                          {locale === 'fil'
                            ? 'Aksyon'
                            : 'Action'}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {state.doctors
                        .filter((d) => d.isActive)
                        .map((doc) => (
                          <tr
                            key={doc.id}
                            className="border-t border-[color:var(--portal-border-soft)]"
                          >
                            <td className="px-3 py-2">
                              Dr. {doc.name}
                            </td>

                            <td className="px-3 py-2">
                              {doc.specialization || '-'}
                            </td>

                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)] hover:text-[color:var(--portal-ink-900)]"
                                  title={
                                    locale === 'fil'
                                      ? 'I-edit ang Doktor'
                                      : 'Edit Doctor'
                                  }
                                  onClick={() => {
                                    setEditingDoctorId(doc.id);
                                    setNewDoctorName(doc.name);
                                    setNewDoctorSpecialization(
                                      doc.specialization || ''
                                    );
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title={
                                    locale === 'fil'
                                      ? 'Alisin ang Doktor'
                                      : 'Remove Doctor'
                                  }
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        locale === 'fil'
                                          ? 'Sigurado ka ba?'
                                          : 'Are you sure?'
                                      )
                                    ) {
                                      await deleteDoctor(doc.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}

                      {state.doctors.filter((d) => d.isActive)
                        .length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-4 text-center text-[color:var(--portal-ink-500)]"
                          >
                            {locale === 'fil'
                              ? 'Walang doktor.'
                              : 'No doctors found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="border border-[color:var(--portal-border-soft)]"
                    onClick={() => {
                      setFeedback(null);
                      setShowAddSlotModal(true);
                    }}
                  >
                    {locale === 'fil'
                      ? 'Magdagdag ng Schedule Slot'
                      : 'Add Schedule Slot'}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
