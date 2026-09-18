import { expect, test } from '@playwright/test';
import { createAuthedApiContext } from '../_shared/automated/auth';
import { expectFailCode, expectOkJson } from '../_shared/automated/contracts';
import { createQaRunTag } from '../_shared/automated/env';

type Slot = {
  id: string;
  doctor_name: string;
  date: string;
  start_at: string;
  end_at: string;
  is_blocked: boolean;
};

type Appointment = {
  id: string;
  resident_id: string;
  slot_id: string;
  status: 'pending' | 'approved' | 'completed' | 'declined' | 'cancelled';
};

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

test.describe('Check-up Appointment Workflow', () => {
  test('staff configures slots, resident books, duplicate booking is blocked, and status/cancel flows work', async ({ request }) => {
    const runTag = createQaRunTag();
    const testDate = dateOffset(2);

    const staffCtx = await createAuthedApiContext(request, 'staff');
    const residentCtx = await createAuthedApiContext(request, 'resident');

    const createdAppointmentIds: string[] = [];
    const createdSlotIds: string[] = [];

    try {
      const createSlot = async (doctorName: string, startAt: string, endAt: string) => {
        const response = await staffCtx.api.post('/api/v1/doctor-availability-slots', {
          data: {
            doctorName,
            date: testDate,
            startAt,
            endAt,
            notes: `QA ${runTag}`,
          },
        });
        const payload = await expectOkJson<Slot>(response);
        createdSlotIds.push(payload.data.id);
        return payload.data;
      };

      // A: resident booking then cancel
      const slotA = await createSlot(`QA-Dr-A-${runTag}`, '09:00', '09:30');
      const residentSlotsA = await residentCtx.api.get(`/api/v1/doctor-availability-slots?date=${testDate}`);
      const residentSlotsPayloadA = await expectOkJson<{ slots: Slot[] }>(residentSlotsA);
      expect(residentSlotsPayloadA.data.slots.some((slot) => slot.id === slotA.id)).toBeTruthy();

      const bookAResponse = await residentCtx.api.post('/api/v1/checkup-appointments', {
        data: { slotId: slotA.id, reason: `QA reason A ${runTag}` },
      });
      const bookAPayload = await expectOkJson<Appointment>(bookAResponse);
      createdAppointmentIds.push(bookAPayload.data.id);
      expect(bookAPayload.data.slot_id).toBe(slotA.id);
      expect(bookAPayload.data.status).toBe('approved');

      const cancelAResponse = await residentCtx.api.delete(`/api/v1/checkup-appointments/${bookAPayload.data.id}`);
      const cancelAPayload = await expectOkJson<Appointment>(cancelAResponse);
      expect(cancelAPayload.data.status).toBe('cancelled');

      // B: staff updates status to completed
      const slotB = await createSlot(`QA-Dr-B-${runTag}`, '10:00', '10:30');
      const bookBResponse = await residentCtx.api.post('/api/v1/checkup-appointments', {
        data: { slotId: slotB.id, reason: `QA reason B ${runTag}` },
      });
      const bookBPayload = await expectOkJson<Appointment>(bookBResponse);
      createdAppointmentIds.push(bookBPayload.data.id);

      const completeBResponse = await staffCtx.api.patch(`/api/v1/checkup-appointments/${bookBPayload.data.id}/status`, {
        data: { status: 'completed', staffNote: `Completed by QA ${runTag}` },
      });
      const completeBPayload = await expectOkJson<Appointment>(completeBResponse);
      expect(completeBPayload.data.status).toBe('completed');

      // C: duplicate booking blocked
      const slotC = await createSlot(`QA-Dr-C-${runTag}`, '11:00', '11:30');
      const firstBookCResponse = await residentCtx.api.post('/api/v1/checkup-appointments', {
        data: { slotId: slotC.id, reason: `QA reason C1 ${runTag}` },
      });
      const firstBookCPayload = await expectOkJson<Appointment>(firstBookCResponse);
      createdAppointmentIds.push(firstBookCPayload.data.id);

      const duplicateBookCResponse = await residentCtx.api.post('/api/v1/checkup-appointments', {
        data: { slotId: slotC.id, reason: `QA reason C2 ${runTag}` },
      });
      expect(duplicateBookCResponse.status()).toBe(409);
      await expectFailCode(duplicateBookCResponse, 'RESOURCE_CONFLICT');
    } finally {
      // Best-effort cleanup so QA data does not accumulate.
      for (const appointmentId of createdAppointmentIds) {
        await staffCtx.api.delete(`/api/v1/checkup-appointments/${appointmentId}`).catch(() => undefined);
      }
      for (const slotId of createdSlotIds) {
        await staffCtx.api.delete(`/api/v1/doctor-availability-slots/${slotId}`).catch(() => undefined);
      }
      await staffCtx.api.dispose();
      await residentCtx.api.dispose();
    }
  });
});

