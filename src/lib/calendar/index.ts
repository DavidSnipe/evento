export type { CalendarEvent, CalendarEventInput, CalendarExportContext } from "@/lib/calendar/types";

export {
  addDaysToDateString,
  normalizeTimeToIcs,
  resolveTimezone,
  sanitizeFilename,
} from "@/lib/calendar/format";

export {
  buildIcsCalendar,
  buildIcsContent,
  calendarInputToEvent,
} from "@/lib/calendar/ics";

export {
  buildGoogleCalendarUrl,
  buildGoogleCalendarUrlFromInput,
} from "@/lib/calendar/google";

export {
  downloadCalendarEvents,
  downloadIcsFile,
  openGoogleCalendar,
} from "@/lib/calendar/download";

export {
  timelineTaskToCalendarEvent,
  milestoneGroupToCalendarEvents,
  timelineTasksToCalendarEvents,
} from "@/lib/calendar/mappers/timeline";

export {
  dayScheduleItemToCalendarEvent,
  dayScheduleItemsToCalendarEvents,
  filterDayScheduleByScope,
  dayScheduleExportLabel,
  type DayScheduleExportScope,
} from "@/lib/calendar/mappers/day-schedule";

export {
  buildCalendarUid,
  resolveCalendarEventUid,
  type CalendarSourceType,
} from "@/lib/calendar/uid";

export {
  buildSubscriptionFeedIcs,
  subscriptionFeedEtag,
  type CalendarSubscriptionPayload,
} from "@/lib/calendar/feed";

export {
  buildCalendarSubscriptionUrls,
  parseSubscriptionTokenParam,
  isValidSubscriptionToken,
  calendarFeedRateLimitKey,
} from "@/lib/calendar/subscription";

export function buildMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
