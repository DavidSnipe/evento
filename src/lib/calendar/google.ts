import {
  addDaysToDateString,
  addHoursToDateTime,
  formatIcsDate,
  normalizeTimeToIcs,
  resolveTimezone,
} from "@/lib/calendar/format";
import type { CalendarEvent, CalendarEventInput } from "@/lib/calendar/types";
import { calendarInputToEvent } from "@/lib/calendar/ics";

function googleDatesAllDay(start: string, endExclusive: string): string {
  return `${formatIcsDate(start)}/${formatIcsDate(endExclusive)}`;
}

function googleDatesTimed(
  start: { date: string; time: string },
  end: { date: string; time: string }
): string {
  const s = `${formatIcsDate(start.date)}T${normalizeTimeToIcs(start.time)}`;
  const e = `${formatIcsDate(end.date)}T${normalizeTimeToIcs(end.time)}`;
  return `${s}/${e}`;
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const tz = resolveTimezone(event.timezone);
  let dates: string;

  if (event.allDay || (!event.startDateTime && event.startDate)) {
    const end =
      event.endDate ?? addDaysToDateString(event.startDate!, 1);
    dates = googleDatesAllDay(event.startDate!, end);
  } else if (event.startDateTime) {
    const end =
      event.endDateTime ??
      addHoursToDateTime(
        event.startDateTime.date,
        event.startDateTime.time,
        1
      );
    dates = googleDatesTimed(event.startDateTime, end);
  } else {
    throw new Error("Calendar event missing start");
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: event.description ?? "",
    location: event.location ?? "",
    ctz: tz,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Legacy RSVP helper */
export function buildGoogleCalendarUrlFromInput(input: CalendarEventInput): string {
  return buildGoogleCalendarUrl(calendarInputToEvent(input));
}
