import { buildIcsCalendar } from "@/lib/calendar/ics";
import { buildGoogleCalendarUrl } from "@/lib/calendar/google";
import type { CalendarEvent } from "@/lib/calendar/types";

export function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCalendarEvents(
  events: CalendarEvent[],
  filename: string,
  options?: { calendarName?: string; timezone?: string }
): void {
  const content = buildIcsCalendar(events, options);
  downloadIcsFile(content, filename);
}

export function openGoogleCalendar(event: CalendarEvent): void {
  window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
}
