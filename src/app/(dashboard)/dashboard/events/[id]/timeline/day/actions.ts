"use server";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { getEventById } from "@/lib/events/queries";
import {
  checkDayScheduleReady,
  getDayScheduleItems,
  getEnabledDaySegments,
  isDayScheduleTableMissing,
} from "@/lib/day-schedule/queries";
import {
  filterTemplatesForEvent,
} from "@/lib/day-schedule/day-templates";
import {
  parseScheduleDate,
  parseScheduleTime,
  validateDayScheduleItemInput,
  type DayScheduleActionResult,
} from "@/lib/day-schedule/validation";
import { createClient } from "@/lib/supabase/server";
import type {
  DayScheduleItemInput,
  DayScheduleItemRow,
} from "@/types/day-schedule";

const MIGRATION_HINT =
  "Rulează migrarea 014_day_schedule.sql în Supabase (SQL Editor).";

function migrationError(): DayScheduleActionResult {
  return { error: MIGRATION_HINT };
}

export type GenerateDayScheduleResult = DayScheduleActionResult & {
  created?: number;
  skipped?: number;
  items?: DayScheduleItemRow[];
};

export async function createDayScheduleItem(
  eventId: string,
  input: DayScheduleItemInput
): Promise<DayScheduleActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditDaySchedule, "canEditDaySchedule");
  if (accessDenied) return accessDenied;

  const validation = validateDayScheduleItemInput(input);
  if (validation) return { error: validation };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("day_schedule_items")
    .insert({
      event_id: eventId,
      schedule_date: parseScheduleDate(input.scheduleDate)!,
      title: input.title.trim(),
      start_time: parseScheduleTime(input.startTime)!,
      end_time: input.endTime ? parseScheduleTime(input.endTime) : null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      responsible_person: input.responsiblePerson?.trim() || null,
      event_segment: input.eventSegment ?? "party",
      sort_order: input.sortOrder ?? 0,
      vendor_id: input.vendorId ?? null,
      vendor_role: input.vendorRole ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (isDayScheduleTableMissing(error)) return migrationError();
    console.error("createDayScheduleItem:", error);
    return { error: "Nu am putut adăuga elementul în program." };
  }

  return { success: true, id: data.id };
}

export async function updateDayScheduleItem(
  eventId: string,
  itemId: string,
  input: DayScheduleItemInput
): Promise<DayScheduleActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditDaySchedule, "canEditDaySchedule");
  if (accessDenied) return accessDenied;

  const validation = validateDayScheduleItemInput(input);
  if (validation) return { error: validation };

  const supabase = await createClient();
  const { error } = await supabase
    .from("day_schedule_items")
    .update({
      schedule_date: parseScheduleDate(input.scheduleDate)!,
      title: input.title.trim(),
      start_time: parseScheduleTime(input.startTime)!,
      end_time: input.endTime ? parseScheduleTime(input.endTime) : null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      responsible_person: input.responsiblePerson?.trim() || null,
      event_segment: input.eventSegment ?? "party",
      sort_order: input.sortOrder ?? 0,
      vendor_id: input.vendorId ?? null,
      vendor_role: input.vendorRole ?? null,
    })
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    if (isDayScheduleTableMissing(error)) return migrationError();
    console.error("updateDayScheduleItem:", error);
    return { error: "Nu am putut actualiza elementul." };
  }

  return { success: true, id: itemId };
}

export async function deleteDayScheduleItem(
  eventId: string,
  itemId: string
): Promise<DayScheduleActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditDaySchedule, "canEditDaySchedule");
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("day_schedule_items")
    .delete()
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    if (isDayScheduleTableMissing(error)) return migrationError();
    console.error("deleteDayScheduleItem:", error);
    return { error: "Nu am putut șterge elementul." };
  }

  return { success: true };
}

export async function reorderDayScheduleItems(
  eventId: string,
  orderedIds: string[]
): Promise<DayScheduleActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditDaySchedule, "canEditDaySchedule");
  if (accessDenied) return accessDenied;

  if (orderedIds.length === 0) return { success: true };

  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("day_schedule_items")
      .update({ sort_order: index * 10 })
      .eq("id", id)
      .eq("event_id", eventId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    if (isDayScheduleTableMissing(failed.error)) return migrationError();
    console.error("reorderDayScheduleItems:", failed.error);
    return { error: "Nu am putut reordona programul." };
  }

  return { success: true };
}

export async function generateDaySchedule(
  eventId: string,
  scheduleDate: string
): Promise<GenerateDayScheduleResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditDaySchedule, "canEditDaySchedule");
  if (accessDenied) return accessDenied;

  const parsedDate = parseScheduleDate(scheduleDate);
  if (!parsedDate) return { error: "Data programului este invalidă." };

  const event = await getEventById(eventId);
  if (!event?.event_date) {
    return { error: "Adaugă data evenimentului pentru a genera programul." };
  }

  const [enabled, existing] = await Promise.all([
    getEnabledDaySegments(eventId),
    getDayScheduleItems(eventId),
  ]);

  const templates = filterTemplatesForEvent(enabled);
  const existingKeys = new Set(
    existing
      .filter((i) => i.schedule_date === parsedDate)
      .map((i) => `${i.start_time.slice(0, 5)}:${i.title.trim().toLowerCase()}`)
  );

  const toInsert = templates.filter(
    (tpl) => !existingKeys.has(`${tpl.startTime}:${tpl.title.trim().toLowerCase()}`)
  );

  if (toInsert.length === 0) {
    return { success: true, created: 0, skipped: templates.length, items: [] };
  }

  const supabase = await createClient();
  const rows = toInsert.map((tpl, index) => ({
    event_id: eventId,
    schedule_date: parsedDate,
    title: tpl.title,
    start_time: tpl.startTime,
    end_time: tpl.endTime,
    location: tpl.location ?? null,
    notes: null,
    responsible_person: tpl.responsiblePerson ?? null,
    event_segment: tpl.eventSegment,
    sort_order: index * 10,
    vendor_id: null,
    vendor_role: tpl.vendorRole ?? null,
  }));

  const { data, error } = await supabase
    .from("day_schedule_items")
    .insert(rows)
    .select("*");

  if (error) {
    if (isDayScheduleTableMissing(error)) return migrationError();
    console.error("generateDaySchedule:", error);
    return { error: "Nu am putut genera programul zilei." };
  }

  return {
    success: true,
    created: data?.length ?? 0,
    skipped: templates.length - (data?.length ?? 0),
    items: (data ?? []) as DayScheduleItemRow[],
  };
}

export async function checkDayScheduleMigrationReady(): Promise<boolean> {
  return checkDayScheduleReady();
}
