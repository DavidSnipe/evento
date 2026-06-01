"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildGoogleCalendarUrl,
  dayScheduleExportLabel,
  dayScheduleItemsToCalendarEvents,
  downloadCalendarEvents,
  filterDayScheduleByScope,
  sanitizeFilename,
  type DayScheduleExportScope,
} from "@/lib/calendar";
import type { CalendarExportContext } from "@/lib/calendar/types";
import type { DayScheduleItemRow } from "@/types/day-schedule";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type DayScheduleExportMenuProps = {
  items: DayScheduleItemRow[];
  context: CalendarExportContext;
  activeDate: string;
  enabledSegments: { civil: boolean; religious: boolean; party: boolean };
  className?: string;
};

const SCOPES: DayScheduleExportScope[] = ["full", "civil", "religious", "party"];

export function DayScheduleExportMenu({
  items,
  context,
  activeDate,
  enabledSegments,
  className,
}: DayScheduleExportMenuProps) {
  const [open, setOpen] = useState(false);
  const dayItems = useMemo(
    () => items.filter((i) => i.schedule_date === activeDate),
    [items, activeDate]
  );

  const visibleScopes = SCOPES.filter((scope) => {
    if (scope === "full") return dayItems.length > 0;
    return enabledSegments[scope] && dayItems.some((i) => i.event_segment === scope);
  });

  const exportScope = (scope: DayScheduleExportScope) => {
    const filtered = filterDayScheduleByScope(dayItems, scope);
    const events = dayScheduleItemsToCalendarEvents(filtered, context);
    if (events.length === 0) return;
    const scopeSlug = scope === "full" ? "program-complet" : scope;
    downloadCalendarEvents(events, sanitizeFilename(`${context.eventTitle}-${scopeSlug}`), {
      calendarName: `${context.eventTitle} — ${dayScheduleExportLabel(scope)}`,
    });
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={dayItems.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="h-9 text-xs gap-1.5 shrink-0 min-h-[44px]"
      >
        <Calendar className="h-3.5 w-3.5" />
        {ro.calendar.exportSchedule}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 min-w-[240px] rounded-xl border border-[rgba(210,170,185,0.25)] bg-white py-1 shadow-lg">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
              {ro.calendar.downloadIcs}
            </p>
            {visibleScopes.map((scope) => (
              <button
                key={scope}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#FEF0F3]/60 min-h-[44px] text-left"
                onClick={() => exportScope(scope)}
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                {dayScheduleExportLabel(scope)}
              </button>
            ))}
            {dayItems.length === 1 && (
              <>
                <div className="my-1 border-t border-[rgba(210,170,185,0.12)]" />
                <a
                  href={buildGoogleCalendarUrl(
                    dayScheduleItemsToCalendarEvents(dayItems, context)[0]
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#FEF0F3]/60 min-h-[44px]"
                  onClick={() => setOpen(false)}
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {ro.calendar.addGoogle}
                </a>
              </>
            )}
            <p className="px-3 pb-2 text-[10px] text-text-subtle leading-snug border-t border-[rgba(210,170,185,0.12)] pt-2 mt-1">
              {ro.calendar.compatibleHint}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
