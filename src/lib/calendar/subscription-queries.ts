import { createClient } from "@/lib/supabase/server";
import type { CalendarSubscriptionPayload } from "@/lib/calendar/feed";
import type { DayScheduleItemRow } from "@/types/day-schedule";
import type { TimelineTaskWithRelations } from "@/types/timeline";

export function isCalendarSubscriptionColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "42703" || e.code === "PGRST204") return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("calendar_subscription_token") &&
    (msg.includes("does not exist") || msg.includes("schema cache"))
  );
}

export async function getEventCalendarSubscriptionToken(
  eventId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("calendar_subscription_token")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    if (!isCalendarSubscriptionColumnMissing(error)) {
      console.error("getEventCalendarSubscriptionToken:", error);
    }
    return null;
  }

  return (data?.calendar_subscription_token as string | undefined) ?? null;
}

export async function fetchCalendarSubscriptionPayload(
  eventId: string,
  token: string
): Promise<CalendarSubscriptionPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fetch_calendar_subscription_payload", {
    p_event_id: eventId,
    p_token: token,
  });

  if (error) {
    if (!isCalendarSubscriptionColumnMissing(error)) {
      console.error("fetchCalendarSubscriptionPayload:", error);
    }
    return null;
  }

  if (!data || typeof data !== "object") return null;

  const payload = data as {
    event?: { id: string; title: string; venue: string | null };
    tasks?: TimelineTaskWithRelations[];
    dayItems?: DayScheduleItemRow[];
  };

  if (!payload.event?.id) return null;

  return {
    event: payload.event,
    tasks: payload.tasks ?? [],
    dayItems: payload.dayItems ?? [],
  };
}
