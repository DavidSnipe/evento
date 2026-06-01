import type { DayScheduleItemRow } from "@/types/day-schedule";

export type ScheduleConflictType = "overlap" | "invalid_duration" | "duplicate";

export type ScheduleConflict = {
  type: ScheduleConflictType;
  itemIds: string[];
  message: string;
};

function timeToMinutes(time: string): number {
  const parts = time.slice(0, 5).split(":");
  return Number.parseInt(parts[0] ?? "0", 10) * 60 + Number.parseInt(parts[1] ?? "0", 10);
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function itemRange(item: DayScheduleItemRow): { start: number; end: number } | null {
  const start = timeToMinutes(item.start_time);
  const end = item.end_time ? timeToMinutes(item.end_time) : start + 30;
  if (item.end_time && end <= start) return null;
  return { start, end: Math.max(end, start + 1) };
}

export function detectScheduleConflicts(
  items: DayScheduleItemRow[],
  messages: {
    overlap: (a: string, b: string) => string;
    invalidDuration: (title: string) => string;
    duplicateTime: (title: string) => string;
    duplicatePerson: (person: string) => string;
  }
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const seen = new Set<string>();

  const push = (conflict: ScheduleConflict) => {
    const key = `${conflict.type}:${[...conflict.itemIds].sort().join(",")}`;
    if (seen.has(key)) return;
    seen.add(key);
    conflicts.push(conflict);
  };

  for (const item of items) {
    if (item.end_time && timeToMinutes(item.end_time) <= timeToMinutes(item.start_time)) {
      push({
        type: "invalid_duration",
        itemIds: [item.id],
        message: messages.invalidDuration(item.title),
      });
    }
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;

      if (a.start_time === b.start_time && a.title.trim().toLowerCase() === b.title.trim().toLowerCase()) {
        push({
          type: "duplicate",
          itemIds: [a.id, b.id],
          message: messages.duplicateTime(a.title),
        });
      }

      const rangeA = itemRange(a);
      const rangeB = itemRange(b);
      if (!rangeA || !rangeB) continue;

      if (rangesOverlap(rangeA.start, rangeA.end, rangeB.start, rangeB.end)) {
        push({
          type: "overlap",
          itemIds: [a.id, b.id],
          message: messages.overlap(a.title, b.title),
        });

        if (
          a.responsible_person &&
          b.responsible_person &&
          a.responsible_person.trim().toLowerCase() ===
            b.responsible_person.trim().toLowerCase()
        ) {
          push({
            type: "duplicate",
            itemIds: [a.id, b.id],
            message: messages.duplicatePerson(a.responsible_person),
          });
        }
      }
    }
  }

  return conflicts;
}

export function conflictsForItem(
  itemId: string,
  allConflicts: ScheduleConflict[]
): ScheduleConflict[] {
  return allConflicts.filter((c) => c.itemIds.includes(itemId));
}
