"use server";

import { revalidatePath } from "next/cache";

import { assignGuestToTable } from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";
import { requireEvent } from "@/lib/events/verify-event";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import type { TableShape } from "@/types/guests";

export type TableFormState = { error?: string; success?: string };

function revalidateSeating(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

/* ─── Create table ─── */
export async function createTable(
  eventId: string,
  formData: FormData
): Promise<TableFormState> {
  await requireEvent(eventId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: ro.seating.errors.nameRequired };

  const capacity = Math.min(50, Math.max(1, Number(formData.get("capacity")) || 8));
  const shape = (formData.get("shape") as TableShape) || "round";

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("seating_tables")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("seating_tables").insert({
    event_id: eventId,
    name,
    capacity,
    shape,
    sort_order,
  });

  if (error) {
    if (error.message.includes("relation") || error.code === "42P01") {
      return { error: ro.guests.errors.tablesMissing };
    }
    return { error: ro.seating.errors.saveFailed };
  }

  revalidateSeating(eventId);
  return { success: "ok" };
}

/* ─── Update table ─── */
export async function updateTable(
  eventId: string,
  tableId: string,
  data: { name?: string; capacity?: number; shape?: TableShape; notes?: string; pos_x?: number; pos_y?: number }
): Promise<TableFormState> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.capacity !== undefined) updates.capacity = Math.min(50, Math.max(1, data.capacity));
  if (data.shape !== undefined) updates.shape = data.shape;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.pos_x !== undefined) updates.pos_x = data.pos_x;
  if (data.pos_y !== undefined) updates.pos_y = data.pos_y;

  const { error } = await supabase
    .from("seating_tables")
    .update(updates)
    .eq("id", tableId)
    .eq("event_id", eventId);

  if (error) return { error: ro.seating.errors.saveFailed };

  revalidateSeating(eventId);
  return { success: "ok" };
}

/* ─── Delete table ─── */
export async function deleteTable(eventId: string, tableId: string) {
  await requireEvent(eventId);
  const supabase = await createClient();

  await supabase.from("guests").update({ table_id: null }).eq("table_id", tableId);
  await supabase.from("seating_tables").delete().eq("id", tableId).eq("event_id", eventId);

  revalidateSeating(eventId);
}

/* ─── Assign / unassign guest ─── */
export async function assignGuestFromSeating(
  eventId: string,
  guestId: string,
  tableId: string
) {
  return assignGuestToTable(eventId, guestId, tableId || null);
}

export async function unassignGuest(eventId: string, guestId: string) {
  return assignGuestToTable(eventId, guestId, null);
}

/* ─── Auto-assign unassigned guests to tables with free seats ─── */
export async function autoAssignGuests(eventId: string): Promise<{ count: number; error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const [tablesRes, guestsRes] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("id, capacity")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("guests")
      .select("id, plus_one, group_name, table_id")
      .eq("event_id", eventId)
      .order("group_name", { ascending: true })
      .order("first_name", { ascending: true }),
  ]);

  const tables = tablesRes.data ?? [];
  const allGuests = guestsRes.data ?? [];
  const unassigned = allGuests.filter((g) => !g.table_id);

  if (unassigned.length === 0) return { count: 0, error: ro.seating.autoAssign.noGuests };

  // Calculate current occupancy for each table
  const occupancy = new Map<string, number>();
  for (const t of tables) occupancy.set(t.id, 0);
  for (const g of allGuests) {
    if (g.table_id && occupancy.has(g.table_id)) {
      occupancy.set(g.table_id, occupancy.get(g.table_id)! + 1 + (g.plus_one ? 1 : 0));
    }
  }

  let assignedCount = 0;
  const updates: { id: string; table_id: string }[] = [];

  // Group unassigned by group_name to keep families/groups together
  const grouped = new Map<string, typeof unassigned>();
  for (const g of unassigned) {
    const key = g.group_name || `__solo_${g.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  }

  for (const [, members] of grouped) {
    const groupSize = members.reduce((s, g) => s + 1 + (g.plus_one ? 1 : 0), 0);

    // Find a table with enough free seats for the whole group
    let targetTable: string | null = null;
    for (const t of tables) {
      const free = t.capacity - (occupancy.get(t.id) ?? 0);
      if (free >= groupSize) {
        targetTable = t.id;
        break;
      }
    }

    if (!targetTable) {
      // Try to fit individually if group doesn't fit together
      for (const g of members) {
        const needed = 1 + (g.plus_one ? 1 : 0);
        for (const t of tables) {
          const free = t.capacity - (occupancy.get(t.id) ?? 0);
          if (free >= needed) {
            updates.push({ id: g.id, table_id: t.id });
            occupancy.set(t.id, (occupancy.get(t.id) ?? 0) + needed);
            assignedCount++;
            break;
          }
        }
      }
    } else {
      for (const g of members) {
        updates.push({ id: g.id, table_id: targetTable });
        occupancy.set(targetTable, (occupancy.get(targetTable) ?? 0) + 1 + (g.plus_one ? 1 : 0));
        assignedCount++;
      }
    }
  }

  // Batch update
  for (const u of updates) {
    await supabase.from("guests").update({ table_id: u.table_id }).eq("id", u.id);
  }

  revalidateSeating(eventId);
  return { count: assignedCount };
}
