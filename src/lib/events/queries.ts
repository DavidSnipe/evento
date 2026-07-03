import { cache } from "react";

import { getBudgetSnapshot } from "@/lib/budget/queries";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/types/events";

export type EventListStats = {
  guestsCount: number;
  tablesCount: number;
  budgetSpent: number;
};

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

export const getEventById = cache(async function getEventById(
  id: string
): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[getEventById]", error.message);
    return null;
  }

  return data as EventRow | null;
});

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

export async function getEventListStats(
  eventIds: string[]
): Promise<Record<string, EventListStats>> {
  const stats: Record<string, EventListStats> = {};
  if (eventIds.length === 0) return stats;

  for (const id of eventIds) {
    stats[id] = { guestsCount: 0, tablesCount: 0, budgetSpent: 0 };
  }

  const supabase = await createClient();

  const [guestsResult, tablesResult, ...budgetSnapshots] = await Promise.all([
    supabase.from("guests").select("event_id").in("event_id", eventIds),
    supabase.from("seating_tables").select("event_id").in("event_id", eventIds),
    ...eventIds.map((id) => getBudgetSnapshot(id)),
  ]);

  for (const row of guestsResult.data ?? []) {
    if (row.event_id && stats[row.event_id]) {
      stats[row.event_id].guestsCount += 1;
    }
  }

  for (const row of tablesResult.data ?? []) {
    if (row.event_id && stats[row.event_id]) {
      stats[row.event_id].tablesCount += 1;
    }
  }

  eventIds.forEach((id, index) => {
    stats[id].budgetSpent = budgetSnapshots[index]?.totals.actual ?? 0;
  });

  return stats;
}

export async function getEventGodparentNames(eventId: string): Promise<{
  godparent1_name: string | null;
  godparent2_name: string | null;
}> {
  const supabase = await createClient();
  const { data: existingGuests } = await supabase
    .from("guests")
    .select("first_name, last_name, parent_id, tags")
    .eq("event_id", eventId);

  const godparents = existingGuests?.filter((g) => g.tags?.includes("godparents")) ?? [];
  const existingGodfather = godparents.find((g) => !g.parent_id);
  const existingGodmother = godparents.find((g) => g.parent_id);

  const formatGuestName = (guest: { first_name: string; last_name: string | null }) =>
    [guest.last_name, guest.first_name].filter(Boolean).join(" ") || null;

  return {
    godparent1_name: existingGodfather ? formatGuestName(existingGodfather) : null,
    godparent2_name: existingGodmother ? formatGuestName(existingGodmother) : null,
  };
}
