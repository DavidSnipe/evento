import { buildCalendarUid } from "@/lib/calendar/uid";
import { ro } from "@/lib/i18n/ro";
import type { CalendarEvent, CalendarExportContext } from "@/lib/calendar/types";
import type { DayScheduleItemRow, DayScheduleSegment } from "@/types/day-schedule";

function normalizeTime(time: string): string {
  return time.length >= 8 ? time.slice(0, 8) : `${time.slice(0, 5)}:00`;
}

function buildItemDescription(
  item: DayScheduleItemRow,
  ctx: CalendarExportContext
): string | undefined {
  const parts: string[] = [];
  if (item.notes) parts.push(item.notes);
  if (item.responsible_person) {
    parts.push(`${ro.daySchedule.form.responsible}: ${item.responsible_person}`);
  }
  parts.push(ro.daySchedule.segment[item.event_segment]);
  if (item.vendor_role) {
    parts.push(ro.daySchedule.vendorRole[item.vendor_role]);
  }
  parts.push(ctx.eventTitle);
  const text = parts.filter(Boolean).join("\n");
  return text || undefined;
}

export function dayScheduleItemToCalendarEvent(
  item: DayScheduleItemRow,
  ctx: CalendarExportContext
): CalendarEvent {
  const startTime = normalizeTime(item.start_time);
  const endTime = item.end_time ? normalizeTime(item.end_time) : undefined;
  const uid = buildCalendarUid(item.event_id, "day_schedule_item", item.id);

  return {
    uid,
    eventId: item.event_id,
    sourceType: "day_schedule_item",
    sourceId: item.id,
    id: item.id,
    title: item.title,
    description: buildItemDescription(item, ctx),
    location: item.location ?? ctx.eventVenue ?? undefined,
    startDateTime: { date: item.schedule_date, time: startTime },
    endDateTime: endTime
      ? { date: item.schedule_date, time: endTime }
      : undefined,
    allDay: false,
    timezone: ctx.timezone,
  };
}

export function dayScheduleItemsToCalendarEvents(
  items: DayScheduleItemRow[],
  ctx: CalendarExportContext
): CalendarEvent[] {
  return [...items]
    .sort((a, b) => {
      const dateCmp = a.schedule_date.localeCompare(b.schedule_date);
      if (dateCmp !== 0) return dateCmp;
      return a.start_time.localeCompare(b.start_time);
    })
    .map((item) => dayScheduleItemToCalendarEvent(item, ctx));
}

export type DayScheduleExportScope =
  | "full"
  | DayScheduleSegment;

export function filterDayScheduleByScope(
  items: DayScheduleItemRow[],
  scope: DayScheduleExportScope
): DayScheduleItemRow[] {
  if (scope === "full") return items;
  return items.filter((i) => i.event_segment === scope);
}

export function dayScheduleExportLabel(scope: DayScheduleExportScope): string {
  if (scope === "full") return ro.calendar.export.fullWeddingProgram;
  return ro.calendar.export.segment[scope];
}
