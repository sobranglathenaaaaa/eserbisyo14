'use client';

import { FormEvent, useMemo, useState } from 'react';
import { FormFeedback, PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { copyText } from '@/features/resident/model/copy';
import { ResidentEmpty, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { cancelCheckupAppointment, createCheckupAppointment } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { formatDateTime } from '@/lib/formatters';

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

export default function ResidentMedicinesPage() {
  const { state, user, locale } = useAppState();
  const pageCopy = getRolePageCopy('resident/medicines');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  const doctorSpecializationMap = useMemo(() => {
    const map = new Map<string, string>();
    state.doctors.forEach((d) => {
      if (d.name && d.specialization) {
        map.set(d.name.trim().toLowerCase(), d.specialization);
      }
    });
    return map;
  }, [state.doctors]);

  const slotBookedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.checkupAppointments.forEach((item) => {
      if (['pending', 'approved', 'completed'].includes(item.status)) {
        counts[item.slotId] = (counts[item.slotId] || 0) + 1;
      }
    });
    return counts;
  }, [state.checkupAppointments]);

  const availableSlots = useMemo(
    () =>
      state.doctorAvailabilitySlots
        .filter((slot) => !slot.isBlocked && (slotBookedCounts[slot.id] || 0) < (slot.capacity || 7))
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [state.doctorAvailabilitySlots, slotBookedCounts]
  );

  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? availableSlots[0] ?? null;

  const myAppointments = useMemo(
    () =>
      state.checkupAppointments
        .filter((item) => item.residentId === user?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.checkupAppointments, user?.id]
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlot) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Please pick an available schedule first.', 'Pumili muna ng available na schedule.'),
      });
      return;
    }
    if (!reason.trim()) {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Please provide your check-up reason.', 'Ilagay ang dahilan ng iyong check-up.'),
      });
      return;
    }

    setSubmitting(true);
    try {
      await createCheckupAppointment({
        slotId: selectedSlot.id,
        reason: reason.trim(),
      });
      setReason('');
      setFeedback({
        tone: 'success',
        text: copyText(
          locale,
          'Appointment submitted successfully. It is now pending review.',
          'Matagumpay na naipadala ang appointment. Naka-pending review na ito.'
        ),
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : copyText(locale, 'Unable to book appointment.', 'Hindi ma-book ang appointment.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (appointmentId: string) => {
    setCancelingId(appointmentId);
    try {
      await cancelCheckupAppointment(appointmentId);
      setFeedback({
        tone: 'success',
        text: copyText(locale, 'Appointment cancelled.', 'Nakansela na ang appointment.'),
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : copyText(locale, 'Unable to cancel appointment.', 'Hindi ma-cancel ang appointment.'),
      });
    } finally {
      setCancelingId(null);
    }
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

      <ResidentSection
        title={copyText(locale, 'Book an appointment', 'Mag-book ng appointment')}
        description={copyText(
          locale,
          'Pick an available doctor schedule and submit your check-up reason. Doctor availability at the center is every Tuesday and Thursday only.',
          'Pumili ng available na schedule ng doktor at ilagay ang dahilan ng check-up. Available lang ang doktor sa center tuwing Tuesday at Thursday.'
        )}
        tone="accent"
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_minmax(260px,0.8fr)]">
          <Card className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] bg-white p-4">
            {!availableSlots.length ? (
              <ResidentEmpty
                title={copyText(locale, 'No available schedule yet', 'Wala pang available na schedule')}
                description={copyText(locale, 'Please check again later after staff updates doctor availability.', 'Bumalik mamaya kapag na-update na ng staff ang schedule ng doktor.')}
              />
            ) : (
              <form className="grid gap-3" onSubmit={onSubmit}>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[color:var(--resident-ink-900)]">
                    {copyText(locale, 'Available slot', 'Available na slot')}
                  </span>
                  <Select
                    value={selectedSlotId || selectedSlot?.id || ''}
                    onChange={(event) => setSelectedSlotId(event.target.value)}
                  >
                    {availableSlots.map((slot) => {
                      const spec = doctorSpecializationMap.get(slot.doctorName.trim().toLowerCase());
                      return (
                        <option key={slot.id} value={slot.id}>
                          {slot.date} · Dr. {slot.doctorName}{spec ? ` (${spec})` : ''} · {slotLabel(slot.startAt, slot.endAt)}
                        </option>
                      );
                    })}
                  </Select>
                </label>

                {selectedSlot ? (
                  <div className="rounded-xl border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-3)] p-3 text-sm">
                    <p className="font-semibold text-[color:var(--resident-ink-900)]">
                      Dr. {selectedSlot.doctorName}
                      {doctorSpecializationMap.get(selectedSlot.doctorName.trim().toLowerCase()) ? (
                        <span className="ml-1.5 font-normal text-xs text-[color:var(--resident-ink-600)]">
                          ({doctorSpecializationMap.get(selectedSlot.doctorName.trim().toLowerCase())})
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[color:var(--resident-ink-700)]">
                      {selectedSlot.date} · {slotLabel(selectedSlot.startAt, selectedSlot.endAt)}
                    </p>
                  </div>
                ) : null}

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[color:var(--resident-ink-900)]">
                    {copyText(locale, 'Check-up reason', 'Dahilan ng check-up')}
                  </span>
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-h-[110px]"
                    placeholder={copyText(locale, 'Example: Fever and persistent cough for two days.', 'Halimbawa: Lagnat at ubo na tuloy-tuloy sa loob ng dalawang araw.')}
                    required
                  />
                </label>

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] text-white shadow-[0_10px_24px_rgba(21,95,64,0.28)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)] md:w-auto"
                  >
                    {submitting
                      ? copyText(locale, 'Booking...', 'Nagbo-book...')
                      : copyText(locale, 'Book appointment', 'I-book ang appointment')}
                  </Button>
                </div>

                {feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}
              </form>
            )}
          </Card>

          <Card className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f4faf7_100%)] p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--resident-ink-500)]">
              {copyText(locale, 'Appointment stats', 'Appointment stats')}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-[color:var(--resident-border-soft)] bg-white p-3">
                <p className="text-xs text-[color:var(--resident-ink-500)]">{copyText(locale, 'Total appointments', 'Kabuuang appointment')}</p>
                <p className="mt-1 text-2xl font-semibold text-[color:var(--resident-ink-900)]">{myAppointments.length}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--resident-border-soft)] bg-white p-3">
                <p className="text-xs text-[color:var(--resident-ink-500)]">{copyText(locale, 'Pending/approved', 'Pending/approved')}</p>
                <p className="mt-1 text-2xl font-semibold text-[color:var(--resident-ink-900)]">
                  {myAppointments.filter((item) => item.status === 'pending' || item.status === 'approved').length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </ResidentSection>

      <ResidentSection
        title={copyText(locale, 'My appointments', 'Aking appointments')}
        description={copyText(locale, 'Track your check-up status and cancel upcoming appointments if needed.', 'Subaybayan ang status ng check-up at i-cancel ang upcoming appointment kung kailangan.')}
      >
        {!myAppointments.length ? (
          <ResidentEmpty
            title={copyText(locale, 'No appointments yet', 'Wala ka pang appointment')}
            description={copyText(locale, 'Book your first check-up appointment above.', 'I-book ang unang check-up appointment sa itaas.')}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myAppointments.map((item) => {
              const spec = doctorSpecializationMap.get(item.doctorName.trim().toLowerCase());
              return (
                <Card key={item.id} className="rounded-[var(--resident-radius-md)] border-[color:var(--resident-border-soft)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--resident-ink-900)]">
                        Dr. {item.doctorName}
                        {spec ? (
                          <span className="ml-1.5 font-normal text-xs text-[color:var(--resident-ink-600)]">
                            ({spec})
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--resident-ink-700)]">{item.date} · {slotLabel(item.startAt, item.endAt)}</p>
                      <p className="mt-2 text-xs text-[color:var(--resident-ink-700)]">
                        {copyText(locale, 'Reason', 'Dahilan')}: {item.reason}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--resident-ink-500)]">
                        {copyText(locale, 'Updated', 'Na-update')}: {formatDateTime(item.updatedAt, locale)}
                      </p>
                    </div>
                    <StatusBadge tone={statusToneFromState(item.status)}>{item.status}</StatusBadge>
                  </div>
                {(item.status === 'pending' || item.status === 'approved') ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={cancelingId === item.id}
                      onClick={() => void onCancel(item.id)}
                    >
                      {cancelingId === item.id
                        ? copyText(locale, 'Cancelling...', 'Kini-cancel...')
                        : copyText(locale, 'Cancel appointment', 'I-cancel ang appointment')}
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
          </div>
        )}
      </ResidentSection>
    </ResidentShell>
  );
}
