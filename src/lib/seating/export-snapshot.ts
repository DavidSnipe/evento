import { createClient } from "@/lib/supabase/server";
import { getSeatingPlan } from "@/lib/seating/queries";
import {
  type SeatingExportGuestEntry,
  type SeatingExportSnapshot,
  type SeatingExportTableGroup,
} from "@/lib/seating/export-snapshot-types";
import { parseMetadata } from "@/lib/seating/utils";
import type { GuestWithTable } from "@/types/guests";

export type {
  GuestListPdfOrientation,
  GuestListPdfSortMode,
  SeatingExportGuestEntry,
  SeatingExportSnapshot,
  SeatingExportTableGroup,
} from "@/lib/seating/export-snapshot-types";

function formatGuestName(guest: GuestWithTable): string {
  const first = guest.first_name.trim();
  const last = guest.last_name?.trim();
  if (last) return `${last} ${first}`;
  return first;
}

function buildExportGuestRows(
  guests: GuestWithTable[],
  tableName: string
): SeatingExportGuestEntry[] {
  const coupleByParentId = new Map<string, GuestWithTable>();
  for (const guest of guests) {
    if (guest.parent_id && guest.relationship_type === "couple") {
      coupleByParentId.set(guest.parent_id, guest);
    }
  }

  const usedIds = new Set<string>();
  const rows: SeatingExportGuestEntry[] = [];

  const sortedGuests = [...guests].sort((a, b) =>
    formatGuestName(a).localeCompare(formatGuestName(b), "ro")
  );

  for (const guest of sortedGuests) {
    if (usedIds.has(guest.id)) continue;
    if (guest.parent_id && guest.relationship_type === "couple") continue;

    const partner = coupleByParentId.get(guest.id);
    if (partner) {
      usedIds.add(guest.id);
      usedIds.add(partner.id);
      rows.push({
        id: guest.id,
        displayName: `${formatGuestName(guest)} & ${formatGuestName(partner)}`,
        tableName,
        isCoupleRow: true,
        guestIds: [guest.id, partner.id],
      });
      continue;
    }

    if (!guest.parent_id && guest.plus_one) {
      const hasCoupleRow = coupleByParentId.has(guest.id);
      if (!hasCoupleRow) {
        usedIds.add(guest.id);
        rows.push({
          id: guest.id,
          displayName: `${formatGuestName(guest)} (+1)`,
          tableName,
          isCoupleRow: false,
          guestIds: [guest.id],
        });
        continue;
      }
    }

    usedIds.add(guest.id);
    rows.push({
      id: guest.id,
      displayName: formatGuestName(guest),
      tableName,
      isCoupleRow: false,
      guestIds: [guest.id],
    });
  }

  for (const guest of sortedGuests) {
    if (usedIds.has(guest.id)) continue;
    rows.push({
      id: guest.id,
      displayName: formatGuestName(guest),
      tableName,
      isCoupleRow: false,
      guestIds: [guest.id],
    });
  }

  return rows;
}

function isGuestListExportTable(table: { notes: string | null; shape: string | null }): boolean {
  const meta = parseMetadata(table.notes);
  if (meta.objectType) return false;
  if (meta.customShape === "sweetheart") return false;
  if (table.shape === "sweetheart") return false;
  return true;
}

export async function getSeatingExportSnapshot(
  eventId: string
): Promise<SeatingExportSnapshot | null> {
  const supabase = await createClient();

  const [plan, eventResult] = await Promise.all([
    getSeatingPlan(eventId),
    supabase.from("events").select("title, event_date").eq("id", eventId).maybeSingle(),
  ]);

  if (eventResult.error || !eventResult.data) {
    console.error(
      "[getSeatingExportSnapshot]",
      eventResult.error?.message ?? "event not found"
    );
    return null;
  }

  const seatingTables = plan.tables.filter(isGuestListExportTable);

  const tablesWithGuests: SeatingExportTableGroup[] = seatingTables
    .map((table) => ({
      id: table.id,
      name: table.name,
      sortOrder: table.sort_order,
      guests: buildExportGuestRows(table.guests, table.name),
    }))
    .filter((table) => table.guests.length > 0);

  return {
    eventTitle: eventResult.data.title,
    eventDate: eventResult.data.event_date,
    tablesWithGuests,
    unassignedGuests: [],
    totalGuests: tablesWithGuests.reduce((sum, table) => sum + table.guests.length, 0),
  };
}
