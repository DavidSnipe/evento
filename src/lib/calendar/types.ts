import type { CalendarSourceType } from "@/lib/calendar/uid";

/** Normalized calendar event for ICS + Google Calendar links. */
export type CalendarEvent = {
  /** Precomputed stable UID (preferred) */
  uid?: string;
  eventId?: string;
  sourceType?: CalendarSourceType;
  sourceId?: string;
  /** Legacy / display id */
  id?: string;
  title: string;
  description?: string;
  location?: string;
  /** All-day: YYYY-MM-DD */
  startDate?: string;
  /** All-day exclusive end date (YYYY-MM-DD). Defaults to day after startDate. */
  endDate?: string;
  /** Timed start (local) */
  startDateTime?: { date: string; time: string };
  /** Timed end (local). If omitted, +1 hour from start. */
  endDateTime?: { date: string; time: string };
  allDay?: boolean;
  /** IANA timezone, e.g. Europe/Bucharest */
  timezone?: string;
  /** Reserved for future VALARM / sync — not exported yet */
  reminderMinutes?: number;
};

/** Backward-compatible RSVP all-day input */
export type CalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  allDay?: boolean;
};

export type CalendarExportContext = {
  eventTitle: string;
  eventVenue?: string | null;
  timezone?: string;
};
