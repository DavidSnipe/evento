"use client";

import { Calendar, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildGoogleCalendarUrl,
  downloadCalendarEvents,
  sanitizeFilename,
} from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/calendar/types";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type CalendarExportActionsProps = {
  events: CalendarEvent | CalendarEvent[];
  filename: string;
  calendarName?: string;
  /** compact = menu row style */
  variant?: "buttons" | "menu";
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
};

function normalizeEvents(
  events: CalendarEvent | CalendarEvent[]
): CalendarEvent[] {
  return Array.isArray(events) ? events : [events];
}

export function CalendarExportActions({
  events,
  filename,
  calendarName,
  variant = "buttons",
  className,
  disabled,
  disabledReason,
}: CalendarExportActionsProps) {
  const list = normalizeEvents(events);
  const canExport = !disabled && list.length > 0;
  const safeName = sanitizeFilename(filename);

  const handleGoogle = () => {
    if (!canExport) return;
    const url = buildGoogleCalendarUrl(list[0]);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleIcs = () => {
    if (!canExport) return;
    downloadCalendarEvents(list, safeName, { calendarName });
  };

  if (variant === "menu") {
    return (
      <div className={cn("py-1", className)}>
        {disabledReason && (
          <p className="px-3 py-2 text-[10px] text-text-subtle">{disabledReason}</p>
        )}
        <button
          type="button"
          disabled={!canExport}
          onClick={handleGoogle}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#FEF0F3]/60 disabled:opacity-50 min-h-[44px]"
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {ro.calendar.addGoogle}
        </button>
        <button
          type="button"
          disabled={!canExport}
          onClick={handleIcs}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#FEF0F3]/60 disabled:opacity-50 min-h-[44px]"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          {ro.calendar.downloadIcs}
        </button>
        <p className="px-3 pb-1 text-[10px] text-text-subtle leading-snug">
          {ro.calendar.compatibleHint}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canExport}
        onClick={handleGoogle}
        className="h-9 text-xs gap-1.5"
      >
        <Calendar className="h-3.5 w-3.5" />
        {ro.calendar.addGoogle}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canExport}
        onClick={handleIcs}
        className="h-9 text-xs gap-1.5"
      >
        <Download className="h-3.5 w-3.5" />
        {ro.calendar.downloadIcs}
      </Button>
    </div>
  );
}
