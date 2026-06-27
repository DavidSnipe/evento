"use server";

import { revalidatePath } from "next/cache";

import {
  denyUnlessEventAccess,
  denyUnlessEventPermission,
} from "@/lib/events/assert-event-access";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import type { SeatingTableRow, TableShape } from "@/types/guests";
import type { SeatingLayoutSnapshot, SnapshotTable } from "@/types/seating";
import { CURRENT_PLAN_SNAPSHOT_NAME } from "@/types/seating";

function revalidateSeating(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

function isMissingSnapshotTableError(message: string): boolean {
  return (
    message.includes("seating_layout_snapshots") ||
    message.includes("does not exist")
  );
}

function isMissingCurrentPlanColumnError(message: string): boolean {
  return message.includes("is_current_plan");
}

const LEGACY_AUTOSAVE_NAME = "Autosave";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function stripCurrentPlanColumn(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...payload };
  delete next.is_current_plan;
  return next;
}

async function insertSnapshotRow(
  supabase: SupabaseServerClient,
  row: Record<string, unknown>
) {
  let result = await supabase
    .from("seating_layout_snapshots")
    .insert(row)
    .select("*")
    .single();

  if (
    result.error &&
    isMissingCurrentPlanColumnError(result.error.message ?? "")
  ) {
    result = await supabase
      .from("seating_layout_snapshots")
      .insert(stripCurrentPlanColumn(row))
      .select("*")
      .single();
  }

  return result;
}

async function updateSnapshotRow(
  supabase: SupabaseServerClient,
  snapshotId: string,
  eventId: string,
  payload: Record<string, unknown>
) {
  let result = await supabase
    .from("seating_layout_snapshots")
    .update(payload)
    .eq("id", snapshotId)
    .eq("event_id", eventId)
    .select("*")
    .maybeSingle();

  if (
    result.error &&
    isMissingCurrentPlanColumnError(result.error.message ?? "")
  ) {
    result = await supabase
      .from("seating_layout_snapshots")
      .update(stripCurrentPlanColumn(payload))
      .eq("id", snapshotId)
      .eq("event_id", eventId)
      .select("*")
      .maybeSingle();
  }

  return result;
}

async function findCurrentPlanSnapshot(
  supabase: SupabaseServerClient,
  eventId: string
): Promise<{ id: string; name: string } | null> {
  const byFlag = await supabase
    .from("seating_layout_snapshots")
    .select("id, name")
    .eq("event_id", eventId)
    .eq("is_current_plan", true)
    .maybeSingle();

  if (!byFlag.error && byFlag.data) {
    return byFlag.data;
  }

  if (
    byFlag.error &&
    !isMissingCurrentPlanColumnError(byFlag.error.message ?? "")
  ) {
    console.error("[findCurrentPlanSnapshot] by flag", byFlag.error);
    return null;
  }

  const byName = await supabase
    .from("seating_layout_snapshots")
    .select("id, name")
    .eq("event_id", eventId)
    .in("name", [CURRENT_PLAN_SNAPSHOT_NAME, LEGACY_AUTOSAVE_NAME])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byName.error) {
    console.error("[findCurrentPlanSnapshot] by name", byName.error);
    return null;
  }

  return byName.data;
}

async function snapshotIsCurrentPlan(
  supabase: SupabaseServerClient,
  eventId: string,
  snapshotId: string,
  name: string
): Promise<boolean> {
  if (name === CURRENT_PLAN_SNAPSHOT_NAME) {
    return true;
  }

  const { data, error } = await supabase
    .from("seating_layout_snapshots")
    .select("is_current_plan")
    .eq("id", snapshotId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    if (isMissingCurrentPlanColumnError(error.message ?? "")) {
      return false;
    }
    console.error("[snapshotIsCurrentPlan]", error);
    return false;
  }

  return Boolean(data?.is_current_plan);
}

function validateSnapshotName(name: string): { trimmed: string } | { error: string } {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return { error: ro.seating.layoutSnapshots.nameRequired };
  }
  if (trimmed.length > 50) {
    return { error: ro.seating.layoutSnapshots.nameTooLong };
  }
  return { trimmed };
}

function rowToSnapshot(row: Record<string, unknown>): SeatingLayoutSnapshot {
  return {
    id: String(row.id),
    event_id: String(row.event_id),
    name: String(row.name),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    tables_json: (row.tables_json as SnapshotTable[]) ?? [],
    room_width_m: Number(row.room_width_m),
    room_height_m: Number(row.room_height_m),
    guest_assignments_json:
      (row.guest_assignments_json as Record<string, string>) ?? {},
    thumbnail_data_url:
      row.thumbnail_data_url != null ? String(row.thumbnail_data_url) : null,
    is_current_plan: Boolean(
      row.is_current_plan ?? row.name === CURRENT_PLAN_SNAPSHOT_NAME
    ),
  };
}

function tableRowToSnapshotTable(row: SeatingTableRow): SnapshotTable {
  return {
    id: row.id,
    name: row.name,
    shape: row.shape,
    capacity: row.capacity,
    pos_x: Number(row.pos_x),
    pos_y: Number(row.pos_y),
    sort_order: row.sort_order,
    notes: row.notes ?? "",
    color_tag: row.color_tag,
  };
}

type LiveSnapshotPayload = {
  tablesJson: SnapshotTable[];
  guestAssignmentsJson: Record<string, string>;
  roomWidthM: number;
  roomHeightM: number;
};

async function gatherLiveSnapshotPayload(
  eventId: string
): Promise<{ payload: LiveSnapshotPayload } | { error: string }> {
  const supabase = await createClient();

  const [tablesResult, eventResult, guestsResult] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("events")
      .select("seating_room_width_m, seating_room_height_m")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("guests")
      .select("id, table_id")
      .eq("event_id", eventId)
      .not("table_id", "is", null),
  ]);

  if (tablesResult.error) {
    console.error("[gatherLiveSnapshotPayload] tables", tablesResult.error);
    return { error: ro.seating.layoutSnapshots.saveFailed };
  }
  if (eventResult.error || !eventResult.data) {
    console.error("[gatherLiveSnapshotPayload] event", eventResult.error);
    return { error: ro.seating.layoutSnapshots.saveFailed };
  }
  if (guestsResult.error) {
    console.error("[gatherLiveSnapshotPayload] guests", guestsResult.error);
    return { error: ro.seating.layoutSnapshots.saveFailed };
  }

  const tables = (tablesResult.data ?? []) as SeatingTableRow[];
  const tableNameById = new Map(tables.map((t) => [t.id, t.name]));
  const tablesJson = tables.map(tableRowToSnapshotTable);

  const guestAssignmentsJson: Record<string, string> = {};
  for (const guest of guestsResult.data ?? []) {
    if (!guest.table_id) continue;
    const tableName = tableNameById.get(guest.table_id);
    if (tableName) {
      guestAssignmentsJson[guest.id] = tableName;
    }
  }

  return {
    payload: {
      tablesJson,
      guestAssignmentsJson,
      roomWidthM: Number(eventResult.data.seating_room_width_m ?? 30),
      roomHeightM: Number(eventResult.data.seating_room_height_m ?? 24),
    },
  };
}

async function clearCurrentPlanFlags(eventId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("seating_layout_snapshots")
    .update({ is_current_plan: false })
    .eq("event_id", eventId)
    .eq("is_current_plan", true);

  if (error) {
    console.error("[clearCurrentPlanFlags]", error);
  }
}

export async function saveSeatingSnapshot(
  eventId: string,
  name: string,
  thumbnailDataUrl?: string,
  options?: { is_current_plan?: boolean }
): Promise<{ snapshot?: SeatingLayoutSnapshot; error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return accessDenied;

  const nameResult = validateSnapshotName(name);
  if ("error" in nameResult) return { error: nameResult.error };

  const live = await gatherLiveSnapshotPayload(eventId);
  if ("error" in live) return { error: live.error };

  const supabase = await createClient();
  const isCurrentPlan = options?.is_current_plan === true;

  if (isCurrentPlan) {
    await clearCurrentPlanFlags(eventId);
  }

  const { data: inserted, error: insertError } = await insertSnapshotRow(
    supabase,
    {
      event_id: eventId,
      name: nameResult.trimmed,
      tables_json: live.payload.tablesJson,
      room_width_m: live.payload.roomWidthM,
      room_height_m: live.payload.roomHeightM,
      guest_assignments_json: live.payload.guestAssignmentsJson,
      thumbnail_data_url: thumbnailDataUrl ?? null,
      is_current_plan: isCurrentPlan,
    }
  );

  if (insertError) {
    console.error("[saveSeatingSnapshot] insert", insertError);
    if (isMissingSnapshotTableError(insertError.message ?? "")) {
      return { error: ro.seating.layoutSnapshots.migrationRequired };
    }
    return { error: ro.seating.layoutSnapshots.saveFailed };
  }

  revalidateSeating(eventId);
  return { snapshot: rowToSnapshot(inserted as Record<string, unknown>) };
}

export async function upsertCurrentPlanSnapshot(
  eventId: string,
  thumbnailDataUrl?: string
): Promise<{ snapshot?: SeatingLayoutSnapshot; error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return accessDenied;

  const live = await gatherLiveSnapshotPayload(eventId);
  if ("error" in live) return { error: live.error };

  const supabase = await createClient();
  const existing = await findCurrentPlanSnapshot(supabase, eventId);

  const updatePayload: Record<string, unknown> = {
    tables_json: live.payload.tablesJson,
    room_width_m: live.payload.roomWidthM,
    room_height_m: live.payload.roomHeightM,
    guest_assignments_json: live.payload.guestAssignmentsJson,
    is_current_plan: true,
  };

  if (thumbnailDataUrl !== undefined) {
    updatePayload.thumbnail_data_url = thumbnailDataUrl;
  }

  if (existing) {
    const { data: updated, error } = await updateSnapshotRow(
      supabase,
      existing.id,
      eventId,
      updatePayload
    );

    if (error) {
      console.error("[upsertCurrentPlanSnapshot] update", error);
      if (isMissingSnapshotTableError(error.message ?? "")) {
        return { error: ro.seating.layoutSnapshots.migrationRequired };
      }
      return { error: ro.seating.layoutSnapshots.saveFailed };
    }

    if (!updated) {
      return { error: ro.seating.layoutSnapshots.notFound };
    }

    revalidateSeating(eventId);
    return { snapshot: rowToSnapshot(updated as Record<string, unknown>) };
  }

  await clearCurrentPlanFlags(eventId);

  const { data: inserted, error: insertError } = await insertSnapshotRow(
    supabase,
    {
      event_id: eventId,
      name: CURRENT_PLAN_SNAPSHOT_NAME,
      tables_json: live.payload.tablesJson,
      room_width_m: live.payload.roomWidthM,
      room_height_m: live.payload.roomHeightM,
      guest_assignments_json: live.payload.guestAssignmentsJson,
      thumbnail_data_url: thumbnailDataUrl ?? null,
      is_current_plan: true,
    }
  );

  if (insertError) {
    console.error("[upsertCurrentPlanSnapshot] insert", insertError);
    if (isMissingSnapshotTableError(insertError.message ?? "")) {
      return { error: ro.seating.layoutSnapshots.migrationRequired };
    }
    return { error: ro.seating.layoutSnapshots.saveFailed };
  }

  revalidateSeating(eventId);
  return { snapshot: rowToSnapshot(inserted as Record<string, unknown>) };
}

export async function updateSeatingSnapshot(
  eventId: string,
  snapshotId: string,
  thumbnailDataUrl?: string | null
): Promise<{ snapshot?: SeatingLayoutSnapshot; error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return accessDenied;

  const live = await gatherLiveSnapshotPayload(eventId);
  if ("error" in live) return { error: live.error };

  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    tables_json: live.payload.tablesJson,
    room_width_m: live.payload.roomWidthM,
    room_height_m: live.payload.roomHeightM,
    guest_assignments_json: live.payload.guestAssignmentsJson,
  };

  if (thumbnailDataUrl !== undefined) {
    updatePayload.thumbnail_data_url = thumbnailDataUrl;
  }

  const { data: updated, error } = await supabase
    .from("seating_layout_snapshots")
    .update(updatePayload)
    .eq("id", snapshotId)
    .eq("event_id", eventId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[updateSeatingSnapshot]", error);
    if (isMissingSnapshotTableError(error.message ?? "")) {
      return { error: ro.seating.layoutSnapshots.migrationRequired };
    }
    return { error: ro.seating.layoutSnapshots.saveFailed };
  }

  if (!updated) {
    return { error: ro.seating.layoutSnapshots.notFound };
  }

  revalidateSeating(eventId);
  return { snapshot: rowToSnapshot(updated as Record<string, unknown>) };
}

export async function listSeatingSnapshots(
  eventId: string
): Promise<{ snapshots?: SeatingLayoutSnapshot[]; error?: string }> {
  const accessDenied = await denyUnlessEventAccess(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seating_layout_snapshots")
    .select("*")
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listSeatingSnapshots]", error);
    if (isMissingSnapshotTableError(error.message ?? "")) {
      return { snapshots: [] };
    }
    return { error: ro.seating.layoutSnapshots.listFailed };
  }

  return {
    snapshots: (data ?? []).map((row) =>
      rowToSnapshot(row as Record<string, unknown>)
    ),
  };
}

export async function activateSeatingSnapshot(
  eventId: string,
  snapshotId: string
): Promise<{ remapped: number; unassigned: number; error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return { remapped: 0, unassigned: 0, error: accessDenied.error };

  const supabase = await createClient();

  const { data: snapshotRow, error: snapshotError } = await supabase
    .from("seating_layout_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (snapshotError) {
    console.error("[activateSeatingSnapshot] fetch", snapshotError);
    if (isMissingSnapshotTableError(snapshotError.message ?? "")) {
      return {
        remapped: 0,
        unassigned: 0,
        error: ro.seating.layoutSnapshots.migrationRequired,
      };
    }
    return {
      remapped: 0,
      unassigned: 0,
      error: ro.seating.layoutSnapshots.activateFailed,
    };
  }

  if (!snapshotRow) {
    return {
      remapped: 0,
      unassigned: 0,
      error: ro.seating.layoutSnapshots.notFound,
    };
  }

  const snapshot = rowToSnapshot(snapshotRow as Record<string, unknown>);

  const { error: deleteError } = await supabase
    .from("seating_tables")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    console.error("[activateSeatingSnapshot] delete tables", deleteError);
    return {
      remapped: 0,
      unassigned: 0,
      error: ro.seating.layoutSnapshots.activateFailed,
    };
  }

  const tableNameToNewId = new Map<string, string>();

  if (snapshot.tables_json.length > 0) {
    const insertRows = snapshot.tables_json.map((t) => ({
      event_id: eventId,
      name: t.name,
      shape: t.shape as TableShape,
      capacity: t.capacity,
      pos_x: t.pos_x,
      pos_y: t.pos_y,
      sort_order: t.sort_order,
      notes: t.notes || null,
      color_tag: t.color_tag ?? null,
    }));

    const { data: insertedTables, error: insertError } = await supabase
      .from("seating_tables")
      .insert(insertRows)
      .select("id, name");

    if (insertError) {
      console.error("[activateSeatingSnapshot] insert tables", insertError);
      return {
        remapped: 0,
        unassigned: 0,
        error: ro.seating.layoutSnapshots.activateFailed,
      };
    }

    for (const row of insertedTables ?? []) {
      if (!tableNameToNewId.has(row.name)) {
        tableNameToNewId.set(row.name, row.id);
      }
    }
  }

  const { error: roomError } = await supabase.rpc("update_seating_room_size", {
    p_event_id: eventId,
    p_width_m: snapshot.room_width_m,
    p_height_m: snapshot.room_height_m,
  });

  if (roomError) {
    console.error("[activateSeatingSnapshot] room size", roomError);
    return {
      remapped: 0,
      unassigned: 0,
      error: ro.seating.layoutSnapshots.activateFailed,
    };
  }

  let remapped = 0;
  let unassigned = 0;

  for (const [guestId, tableName] of Object.entries(
    snapshot.guest_assignments_json
  )) {
    const newTableId = tableNameToNewId.get(tableName);
    if (!newTableId) {
      unassigned++;
      continue;
    }

    const { data: updatedGuest, error: guestError } = await supabase
      .from("guests")
      .update({ table_id: newTableId })
      .eq("id", guestId)
      .eq("event_id", eventId)
      .select("id")
      .maybeSingle();

    if (guestError || !updatedGuest) {
      unassigned++;
      continue;
    }

    remapped++;
  }

  const upsertResult = await upsertCurrentPlanSnapshot(eventId);
  if (upsertResult.error) {
    console.error(
      "[activateSeatingSnapshot] upsert current plan",
      upsertResult.error
    );
  }

  revalidateSeating(eventId);
  return { remapped, unassigned };
}

export async function deleteSeatingSnapshot(
  eventId: string,
  snapshotId: string
): Promise<{ error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return accessDenied;

  const supabase = await createClient();

  const { data: row, error: fetchError } = await supabase
    .from("seating_layout_snapshots")
    .select("id, name")
    .eq("id", snapshotId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteSeatingSnapshot] fetch", fetchError);
    if (isMissingSnapshotTableError(fetchError.message ?? "")) {
      return { error: ro.seating.layoutSnapshots.migrationRequired };
    }
    return { error: ro.seating.layoutSnapshots.deleteFailed };
  }

  if (!row) {
    return { error: ro.seating.layoutSnapshots.notFound };
  }

  if (await snapshotIsCurrentPlan(supabase, eventId, snapshotId, row.name)) {
    return { error: ro.seating.layoutSnapshots.cannotDeleteCurrentPlan };
  }

  const { error } = await supabase
    .from("seating_layout_snapshots")
    .delete()
    .eq("id", snapshotId)
    .eq("event_id", eventId);

  if (error) {
    console.error("[deleteSeatingSnapshot]", error);
    if (isMissingSnapshotTableError(error.message ?? "")) {
      return { error: ro.seating.layoutSnapshots.migrationRequired };
    }
    return { error: ro.seating.layoutSnapshots.deleteFailed };
  }

  revalidateSeating(eventId);
  return {};
}

export async function updateSnapshotName(
  eventId: string,
  snapshotId: string,
  name: string
): Promise<{ error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return accessDenied;

  const nameResult = validateSnapshotName(name);
  if ("error" in nameResult) return { error: nameResult.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seating_layout_snapshots")
    .update({ name: nameResult.trimmed })
    .eq("id", snapshotId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[updateSnapshotName]", error);
    if (isMissingSnapshotTableError(error.message ?? "")) {
      return { error: ro.seating.layoutSnapshots.migrationRequired };
    }
    return { error: ro.seating.layoutSnapshots.saveFailed };
  }

  if (!data) {
    return { error: ro.seating.layoutSnapshots.notFound };
  }

  revalidateSeating(eventId);
  return {};
}
