import { createClient } from "@/lib/supabase/server";
import { normalizeRoomDimensions } from "@/lib/seating/spatial";
import type { GuestWithTable } from "@/types/guests";
import type { SeatingTableRow } from "@/types/guests";

export type TableWithGuests = SeatingTableRow & {
  guests: GuestWithTable[];
};

export async function getTablesByEvent(eventId: string): Promise<SeatingTableRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seating_tables")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[getTablesByEvent]", error.message);
    return [];
  }

  return (data ?? []) as SeatingTableRow[];
}

export async function getSeatingPlan(eventId: string): Promise<{
  tables: TableWithGuests[];
  unassigned: GuestWithTable[];
  allGuests: GuestWithTable[];
  roomWidthM: number;
  roomHeightM: number;
}> {
  const supabase = await createClient();

  const [tablesResult, guestsResult, eventResult] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("guests")
      .select("*, seating_tables(id, name)")
      .eq("event_id", eventId)
      .order("first_name", { ascending: true }),
    supabase
      .from("events")
      .select("seating_room_width_m, seating_room_height_m")
      .eq("id", eventId)
      .maybeSingle(),
  ]);

  const tables = (tablesResult.data ?? []) as SeatingTableRow[];
  const guests = (guestsResult.data ?? []) as GuestWithTable[];
  const { roomWidthM, roomHeightM } = normalizeRoomDimensions(
    eventResult.data?.seating_room_width_m,
    eventResult.data?.seating_room_height_m
  );

  const tablesWithGuests: TableWithGuests[] = tables.map((table) => ({
    ...table,
    guests: guests.filter((g) => g.table_id === table.id),
  }));

  const unassigned = guests.filter((g) => !g.table_id);

  return { tables: tablesWithGuests, unassigned, allGuests: guests, roomWidthM, roomHeightM };
}
