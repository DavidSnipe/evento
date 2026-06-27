import {
  tablePositionsToCanvas,
  type LocalPlannerTable,
} from "@/lib/seating/planner-table-state";
import type { TableWithGuests } from "@/lib/seating/queries";
import type { TableShape } from "@/types/guests";
import type { SeatingLayoutSnapshot } from "@/types/seating";

/** Convert a saved snapshot into planner canvas rows for read-only preview. */
export function snapshotTablesToPlannerTables(
  snapshot: SeatingLayoutSnapshot,
  eventId: string
): LocalPlannerTable[] {
  return snapshot.tables_json.map((t) => {
    const row: TableWithGuests = {
      id: t.id,
      event_id: eventId,
      name: t.name,
      capacity: t.capacity,
      shape: t.shape as TableShape,
      color_tag: t.color_tag ?? null,
      notes: t.notes || null,
      pos_x: t.pos_x,
      pos_y: t.pos_y,
      sort_order: t.sort_order,
      created_at: snapshot.created_at,
      guests: [],
    };
    return {
      ...tablePositionsToCanvas(row),
      renderKey: `preview-${snapshot.id}-${t.id}`,
    };
  });
}
