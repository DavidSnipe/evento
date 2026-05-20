import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/types/events";

export async function getUserEvents(): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserEvents]", error.message);
    return [];
  }

  return (data ?? []) as EventRow[];
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[getEventById]", error.message);
    return null;
  }

  return data as EventRow | null;
}

/** Nearest upcoming event with a date, or most recently created */
export async function getPrimaryEvent(events: EventRow[]): Promise<EventRow | null> {
  if (events.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((e) => e.event_date && new Date(`${e.event_date}T12:00:00`) >= today)
    .sort(
      (a, b) =>
        new Date(`${a.event_date!}T12:00:00`).getTime() -
        new Date(`${b.event_date!}T12:00:00`).getTime()
    );

  return upcoming[0] ?? events[0];
}
