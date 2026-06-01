"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { DayScheduleItemCard } from "@/components/day-schedule/day-schedule-item-card";
import { cn } from "@/lib/utils";
import type { CalendarExportContext } from "@/lib/calendar/types";
import { ro } from "@/lib/i18n/ro";
import type { ScheduleConflict } from "@/lib/day-schedule/conflicts";
import type { DayScheduleItemInput, DayScheduleItemRow } from "@/types/day-schedule";

type DayScheduleTimelineProps = {
  items: DayScheduleItemRow[];
  calendarContext?: CalendarExportContext;
  conflicts: ScheduleConflict[];
  syncingItemIds: Set<string>;
  isReordering?: boolean;
  onReorder: (orderedIds: string[]) => void;
  onUpdate: (itemId: string, input: DayScheduleItemInput) => void;
  onDelete: (itemId: string) => void;
};

function sortDayItems(items: DayScheduleItemRow[]): DayScheduleItemRow[] {
  return [...items].sort((a, b) => {
    if (a.start_time !== b.start_time) {
      return a.start_time.localeCompare(b.start_time);
    }
    return a.sort_order - b.sort_order;
  });
}

export function DayScheduleTimeline({
  items,
  calendarContext,
  conflicts,
  syncingItemIds,
  isReordering,
  onReorder,
  onUpdate,
  onDelete,
}: DayScheduleTimelineProps) {
  const sorted = useMemo(() => sortDayItems(items), [items]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);

  const finishDrag = useCallback(() => {
    dragIdRef.current = null;
    dropIndexRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
  }, []);

  const handlePointerDown = useCallback(
    (itemId: string) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragIdRef.current = itemId;
      setDraggingId(itemId);

      const onMove = (ev: PointerEvent) => {
        const elements = document.elementsFromPoint(ev.clientX, ev.clientY);
        const row = elements.find(
          (el) =>
            el instanceof HTMLElement && el.dataset.scheduleIndex != null
        ) as HTMLElement | undefined;
        if (row?.dataset.scheduleIndex) {
          const idx = Number.parseInt(row.dataset.scheduleIndex, 10);
          dropIndexRef.current = idx;
          setDropIndex(idx);
        }
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        const fromId = dragIdRef.current;
        const toIndex = dropIndexRef.current;
        finishDrag();

        if (fromId == null || toIndex == null) return;

        const fromIndex = sorted.findIndex((i) => i.id === fromId);
        if (fromIndex < 0 || fromIndex === toIndex) return;

        const reordered = [...sorted];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved!);
        onReorder(reordered.map((i) => i.id));
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [sorted, onReorder, finishDrag]
  );

  if (sorted.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[rgba(210,170,185,0.35)] px-6 py-12 text-center text-sm text-text-secondary">
        {ro.daySchedule.emptyDay}
      </p>
    );
  }

  return (
    <div className="relative pl-2 sm:pl-4">
      <div
        className="absolute left-[1.35rem] sm:left-[2.35rem] top-4 bottom-4 w-px bg-gradient-to-b from-[#FCEAEF] via-[#E8748A]/40 to-[#FCEAEF]"
        aria-hidden
      />

      <ul className="space-y-4">
        {sorted.map((item, index) => (
          <li
            key={item.id}
            data-schedule-index={index}
            className={cn(
              "relative pl-8 sm:pl-12 transition-opacity",
              draggingId === item.id && "opacity-50",
              dropIndex === index && draggingId && draggingId !== item.id && "translate-y-1"
            )}
          >
            <span
              className={cn(
                "absolute left-3 sm:left-5 top-6 z-10 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                item.event_segment === "civil"
                  ? "bg-sky-400"
                  : item.event_segment === "religious"
                    ? "bg-violet-400"
                    : "bg-[#E8748A]"
              )}
              aria-hidden
            />
            <DayScheduleItemCard
              item={item}
              calendarContext={calendarContext}
              syncing={syncingItemIds.has(item.id) || isReordering}
              conflicts={conflicts}
              dragHandleProps={{
                onPointerDown: handlePointerDown(item.id),
                isDragging: draggingId === item.id,
              }}
              onUpdate={(input) => onUpdate(item.id, input)}
              onDelete={() => onDelete(item.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
