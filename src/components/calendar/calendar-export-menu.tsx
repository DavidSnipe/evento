"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildGoogleCalendarUrl,
  downloadCalendarEvents,
  sanitizeFilename,
} from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/calendar/types";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type CalendarExportMenuProps = {
  events: CalendarEvent[];
  filename: string;
  calendarName?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function CalendarExportMenu({
  events,
  filename,
  calendarName,
  label = ro.calendar.exportSchedule,
  className,
  disabled,
}: CalendarExportMenuProps) {
  const [open, setOpen] = useState(false);
  const canExport = !disabled && events.length > 0;
  const safeName = sanitizeFilename(filename);

  const googleUrl = useMemo(() => {
    if (events.length !== 1) return null;
    try {
      return buildGoogleCalendarUrl(events[0]);
    } catch {
      return null;
    }
  }, [events]);

  return (
    <div className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canExport}
        onClick={() => setOpen((v) => !v)}
        className="h-9 text-xs gap-1.5 shrink-0"
      >
        <Calendar className="h-3.5 w-3.5" />
        {label}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 min-w-[220px] rounded-xl border border-[rgba(210,170,185,0.25)] bg-white py-1 shadow-lg">
            {googleUrl && (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#FEF0F3]/60 min-h-[44px]"
                onClick={() => setOpen(false)}
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {ro.calendar.addGoogle}
              </a>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#FEF0F3]/60 min-h-[44px]"
              onClick={() => {
                downloadCalendarEvents(events, safeName, { calendarName });
                setOpen(false);
              }}
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              {ro.calendar.downloadIcs}
            </button>
            <p className="px-3 pb-2 text-[10px] text-text-subtle leading-snug border-t border-[rgba(210,170,185,0.12)] pt-2 mt-1">
              {ro.calendar.compatibleHint}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
