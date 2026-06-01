import {
  DAY_SCHEDULE_SEGMENTS,
  DAY_SCHEDULE_VENDOR_ROLES,
  type DayScheduleItemInput,
  type DayScheduleSegment,
  type DayScheduleVendorRole,
} from "@/types/day-schedule";

export type DayScheduleActionResult = {
  error?: string;
  success?: boolean;
  id?: string;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseScheduleTime(value: string): string | null {
  const trimmed = value.trim();
  if (!TIME_RE.test(trimmed)) return null;
  return trimmed.slice(0, 5);
}

export function parseScheduleDate(value: string): string | null {
  const trimmed = value.trim();
  if (!DATE_RE.test(trimmed)) return null;
  return trimmed;
}

export function parseDayScheduleSegment(value: string): DayScheduleSegment | null {
  return DAY_SCHEDULE_SEGMENTS.includes(value as DayScheduleSegment)
    ? (value as DayScheduleSegment)
    : null;
}

export function parseDayScheduleVendorRole(
  value: string
): DayScheduleVendorRole | null {
  return DAY_SCHEDULE_VENDOR_ROLES.includes(value as DayScheduleVendorRole)
    ? (value as DayScheduleVendorRole)
    : null;
}

export function validateDayScheduleItemInput(
  input: DayScheduleItemInput
): string | null {
  if (!input.title?.trim()) return "Titlul este obligatoriu.";

  const date = parseScheduleDate(input.scheduleDate);
  if (!date) return "Data programului este invalidă.";

  const start = parseScheduleTime(input.startTime);
  if (!start) return "Ora de început este invalidă.";

  if (input.endTime) {
    const end = parseScheduleTime(input.endTime);
    if (!end) return "Ora de sfârșit este invalidă.";
    if (end <= start) return "Ora de sfârșit trebuie să fie după început.";
  }

  if (input.eventSegment && !parseDayScheduleSegment(input.eventSegment)) {
    return "Segment invalid.";
  }

  if (input.vendorRole && !parseDayScheduleVendorRole(input.vendorRole)) {
    return "Rol furnizor invalid.";
  }

  return null;
}

export function formatTimeDisplay(time: string): string {
  return time.slice(0, 5);
}
