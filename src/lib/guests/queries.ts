import { createClient } from "@/lib/supabase/server";
import type { GuestRow, GuestWithTable, RsvpStatus } from "@/types/guests";

export async function getGuestsByEvent(eventId: string): Promise<GuestWithTable[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*, seating_tables(id, name)")
    .eq("event_id", eventId)
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[getGuestsByEvent]", error.message);
    return [];
  }

  return (data ?? []) as GuestWithTable[];
}

export async function getGuestStats(eventId: string) {
  const guests = await getGuestsByEvent(eventId);
  const total = guests.length;
  const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;
  const seated = guests.filter((g) => g.table_id).length;

  return { total, accepted, pending, declined, seated };
}

export async function getGuestById(guestId: string): Promise<GuestRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("guests").select("*").eq("id", guestId).maybeSingle();

  if (error) {
    console.error("[getGuestById]", error.message);
    return null;
  }

  return data as GuestRow | null;
}

export function filterGuestsByRsvp(
  guests: GuestWithTable[],
  filter: RsvpStatus | "all"
): GuestWithTable[] {
  if (filter === "all") return guests;
  return guests.filter((g) => g.rsvp_status === filter);
}
