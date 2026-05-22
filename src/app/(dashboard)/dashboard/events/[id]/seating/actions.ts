"use server";

import { revalidatePath } from "next/cache";

import { assignGuestToTable } from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";
import { requireEvent } from "@/lib/events/verify-event";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import type { TableShape } from "@/types/guests";

export type TableFormState = { error?: string; success?: string; tables?: unknown[] };

function revalidateSeating(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

/* ─── Create table(s) or room object ─── */
export async function createTable(
  eventId: string,
  formData: FormData
): Promise<TableFormState> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const objectType = formData.get("objectType") ? String(formData.get("objectType")) : null;

  if (objectType) {
    // Creating a Room Object
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: ro.seating.errors.nameRequired };

    const shape = (formData.get("shape") as string) || "rectangular";
    const width = Number(formData.get("width")) || (objectType === "dance_floor" ? 280 : 160);
    const height = Number(formData.get("height")) || (objectType === "dance_floor" ? 200 : 96);

    const { data: existing } = await supabase
      .from("seating_tables")
      .select("sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const sort_order = (existing?.[0]?.sort_order ?? 0) + 1;

    const metadata = {
      objectType,
      customShape: shape,
      width,
      height,
      rotation: 0,
      isLocked: false
    };

    const { data: insertedObj, error } = await supabase
      .from("seating_tables")
      .insert({
        event_id: eventId,
        name,
        capacity: 1, // DB check constraint > 0
        shape: shape === "round" ? "round" : "rectangular",
        notes: JSON.stringify(metadata),
        sort_order,
        pos_x: 200,
        pos_y: 200
      })
      .select("*");

    if (error) {
      console.error("[createTable - object]", error);
      return { error: ro.seating.errors.saveFailed };
    }

    revalidateSeating(eventId);
    return { success: "ok", tables: insertedObj ?? [] };
  }

  // Creating regular Tables
  const quantity = Math.min(20, Math.max(1, Number(formData.get("quantity")) || 1));
  const capacity = Math.min(50, Math.max(1, Number(formData.get("capacity")) || 8));
  const shape = (formData.get("shape") as string) || "round";

  let dbShape: TableShape = "round";
  if (shape === "sweetheart") {
    dbShape = "sweetheart";
  } else if (shape === "round") {
    dbShape = "round";
  } else {
    dbShape = "rectangular";
  }

  // Auto detect sequence numbering
  const { data: existingTables } = await supabase
    .from("seating_tables")
    .select("name")
    .eq("event_id", eventId);

  let nextNumber = 1;
  if (existingTables && existingTables.length > 0) {
    const numbers = existingTables
      .map((t) => {
        const match = t.name.match(/^Masa\s+(\d+)$/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null);

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    } else {
      nextNumber = existingTables.length + 1;
    }
  }

  const { data: existing } = await supabase
    .from("seating_tables")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);
  let currentSortOrder = existing?.[0]?.sort_order ?? 0;

  const inserts = [];
  for (let i = 0; i < quantity; i++) {
    const num = nextNumber + i;
    const name = `Masa ${num}`;
    currentSortOrder += 1;

    // Spawn layout staggered in center of canvas
    const pos_x = 350 + (i % 4) * 240;
    const pos_y = 250 + Math.floor(i / 4) * 200;

    const metadata = {
      customShape: shape,
      isLocked: false
    };

    inserts.push({
      event_id: eventId,
      name,
      capacity,
      shape: dbShape,
      notes: JSON.stringify(metadata),
      sort_order: currentSortOrder,
      pos_x,
      pos_y
    });
  }

  const { data: insertedTables, error } = await supabase
    .from("seating_tables")
    .insert(inserts)
    .select("*");

  if (error) {
    console.error("[createTable]", error);
    return { error: ro.seating.errors.saveFailed };
  }

  revalidateSeating(eventId);
  return { success: "ok", tables: insertedTables ?? [] };
}

/* ─── Update table / room object ─── */
export async function updateTable(
  eventId: string,
  tableId: string,
  data: {
    name?: string;
    capacity?: number;
    shape?: TableShape;
    notes?: string;
    pos_x?: number;
    pos_y?: number;
  }
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

/* ─── Update Multiple Table Positions ─── */
export async function updateTablePositions(
  eventId: string,
  positions: { id: string; pos_x: number; pos_y: number }[]
): Promise<{ success: boolean }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  await Promise.all(
    positions.map((p) =>
      supabase
        .from("seating_tables")
        .update({ pos_x: p.pos_x, pos_y: p.pos_y })
        .eq("id", p.id)
        .eq("event_id", eventId)
    )
  );

  revalidateSeating(eventId);
  return { success: true };
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

/* ─── Auto-assign unassigned guests to tables ─── */
export async function autoAssignGuests(eventId: string): Promise<{ count: number; error?: string }> {
  const result = await autoSeatGuestsAction(eventId, "family");
  return { count: result.count, error: result.error };
}

/* ─── Smart Auto-Seating Action ─── */
export async function autoSeatGuestsAction(
  eventId: string,
  strategy: "family" | "even"
): Promise<{ success: boolean; count: number; updates?: { id: string; table_id: string }[]; error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const [tablesRes, guestsRes] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("guests")
      .select("*")
      .eq("event_id", eventId)
      .order("first_name", { ascending: true })
  ]);

  const allTables = tablesRes.data ?? [];
  const allGuests = guestsRes.data ?? [];

  const seatingTables = allTables.filter((t) => {
    try {
      if (t.notes) {
        const meta = JSON.parse(t.notes);
        const actualMeta = meta.metadata || meta;
        if (actualMeta.objectType) return false;
        if (actualMeta.customShape === "sweetheart") return false;
      }
    } catch {}
    if (t.shape === "sweetheart") return false;
    return true;
  });

  if (seatingTables.length === 0) {
    return { success: false, count: 0, error: "Nu există mese disponibile." };
  }

  const occupancyMap = new Map<string, number>();
  for (const t of seatingTables) {
    const tableGuests = allGuests.filter((g) => g.table_id === t.id);
    let occupied = 0;
    for (const g of tableGuests) {
      occupied += 1;
      if (!g.parent_id && g.plus_one) {
        const hasCoupleRow = tableGuests.some(
          (sub) => sub.parent_id === g.id && sub.relationship_type === "couple"
        );
        if (!hasCoupleRow) occupied += 1;
      }
    }
    occupancyMap.set(t.id, occupied);
  }

  const unassignedPrimary = allGuests.filter((g) => !g.table_id && !g.parent_id);

  if (unassignedPrimary.length === 0) {
    return { success: true, count: 0, error: "Toți invitații principali sunt repartizați." };
  }

  const partyMap = new Map<string, typeof allGuests>();
  for (const g of unassignedPrimary) {
    const party = [g, ...allGuests.filter((sub) => sub.parent_id === g.id)];
    partyMap.set(g.id, party);
  }

  const partySizeMap = new Map<string, number>();
  for (const [id, party] of partyMap) {
    let size = 0;
    for (const member of party) {
      size += 1;
      if (!member.parent_id && member.plus_one) {
        const hasCouple = party.some((sub) => sub.parent_id === member.id && sub.relationship_type === "couple");
        if (!hasCouple) size += 1;
      }
    }
    partySizeMap.set(id, size);
  }

  const partyInfo = new Map<string, {
    hasGodparents: boolean;
    hasVip: boolean;
    groupName: string;
    partySize: number;
    firstName: string;
  }>();

  for (const [id, party] of partyMap) {
    const hasGodparents = party.some((m) => m.tags?.includes("godparents"));
    const hasVip = party.some((m) => m.tags?.includes("vip"));
    const groupName = party.find((m) => m.group_name)?.group_name || "";
    const partySize = partySizeMap.get(id) ?? 0;
    const firstName = party[0]?.first_name || "";
    partyInfo.set(id, { hasGodparents, hasVip, groupName, partySize, firstName });
  }

  const sortedParties = Array.from(partyMap.keys()).sort((a, b) => {
    const infoA = partyInfo.get(a)!;
    const infoB = partyInfo.get(b)!;

    // 0. Godparents (Nași) status first
    if (infoA.hasGodparents !== infoB.hasGodparents) {
      return infoA.hasGodparents ? -1 : 1;
    }

    // 1. VIP status second
    if (infoA.hasVip !== infoB.hasVip) {
      return infoA.hasVip ? -1 : 1;
    }

    // 2. Cluster by group name (alphabetical, with empty group names last)
    if (infoA.groupName !== infoB.groupName) {
      if (!infoA.groupName) return 1;
      if (!infoB.groupName) return -1;
      return infoA.groupName.localeCompare(infoB.groupName);
    }

    // 3. Sort by party size (descending)
    if (infoA.partySize !== infoB.partySize) {
      return infoB.partySize - infoA.partySize;
    }

    return infoA.firstName.localeCompare(infoB.firstName);
  });

  const updates: { id: string; table_id: string }[] = [];
  let assignedCount = 0;

  if (strategy === "family") {
    for (const partyId of sortedParties) {
      const party = partyMap.get(partyId)!;
      const size = partySizeMap.get(partyId)!;

      let targetTableId: string | null = null;
      for (const t of seatingTables) {
        const cap = t.capacity;
        const occ = occupancyMap.get(t.id) ?? 0;
        if (cap - occ >= size) {
          targetTableId = t.id;
          break;
        }
      }

      if (targetTableId) {
        for (const member of party) {
          updates.push({ id: member.id, table_id: targetTableId });
          assignedCount++;
        }
        occupancyMap.set(targetTableId, (occupancyMap.get(targetTableId) ?? 0) + size);
      } else {
        for (const member of party) {
          if (member.parent_id) continue;
          const memberParty = [member, ...party.filter((s) => s.parent_id === member.id)];
          let memberSize = 0;
          for (const m of memberParty) {
            memberSize += 1;
            if (!m.parent_id && m.plus_one) {
              const hasCouple = memberParty.some((sub) => sub.parent_id === m.id && sub.relationship_type === "couple");
              if (!hasCouple) memberSize += 1;
            }
          }

          let subTableId: string | null = null;
          for (const t of seatingTables) {
            const cap = t.capacity;
            const occ = occupancyMap.get(t.id) ?? 0;
            if (cap - occ >= memberSize) {
              subTableId = t.id;
              break;
            }
          }

          if (subTableId) {
            for (const m of memberParty) {
              updates.push({ id: m.id, table_id: subTableId });
              assignedCount++;
            }
            occupancyMap.set(subTableId, (occupancyMap.get(subTableId) ?? 0) + memberSize);
          }
        }
      }
    }
  } else {
    for (const partyId of sortedParties) {
      const party = partyMap.get(partyId)!;
      const size = partySizeMap.get(partyId)!;

      let targetTableId: string | null = null;
      let maxRemainingSpace = -1;

      for (const t of seatingTables) {
        const cap = t.capacity;
        const occ = occupancyMap.get(t.id) ?? 0;
        const free = cap - occ;
        if (free >= size && free > maxRemainingSpace) {
          maxRemainingSpace = free;
          targetTableId = t.id;
        }
      }

      if (targetTableId) {
        for (const member of party) {
          updates.push({ id: member.id, table_id: targetTableId });
          assignedCount++;
        }
        occupancyMap.set(targetTableId, (occupancyMap.get(targetTableId) ?? 0) + size);
      } else {
        for (const member of party) {
          if (member.parent_id) continue;
          const memberParty = [member, ...party.filter((s) => s.parent_id === member.id)];
          let memberSize = 0;
          for (const m of memberParty) {
            memberSize += 1;
            if (!m.parent_id && m.plus_one) {
              const hasCouple = memberParty.some((sub) => sub.parent_id === m.id && sub.relationship_type === "couple");
              if (!hasCouple) memberSize += 1;
            }
          }

          let subTableId: string | null = null;
          let subMaxFree = -1;
          for (const t of seatingTables) {
            const cap = t.capacity;
            const occ = occupancyMap.get(t.id) ?? 0;
            const free = cap - occ;
            if (free >= memberSize && free > subMaxFree) {
              subMaxFree = free;
              subTableId = t.id;
            }
          }

          if (subTableId) {
            for (const m of memberParty) {
              updates.push({ id: m.id, table_id: subTableId });
              assignedCount++;
            }
            occupancyMap.set(subTableId, (occupancyMap.get(subTableId) ?? 0) + memberSize);
          }
        }
      }
    }
  }

  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        supabase.from("guests").update({ table_id: u.table_id }).eq("id", u.id)
      )
    );
  }

  revalidateSeating(eventId);
  return { success: true, count: assignedCount, updates };
}

/* ─── Apply Room Template ─── */
export async function applyRoomTemplate(
  eventId: string,
  templateType: "ballroom" | "barn" | "garden" | "restaurant" | "long_hall",
  tableCount: number
): Promise<{ success: boolean; error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  // 1. Unassign all guests at the event
  const { error: unassignError } = await supabase
    .from("guests")
    .update({ table_id: null })
    .eq("event_id", eventId);

  if (unassignError) return { success: false, error: "Failed to unassign guests" };

  // 2. Delete all existing tables / room objects
  const { error: deleteError } = await supabase
    .from("seating_tables")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) return { success: false, error: "Failed to clear existing layout" };

  // 3. Build template components
  const tables = [];

  // Default Elements added to EVERY template (Locked sweetheart table, locked room objects)
  // Sweetheart table (Masa Mirilor) at top center
  tables.push({
    event_id: eventId,
    name: "Masa Mirilor",
    capacity: 4,
    shape: "sweetheart",
    pos_x: 1400,
    pos_y: 80,
    notes: JSON.stringify({ customShape: "sweetheart", isLocked: true }),
    sort_order: 1
  });

  // Stage (Scenă) at top center
  tables.push({
    event_id: eventId,
    name: "Scenă",
    capacity: 1,
    shape: "rectangular",
    pos_x: 1340,
    pos_y: 200,
    notes: JSON.stringify({ objectType: "stage", customShape: "rectangular", width: 320, height: 120, rotation: 0, isLocked: true }),
    sort_order: 2
  });

  // DJ Booth next to stage
  tables.push({
    event_id: eventId,
    name: "DJ Booth",
    capacity: 1,
    shape: "rectangular",
    pos_x: 1700,
    pos_y: 220,
    notes: JSON.stringify({ objectType: "dj_booth", customShape: "rectangular", width: 160, height: 80, rotation: 0, isLocked: true }),
    sort_order: 3
  });

  // Dance Floor (Ring de Dans) in center
  const isRoundDanceFloor = templateType === "ballroom" || templateType === "garden";
  tables.push({
    event_id: eventId,
    name: "Ring de Dans",
    capacity: 1,
    shape: isRoundDanceFloor ? "round" : "rectangular",
    pos_x: 1340,
    pos_y: 940,
    notes: JSON.stringify({
      objectType: "dance_floor",
      customShape: isRoundDanceFloor ? "round" : "rectangular",
      width: isRoundDanceFloor ? 320 : 400,
      height: isRoundDanceFloor ? 320 : 240,
      rotation: 0,
      isLocked: true
    }),
    sort_order: 4
  });

  // Generate tables based on templateType and tableCount
  if (templateType === "ballroom") {
    // Round tables arranged in concentric ellipses around the dance floor center (1500, 1100)
    for (let i = 0; i < tableCount; i++) {
      let angle = 0;
      let rx = 550;
      let ry = 350;

      if (tableCount === 8) {
        angle = (2 * Math.PI / 8) * i;
        rx = 520;
        ry = 380;
      } else if (tableCount === 12) {
        angle = (2 * Math.PI / 12) * i;
        rx = 650;
        ry = 450;
      } else { // 20 tables: concentric rings
        if (i < 8) {
          angle = (2 * Math.PI / 8) * i;
          rx = 480;
          ry = 320;
        } else {
          angle = (2 * Math.PI / 12) * (i - 8);
          rx = 820;
          ry = 580;
        }
      }

      const x = Math.round(1500 + Math.cos(angle) * rx - 80);
      const y = Math.round(1100 + Math.sin(angle) * ry - 80);

      tables.push({
        event_id: eventId,
        name: `Masa ${i + 1}`,
        capacity: 8,
        shape: "round",
        pos_x: x,
        pos_y: y,
        notes: JSON.stringify({ customShape: "round", isLocked: false }),
        sort_order: 10 + i
      });
    }
  } else if (templateType === "barn") {
    // Long banquet tables arranged in columns
    // We want 8, 12, or 20 tables
    const cols = tableCount <= 8 ? 2 : 4;
    for (let i = 0; i < tableCount; i++) {
      const colIdx = i % cols;
      const rowIdx = Math.floor(i / cols);
      let x = 600;
      if (cols === 2) {
        x = colIdx === 0 ? 700 : 2100;
      } else {
        const colX = [550, 950, 1850, 2250];
        x = colX[colIdx];
      }
      const y = 300 + rowIdx * 320;

      tables.push({
        event_id: eventId,
        name: `Masa ${i + 1}`,
        capacity: 12,
        shape: "rectangular",
        pos_x: x,
        pos_y: y,
        notes: JSON.stringify({ customShape: "long_banquet", isLocked: false }),
        sort_order: 10 + i
      });
    }
  } else if (templateType === "garden") {
    // Staggered grid layout avoiding the center dance floor
    const cols = tableCount <= 8 ? 4 : (tableCount <= 12 ? 4 : 5);
    let count = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < cols; col++) {
        if (count >= tableCount) break;
        const x = 450 + col * 550;
        const y = 400 + row * 340;
        // Avoid center dance floor area
        if (x > 1100 && x < 1900 && y > 750 && y < 1400) continue;

        tables.push({
          event_id: eventId,
          name: `Masa ${count + 1}`,
          capacity: 10,
          shape: "round",
          pos_x: x - 80,
          pos_y: y - 80,
          notes: JSON.stringify({ customShape: "round", isLocked: false }),
          sort_order: 10 + count
        });
        count++;
      }
    }
  } else if (templateType === "restaurant") {
    // Rectangular/square tables in grid avoiding dance floor
    const cols = tableCount <= 8 ? 4 : (tableCount <= 12 ? 4 : 5);
    let count = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < cols; col++) {
        if (count >= tableCount) break;
        const x = 500 + col * 550;
        const y = 400 + row * 340;
        // Avoid center dance floor and top sweetheart
        if (x > 1100 && x < 1900 && y > 750 && y < 1400) continue;
        if (x > 1200 && x < 1800 && y < 350) continue;

        const isSquare = count % 2 === 0;
        tables.push({
          event_id: eventId,
          name: `Masa ${count + 1}`,
          capacity: isSquare ? 4 : 6,
          shape: "rectangular",
          pos_x: x - (isSquare ? 80 : 96),
          pos_y: y - (isSquare ? 80 : 64),
          notes: JSON.stringify({ customShape: isSquare ? "square" : "rectangular", isLocked: false }),
          sort_order: 10 + count
        });
        count++;
      }
    }
  } else if (templateType === "long_hall") {
    // Two long banquet rows on left and right sides
    const half = Math.ceil(tableCount / 2);
    for (let i = 0; i < tableCount; i++) {
      const isRight = i >= half;
      const idx = isRight ? i - half : i;
      const x = isRight ? 1950 : 850;
      const y = 400 + idx * 180; // closely spaced for long hall feel

      tables.push({
        event_id: eventId,
        name: `Masa ${i + 1}`,
        capacity: 10,
        shape: "rectangular",
        pos_x: x,
        pos_y: y,
        notes: JSON.stringify({ customShape: "long_banquet", isLocked: false }),
        sort_order: 10 + i
      });
    }
  }

  const { error: insertError } = await supabase.from("seating_tables").insert(tables);
  if (insertError) {
    console.error("[applyRoomTemplate]", insertError);
    return { success: false, error: "Failed to apply templates" };
  }

  revalidateSeating(eventId);
  return { success: true };
}
