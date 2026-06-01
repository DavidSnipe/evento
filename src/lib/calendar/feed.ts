import { createHash } from "crypto";

import { buildIcsCalendar } from "@/lib/calendar/ics";
import { SUBSCRIPTION_FEED_TIMEZONE } from "@/lib/calendar/format";
import { dayScheduleItemsToCalendarEvents } from "@/lib/calendar/mappers/day-schedule";
import { timelineTasksToCalendarEvents } from "@/lib/calendar/mappers/timeline";
import type { CalendarExportContext } from "@/lib/calendar/types";
import type { DayScheduleItemRow } from "@/types/day-schedule";
import type { TimelineTaskWithRelations } from "@/types/timeline";

export type CalendarSubscriptionPayload = {
  event: {
    id: string;
    title: string;
    venue: string | null;
  };
  tasks: TimelineTaskWithRelations[];
  dayItems: DayScheduleItemRow[];
};

export function buildSubscriptionFeedIcs(
  payload: CalendarSubscriptionPayload,
  options?: { timezone?: string }
): string {
  const ctx: CalendarExportContext = {
    eventTitle: payload.event.title,
    eventVenue: payload.event.venue,
    timezone: options?.timezone ?? SUBSCRIPTION_FEED_TIMEZONE,
  };

  const taskEvents = timelineTasksToCalendarEvents(payload.tasks, ctx);
  const dayEvents = dayScheduleItemsToCalendarEvents(payload.dayItems, ctx);
  const events = [...taskEvents, ...dayEvents];

  return buildIcsCalendar(events, {
    calendarName: `Evento • ${payload.event.title}`,
    timezone: ctx.timezone,
    allowEmpty: true,
  });
}

export function subscriptionFeedEtag(content: string): string {
  return `"${createHash("sha256").update(content).digest("hex").slice(0, 16)}"`;
}
