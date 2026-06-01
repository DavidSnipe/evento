import {
  addDaysToDateString,
  addHoursToDateTime,
  escapeIcs,
  foldIcsLine,
  formatIcsDate,
  icsNowUtc,
  normalizeTimeToIcs,
  resolveTimezone,
} from "@/lib/calendar/format";
import { resolveCalendarEventUid } from "@/lib/calendar/uid";
import type { CalendarEvent, CalendarEventInput } from "@/lib/calendar/types";

function buildDtStart(event: CalendarEvent, tz: string): string {
  if (event.allDay || (!event.startDateTime && event.startDate)) {
    const start = formatIcsDate(event.startDate!);
    return `DTSTART;VALUE=DATE:${start}`;
  }
  if (event.startDateTime) {
    const t = normalizeTimeToIcs(event.startDateTime.time);
    const d = formatIcsDate(event.startDateTime.date);
    return `DTSTART;TZID=${tz}:${d}T${t}`;
  }
  throw new Error("Calendar event missing start");
}

function buildDtEnd(event: CalendarEvent, tz: string): string {
  if (event.allDay || (!event.startDateTime && event.startDate)) {
    const end =
      event.endDate ??
      addDaysToDateString(event.startDate!, 1);
    return `DTEND;VALUE=DATE:${formatIcsDate(end)}`;
  }
  const endDt =
    event.endDateTime ??
    (event.startDateTime
      ? addHoursToDateTime(
          event.startDateTime.date,
          event.startDateTime.time,
          1
        )
      : null);
  if (!endDt) {
    const end = addDaysToDateString(event.startDate!, 1);
    return `DTEND;VALUE=DATE:${formatIcsDate(end)}`;
  }
  const t = normalizeTimeToIcs(endDt.time);
  const d = formatIcsDate(endDt.date);
  return `DTEND;TZID=${tz}:${d}T${t}`;
}

function bucharestVtimezone(): string[] {
  return [
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Bucharest",
    "X-LIC-LOCATION:Europe/Bucharest",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0300",
    "TZNAME:EEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0200",
    "TZNAME:EET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
}

function needsBucharestTz(events: CalendarEvent[], tz: string): boolean {
  return (
    tz === "Europe/Bucharest" &&
    events.some((e) => !e.allDay && e.startDateTime)
  );
}

function buildVevent(event: CalendarEvent, tz: string): string[] {
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${resolveCalendarEventUid(event)}`,
    `DTSTAMP:${icsNowUtc()}`,
    buildDtStart(event, tz),
    buildDtEnd(event, tz),
    `SUMMARY:${escapeIcs(event.title)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsCalendar(
  events: CalendarEvent[],
  options?: { calendarName?: string; timezone?: string; allowEmpty?: boolean }
): string {
  if (events.length === 0 && !options?.allowEmpty) {
    throw new Error("No calendar events to export");
  }

  const tz = resolveTimezone(options?.timezone);
  const body: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Evento//Calendar//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  if (options?.calendarName) {
    body.push(`X-WR-CALNAME:${escapeIcs(options.calendarName)}`);
  }

  if (needsBucharestTz(events, tz)) {
    body.push(...bucharestVtimezone());
  }

  for (const event of events) {
    body.push(...buildVevent(event, tz));
  }

  body.push("END:VCALENDAR");

  return body.map((line) => foldIcsLine(line)).join("\r\n");
}

/** Single all-day event (RSVP / legacy). */
export function buildIcsContent(input: CalendarEventInput): string {
  const event: CalendarEvent = {
    title: input.title,
    description: input.description,
    location: input.location,
    startDate: input.startDate,
    allDay: input.allDay ?? true,
  };
  return buildIcsCalendar([event]);
}

export function calendarInputToEvent(input: CalendarEventInput): CalendarEvent {
  return {
    title: input.title,
    description: input.description,
    location: input.location,
    startDate: input.startDate,
    allDay: input.allDay ?? true,
  };
}
