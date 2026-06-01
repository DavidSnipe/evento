import type { DayScheduleItemRow } from "@/types/day-schedule";

export function sortScheduleItems(items: DayScheduleItemRow[]): DayScheduleItemRow[] {
  return [...items].sort((a, b) => {
    if (a.schedule_date !== b.schedule_date) {
      return a.schedule_date.localeCompare(b.schedule_date);
    }
    if (a.start_time !== b.start_time) {
      return a.start_time.localeCompare(b.start_time);
    }
    return a.sort_order - b.sort_order;
  });
}

export function uniqueScheduleDates(
  items: DayScheduleItemRow[],
  fallbackDate: string | null
): string[] {
  const dates = new Set(items.map((i) => i.schedule_date));
  if (fallbackDate) dates.add(fallbackDate);
  return [...dates].sort();
}
