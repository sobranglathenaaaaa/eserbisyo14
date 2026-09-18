
const OFFICE_START = '08:00';
const OFFICE_END = '17:00';

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isClock(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function toDateTime(date: string, clock: string) {
  return `${date}T${clock}:00+08:00`;
}

function toMinutes(clock: string) {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

export function validateSlotWindow(input: {
  date: string;
  startAt: string;
  endAt: string;
}): { ok: true; startAtIso: string; endAtIso: string } | { ok: false; message: string } {
  if (!isIsoDate(input.date)) {
    return { ok: false, message: 'date must be in YYYY-MM-DD format' };
  }
  if (!isClock(input.startAt) || !isClock(input.endAt)) {
    return { ok: false, message: 'startAt and endAt must be in HH:MM format' };
  }

  const startMinutes = toMinutes(input.startAt);
  const endMinutes = toMinutes(input.endAt);
  const officeStart = toMinutes(OFFICE_START);
  const officeEnd = toMinutes(OFFICE_END);

  if (startMinutes < officeStart || endMinutes > officeEnd) {
    return { ok: false, message: 'slot must be within office hours (08:00 to 17:00)' };
  }
  if (endMinutes <= startMinutes) {
    return { ok: false, message: 'end time must be after start time' };
  }

  return {
    ok: true,
    startAtIso: toDateTime(input.date, input.startAt),
    endAtIso: toDateTime(input.date, input.endAt),
  };
}

export function toClock(isoValue: string) {
  const match = isoValue.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? '';
}

