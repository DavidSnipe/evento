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

  const flat = (data ?? []) as GuestWithTable[];
  const primaryGuests = flat.filter((g) => !g.parent_id);
  const subGuests = flat.filter((g) => g.parent_id);

  primaryGuests.forEach((primary) => {
    primary.subGuests = subGuests.filter((sub) => sub.parent_id === primary.id);
  });

  return primaryGuests;
}

export async function getGuestStats(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, rsvp_status, table_id")
    .eq("event_id", eventId);

  if (error) {
    console.error("[getGuestStats]", error.message);
    return { total: 0, accepted: 0, pending: 0, declined: 0, seated: 0 };
  }

  const flat = data ?? [];
  const total = flat.length;
  const accepted = flat.filter((g) => g.rsvp_status === "accepted").length;
  const pending = flat.filter((g) => g.rsvp_status === "pending").length;
  const declined = flat.filter((g) => g.rsvp_status === "declined").length;
  const seated = flat.filter((g) => g.table_id).length;

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
