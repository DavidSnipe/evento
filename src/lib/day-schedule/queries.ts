import { createClient } from "@/lib/supabase/server";
import { DEFAULT_INVITATION_SECTIONS, mergeSections } from "@/lib/invitation/defaults";
import { defaultEnabledSegments } from "@/lib/day-schedule/day-templates";
import type { DayScheduleItemRow, EnabledDaySegments } from "@/types/day-schedule";

export function isDayScheduleTableMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("day_schedule") && (msg.includes("does not exist") || msg.includes("schema cache"));
}

export async function checkDayScheduleReady(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("day_schedule_items").select("id").limit(1);
  if (!error) return true;
  return isDayScheduleTableMissing(error);
}

export async function getDayScheduleItems(
  eventId: string
): Promise<DayScheduleItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("day_schedule_items")
    .select("*")
    .eq("event_id", eventId)
    .order("schedule_date", { ascending: true })
    .order("start_time", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isDayScheduleTableMissing(error)) console.error("getDayScheduleItems:", error);
    return [];
  }

  return (data ?? []) as DayScheduleItemRow[];
}

export async function getEnabledDaySegments(
  eventId: string
): Promise<EnabledDaySegments> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_invitations")
    .select("sections")
    .eq("event_id", eventId)
    .maybeSingle();

  if (!data?.sections) return defaultEnabledSegments();

  const sections = mergeSections(
    data.sections as Partial<typeof DEFAULT_INVITATION_SECTIONS>
  );

  return defaultEnabledSegments({
    civil: sections.civilCeremony,
    religious: sections.religiousCeremony,
    party: sections.party,
  });
}

