/** Stable ICS UID source types included in subscription feeds. */
export type CalendarSourceType = "timeline_task" | "day_schedule_item";

const UID_DOMAIN = "evento.app";

/**
 * Stable calendar UID — independent of dates/times.
 * Format: {eventId}-{sourceType}-{sourceId}@evento.app
 */
export function buildCalendarUid(
  eventId: string,
  sourceType: CalendarSourceType,
  sourceId: string
): string {
  return `${eventId}-${sourceType}-${sourceId}@${UID_DOMAIN}`;
}

export function resolveCalendarEventUid(event: {
  uid?: string;
  eventId?: string;
  sourceType?: CalendarSourceType;
  sourceId?: string;
  id?: string;
  title?: string;
  startDate?: string;
  startDateTime?: { date: string };
}): string {
  if (event.uid) return event.uid;
  if (event.eventId && event.sourceType && event.sourceId) {
    return buildCalendarUid(event.eventId, event.sourceType, event.sourceId);
  }
  const fallbackDate =
    event.startDate ?? event.startDateTime?.date ?? "nodate";
  const base = event.id ?? event.title?.replace(/\s+/g, "-").toLowerCase() ?? "event";
  return `${base}-${fallbackDate}@${UID_DOMAIN}`;
}
