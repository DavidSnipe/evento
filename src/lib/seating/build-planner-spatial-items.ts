import type { TableWithGuests } from "@/lib/seating/queries";
import { getTableFootprintPx } from "@/lib/seating/table-spatial";
import { parseMetadata } from "@/lib/seating/utils";
import {
  rectFromPosition,
  type FootprintRect,
  type PlannerSpatialItem,
} from "@/lib/seating/planner-spatial-assist";

export function buildPlannerSpatialItems(
  tables: TableWithGuests[]
): PlannerSpatialItem[] {
  return tables.map((table) => {
    const meta = parseMetadata(table.notes);
    const fp = getTableFootprintPx(meta, meta.customShape ?? table.shape);
    const x = table.pos_x ?? 0;
    const y = table.pos_y ?? 0;
    const rect = rectFromPosition(
      x,
      y,
      fp.footprintWidthPx,
      fp.footprintHeightPx
    );
    return {
      id: table.id,
      renderKey:
        "renderKey" in table && typeof table.renderKey === "string"
          ? table.renderKey
          : table.id,
      rect,
    };
  });
}

export function footprintRectForTable(
  table: TableWithGuests,
  posX: number,
  posY: number
): FootprintRect {
  const meta = parseMetadata(table.notes);
  const fp = getTableFootprintPx(meta, meta.customShape ?? table.shape);
  return rectFromPosition(posX, posY, fp.footprintWidthPx, fp.footprintHeightPx);
}
