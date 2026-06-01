"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Loader2, Sparkles } from "lucide-react";

import { DayScheduleExportMenu } from "@/components/calendar/day-schedule-export-menu";
import { CalendarSubscribeButton } from "@/components/calendar/calendar-subscribe-button";
import { DayScheduleConflictBanner } from "@/components/day-schedule/day-schedule-conflict-banner";
import { DayScheduleCreateForm } from "@/components/day-schedule/day-schedule-create-form";
import { DayScheduleDateTabs } from "@/components/day-schedule/day-schedule-date-tabs";
import { DayScheduleTimeline } from "@/components/day-schedule/day-schedule-timeline";
import { Button } from "@/components/ui/button";
import { useDayScheduleOptimistic } from "@/hooks/day-schedule/use-day-schedule-optimistic";
import { detectScheduleConflicts } from "@/lib/day-schedule/conflicts";
import { uniqueScheduleDates } from "@/lib/day-schedule/utils";
import { resolveTimezone } from "@/lib/calendar/format";
import type { CalendarExportContext } from "@/lib/calendar/types";
import { formatEventDate } from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";
import type {
  DayScheduleItemRow,
  DayScheduleSegment,
  EnabledDaySegments,
} from "@/types/day-schedule";

type DaySchedulePlannerProps = {
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  eventVenue?: string | null;
  subscriptionUrls?: { httpsUrl: string; webcalUrl: string } | null;
  initialItems: DayScheduleItemRow[];
  enabledSegments: EnabledDaySegments;
};

export function DaySchedulePlanner({
  eventId,
  eventTitle,
  eventDate,
  eventVenue,
  subscriptionUrls,
  initialItems,
  enabledSegments,
}: DaySchedulePlannerProps) {
  const {
    items,
    syncingItemIds,
    isReordering,
    isGenerating,
    createItemOptimistic,
    updateItemOptimistic,
    deleteItemOptimistic,
    reorderOptimistic,
    generateScheduleOptimistic,
  } = useDayScheduleOptimistic(eventId, initialItems);

  const dates = useMemo(
    () => uniqueScheduleDates(items, eventDate),
    [items, eventDate]
  );

  const [activeDate, setActiveDate] = useState(
    eventDate ?? dates[0] ?? new Date().toISOString().slice(0, 10)
  );
  const [generateError, setGenerateError] = useState<string | null>(null);

  const dayItems = useMemo(
    () => items.filter((i) => i.schedule_date === activeDate),
    [items, activeDate]
  );

  const conflicts = useMemo(
    () =>
      detectScheduleConflicts(dayItems, {
        overlap: (a, b) => ro.daySchedule.conflicts.overlap(a, b),
        invalidDuration: (title) => ro.daySchedule.conflicts.invalidDuration(title),
        duplicateTime: (title) => ro.daySchedule.conflicts.duplicateTime(title),
        duplicatePerson: (person) => ro.daySchedule.conflicts.duplicatePerson(person),
      }),
    [dayItems]
  );

  const segmentSummary = useMemo(() => {
    const parts: string[] = [];
    if (enabledSegments.civil) parts.push(ro.daySchedule.segment.civil);
    if (enabledSegments.religious) parts.push(ro.daySchedule.segment.religious);
    if (enabledSegments.party) parts.push(ro.daySchedule.segment.party);
    return parts.join(" · ");
  }, [enabledSegments]);

  const handleAddDate = (date: string) => {
    setActiveDate(date);
    if (!dates.includes(date)) {
      // date will appear once first item is added
    }
  };

  const handleGenerate = async () => {
    setGenerateError(null);
    const result = await generateScheduleOptimistic(activeDate);
    if (result.error) setGenerateError(result.error);
  };

  const isEmpty = dayItems.length === 0;

  const calendarContext = useMemo<CalendarExportContext>(
    () => ({
      eventTitle,
      eventVenue,
      timezone: resolveTimezone(),
    }),
    [eventTitle, eventVenue]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[rgba(210,170,185,0.2)] bg-gradient-to-br from-[#FEF8F9] via-white to-[#FFFDFE] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF0F3] border border-[#FCEAEF]">
              <CalendarClock className="h-5 w-5 text-[#B8516B]" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-[#1A0E14]">
                {formatEventDate(activeDate) ?? ro.daySchedule.title}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {dayItems.length}{" "}
                {dayItems.length === 1
                  ? ro.daySchedule.itemCount.one
                  : ro.daySchedule.itemCount.many}
                {segmentSummary ? ` · ${segmentSummary}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {subscriptionUrls && (
              <CalendarSubscribeButton
                httpsUrl={subscriptionUrls.httpsUrl}
                webcalUrl={subscriptionUrls.webcalUrl}
              />
            )}
            {!isEmpty && (
              <DayScheduleExportMenu
                items={items}
                context={calendarContext}
                activeDate={activeDate}
                enabledSegments={enabledSegments}
              />
            )}
          {isEmpty && (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="min-h-[48px] shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {ro.daySchedule.checklist.generate}
            </Button>
          )}
          </div>
        </div>
        {generateError && (
          <p className="mt-3 text-xs text-red-600">{generateError}</p>
        )}
      </div>

      <DayScheduleDateTabs
        dates={dates.length > 0 ? dates : [activeDate]}
        value={activeDate}
        onChange={setActiveDate}
        onAddDate={handleAddDate}
      />

      <DayScheduleConflictBanner conflicts={conflicts} />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(210,170,185,0.35)] px-6 py-14 text-center">
          <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
            {ro.daySchedule.empty.desc}
          </p>
          <Button
            type="button"
            className="mt-5 min-h-[48px]"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {ro.daySchedule.checklist.generate}
          </Button>
        </div>
      ) : (
        <DayScheduleTimeline
          items={dayItems}
          calendarContext={calendarContext}
          conflicts={conflicts}
          syncingItemIds={syncingItemIds}
          isReordering={isReordering}
          onReorder={(orderedIds) => reorderOptimistic(orderedIds)}
          onUpdate={(id, input) => updateItemOptimistic(id, input)}
          onDelete={(id) => deleteItemOptimistic(id)}
        />
      )}

      <DayScheduleCreateForm
        scheduleDate={activeDate}
        defaultSegment={
          (enabledSegments.party
            ? "party"
            : enabledSegments.civil
              ? "civil"
              : "religious") as DayScheduleSegment
        }
        onCreate={(input) => createItemOptimistic(input)}
      />
    </div>
  );
}
