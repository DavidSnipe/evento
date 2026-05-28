import type { TableWithGuests } from "@/lib/seating/queries";
import { storedPxToCanvasPx } from "@/lib/seating/spatial";

export type LocalPlannerTable = TableWithGuests & { renderKey: string };

export type PlannerPendingSets = {
  optimisticCreateIds: ReadonlySet<string>;
  updateIds: ReadonlySet<string>;
  deleteIds: ReadonlySet<string>;
};

/** Normalize DB positions (100 px/m) to current canvas pixels (65 px/m) */
export function tablePositionsToCanvas<T extends { pos_x?: number | null; pos_y?: number | null }>(
  table: T
): T {
  return {
    ...table,
    pos_x: storedPxToCanvasPx(table.pos_x ?? 0),
    pos_y: storedPxToCanvasPx(table.pos_y ?? 0),
  };
}

/** Merge server seating rows with local planner state (in-flight creates/updates/deletes). */
export function mergeServerTablesIntoLocal(
  prev: LocalPlannerTable[],
  serverTables: TableWithGuests[],
  pending: PlannerPendingSets
): LocalPlannerTable[] {
  const prevById = new Map(prev.map((t) => [t.id, t]));
  const serverIds = new Set(serverTables.map((t) => t.id));

  const visibleServer = serverTables.filter((t) => !pending.deleteIds.has(t.id));

  const fromServer: LocalPlannerTable[] = visibleServer.map((t) => {
    const existing = prevById.get(t.id);
    if (existing && pending.updateIds.has(t.id)) {
      return existing;
    }
    const canvas = tablePositionsToCanvas(t);
    if (
      existing &&
      existing.pos_x === canvas.pos_x &&
      existing.pos_y === canvas.pos_y &&
      existing.notes === t.notes &&
      existing.name === t.name &&
      existing.capacity === t.capacity &&
      existing.guests.length === (t.guests?.length ?? 0)
    ) {
      return existing;
    }
    return {
      ...canvas,
      guests: t.guests ?? existing?.guests ?? [],
      renderKey: existing?.renderKey ?? t.id,
    };
  });

  const pendingCreates = prev.filter((t) => pending.optimisticCreateIds.has(t.id));
  if (pendingCreates.length > 0) {
    const newOnServer = visibleServer.filter((t) => !prevById.has(t.id));
    if (newOnServer.length >= pendingCreates.length) {
      return fromServer;
    }
  }

  const optimisticOnly = prev.filter(
    (t) =>
      pending.optimisticCreateIds.has(t.id) &&
      !serverIds.has(t.id) &&
      !pending.deleteIds.has(t.id)
  );
  return [...fromServer, ...optimisticOnly];
}

export function toLocalPlannerTable(
  table: TableWithGuests,
  renderKey?: string
): LocalPlannerTable {
  return {
    ...tablePositionsToCanvas(table),
    guests: table.guests ?? [],
    renderKey: renderKey ?? table.id,
  };
}

/** Resolve a table row by DB id, optimistic temp id, or stable renderKey */
export function findPlannerRow(
  rows: LocalPlannerTable[],
  idOrKey: string,
  idAliases?: ReadonlyMap<string, string>
): LocalPlannerTable | undefined {
  const aliasedId = idAliases?.get(idOrKey);
  if (aliasedId) {
    const byAlias = rows.find((t) => t.id === aliasedId);
    if (byAlias) return byAlias;
  }
  return rows.find((t) => t.id === idOrKey || t.renderKey === idOrKey);
}
