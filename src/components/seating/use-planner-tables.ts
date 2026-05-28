"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteTable,
  updateTable,
  type TableFormState,
} from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import type { TableWithGuests } from "@/lib/seating/queries";
import { canvasPxToStoredPx } from "@/lib/seating/spatial";
import {
  findPlannerRow,
  mergeServerTablesIntoLocal,
  tablePositionsToCanvas,
  toLocalPlannerTable,
  type LocalPlannerTable,
} from "@/lib/seating/planner-table-state";
import type { TableMetadata } from "@/lib/seating/utils";
import { buildMetadataNotesUpdate } from "@/lib/seating/planner-mutations";
import type { GuestWithTable } from "@/types/guests";

type UpdateTablePayload = {
  name?: string;
  notes?: string;
  capacity?: number;
  shape?: TableWithGuests["shape"];
  pos_x?: number;
  pos_y?: number;
};

const TEMP_ID_PREFIX = "temp-";

function isTempTableId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

export function usePlannerTables(
  eventId: string,
  tables: TableWithGuests[],
  allGuests: GuestWithTable[],
  unassigned: GuestWithTable[]
) {
  const [localTables, setLocalTables] = useState<LocalPlannerTable[]>(() =>
    tables.map((t) => toLocalPlannerTable(t))
  );
  const [localAllGuests, setLocalAllGuests] = useState(allGuests);
  const [localUnassigned, setLocalUnassigned] = useState(unassigned);

  const localTablesRef = useRef(localTables);
  localTablesRef.current = localTables;

  const pendingCreateIdsRef = useRef<Set<string>>(new Set());
  const pendingUpdateIdsRef = useRef<Set<string>>(new Set());
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());
  /** temp optimistic id → real DB id after create reconciles */
  const idAliasesRef = useRef<Map<string, string>>(new Map());

  const getPending = useCallback(
    () => ({
      optimisticCreateIds: pendingCreateIdsRef.current,
      updateIds: pendingUpdateIdsRef.current,
      deleteIds: pendingDeleteIdsRef.current,
    }),
    []
  );

  const waitForRealTableId = useCallback(async (tempId: string, maxMs = 4000) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const alias = idAliasesRef.current.get(tempId);
      if (alias && !isTempTableId(alias)) return alias;
      const row = findPlannerRow(
        localTablesRef.current,
        tempId,
        idAliasesRef.current
      );
      if (row && !isTempTableId(row.id)) return row.id;
      await new Promise((r) => setTimeout(r, 40));
    }
    return idAliasesRef.current.get(tempId) ?? null;
  }, []);

  const resolveServerTableId = useCallback(
    async (idOrKey: string, row?: LocalPlannerTable) => {
      const resolved =
        row ??
        findPlannerRow(localTablesRef.current, idOrKey, idAliasesRef.current);
      if (!resolved) return null;
      if (!isTempTableId(resolved.id)) return resolved.id;
      const alias = idAliasesRef.current.get(resolved.id);
      if (alias && !isTempTableId(alias)) return alias;
      return waitForRealTableId(resolved.id);
    },
    [waitForRealTableId]
  );

  useEffect(() => {
    setLocalAllGuests(allGuests);
    setLocalUnassigned(unassigned);

    setLocalTables((prev) => {
      const pending = pendingCreateIdsRef.current;
      const pendingRows = prev.filter((t) => pending.has(t.id));
      if (pendingRows.length > 0) {
        const prevIds = new Set(prev.map((t) => t.id));
        const newOnServer = tables.filter((t) => !prevIds.has(t.id));
        if (newOnServer.length >= pendingRows.length) {
          pendingRows.forEach((t) => pending.delete(t.id));
        }
      }
      return mergeServerTablesIntoLocal(prev, tables, getPending());
    });
  }, [tables, allGuests, unassigned, getPending]);

  const patchLocalTable = useCallback(
    (tableId: string, patch: Partial<LocalPlannerTable>) => {
      setLocalTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, ...patch } : t))
      );
    },
    []
  );

  const runTableMutation = useCallback(
    async (
      idOrKey: string,
      applyOptimistic: (row: LocalPlannerTable) => LocalPlannerTable,
      serverPayload:
        | UpdateTablePayload
        | ((row: LocalPlannerTable) => UpdateTablePayload),
      options?: { skipPending?: boolean }
    ): Promise<{ ok: boolean; error?: string; skipped?: boolean }> => {
      let snapshot: LocalPlannerTable | undefined;
      let nextRow: LocalPlannerTable | undefined;
      let matchedRow: LocalPlannerTable | undefined;

      setLocalTables((prev) => {
        const row = findPlannerRow(prev, idOrKey, idAliasesRef.current);
        if (!row) return prev;
        matchedRow = row;
        snapshot = row;
        nextRow = applyOptimistic(row);
        return prev.map((t) => (t.id === row.id ? nextRow! : t));
      });

      const markPending = (ids: string[]) => {
        if (options?.skipPending) return;
        ids.forEach((id) => pendingUpdateIdsRef.current.add(id));
      };
      const clearPending = (ids: string[]) => {
        ids.forEach((id) => pendingUpdateIdsRef.current.delete(id));
      };

      if (!matchedRow || !nextRow) {
        const pendingDeletes = pendingDeleteIdsRef.current;
        if (
          pendingDeletes.has(idOrKey) ||
          [...pendingDeletes].some(
            (id) => idAliasesRef.current.get(idOrKey) === id
          )
        ) {
          return { ok: true, skipped: true };
        }

        const existing = findPlannerRow(
          localTablesRef.current,
          idOrKey,
          idAliasesRef.current
        );
        if (existing) {
          const serverId = await resolveServerTableId(idOrKey, existing);
          if (serverId) {
            const payload =
              typeof serverPayload === "function"
                ? serverPayload(existing)
                : serverPayload;
            const result = await updateTable(eventId, serverId, payload);
            if (result?.error) return { ok: false, error: result.error };
            return { ok: true, skipped: true };
          }
          if (isTempTableId(existing.id)) {
            return { ok: true, skipped: true };
          }
        }
        return { ok: false, error: "Table not found" };
      }

      const pendingKeys = [
        matchedRow.id,
        idOrKey,
        matchedRow.renderKey,
      ];
      markPending(pendingKeys);

      const serverId = await resolveServerTableId(idOrKey, matchedRow);
      clearPending(pendingKeys);

      if (!serverId) {
        return { ok: true, skipped: true };
      }

      const payload =
        typeof serverPayload === "function"
          ? serverPayload(nextRow)
          : serverPayload;

      const result = await updateTable(eventId, serverId, payload);

      if (result?.error) {
        if (snapshot) {
          const row = snapshot;
          setLocalTables((prev) =>
            prev.map((t) => (t.id === row.id ? row : t))
          );
        }
        return { ok: false, error: result.error };
      }
      return { ok: true };
    },
    [eventId, resolveServerTableId]
  );

  const updateTableNotes = useCallback(
    async (
      idOrKey: string,
      notesText: string,
      metadataPatch: Partial<TableMetadata>,
      tableShape: string
    ) => {
      return runTableMutation(
        idOrKey,
        (t) => ({
          ...t,
          notes: buildMetadataNotesUpdate(
            t.notes,
            notesText,
            metadataPatch,
            tableShape
          ),
        }),
        (t) => ({ notes: t.notes ?? "" })
      );
    },
    [runTableMutation]
  );

  const updateTableName = useCallback(
    async (idOrKey: string, name: string) => {
      return runTableMutation(idOrKey, (t) => ({ ...t, name }), { name });
    },
    [runTableMutation]
  );

  const moveTableOnCanvas = useCallback(
    async (idOrKey: string, canvasX: number, canvasY: number) => {
      const storedX = canvasPxToStoredPx(canvasX);
      const storedY = canvasPxToStoredPx(canvasY);
      return runTableMutation(
        idOrKey,
        (t) => ({ ...t, pos_x: canvasX, pos_y: canvasY }),
        { pos_x: storedX, pos_y: storedY },
        { skipPending: true }
      );
    },
    [runTableMutation]
  );

  const deleteTableOptimistic = useCallback(
    async (idOrKey: string) => {
      const row = findPlannerRow(
        localTablesRef.current,
        idOrKey,
        idAliasesRef.current
      );
      const deleteIds = new Set<string>([idOrKey]);
      if (row) {
        deleteIds.add(row.id);
        deleteIds.add(row.renderKey);
      }

      let snapshot: LocalPlannerTable | undefined;

      deleteIds.forEach((id) => pendingDeleteIdsRef.current.add(id));

      setLocalTables((prev) => {
        const target = findPlannerRow(prev, idOrKey, idAliasesRef.current);
        if (!target) return prev;
        snapshot = target;
        return prev.filter((t) => t.id !== target.id);
      });

      const serverId = row ? await resolveServerTableId(idOrKey, row) : null;

      if (!serverId) {
        deleteIds.forEach((id) => pendingDeleteIdsRef.current.delete(id));
        if (!row && !snapshot) {
          return { ok: true as const, skipped: true as const };
        }
        return { ok: true as const };
      }

      try {
        await deleteTable(eventId, serverId);
        deleteIds.forEach((id) => pendingDeleteIdsRef.current.delete(id));
        return { ok: true as const };
      } catch (err) {
        console.error("[deleteTable]", err);
        deleteIds.forEach((id) => pendingDeleteIdsRef.current.delete(id));
        if (snapshot) {
          const restored = snapshot;
          setLocalTables((prev) => {
            if (prev.some((t) => t.id === restored.id)) return prev;
            return [...prev, restored];
          });
        }
        return { ok: false as const, error: "Delete failed" };
      }
    },
    [eventId, resolveServerTableId]
  );

  const addTablesOptimistic = useCallback(
    (tempTables: TableWithGuests[], promise: Promise<TableFormState>) => {
      const tempIds = tempTables.map((t) => t.id);
      tempIds.forEach((id) => pendingCreateIdsRef.current.add(id));

      const tempsWithKeys: LocalPlannerTable[] = tempTables.map((t) =>
        toLocalPlannerTable(t, t.id)
      );

      setLocalTables((prev) => [...prev, ...tempsWithKeys]);

      promise
        .then((result) => {
          tempIds.forEach((id) => pendingCreateIdsRef.current.delete(id));

          if (result.error) {
            alert(result.error);
            setLocalTables((prev) =>
              prev.filter((t) => !tempIds.includes(t.id))
            );
            return;
          }

          const inserted = result.tables ?? [];
          if (inserted.length === 0) return;

          setLocalTables((prev) => {
            const tempIdSet = new Set(tempIds);
            if (!prev.some((t) => tempIdSet.has(t.id))) {
              return prev;
            }
            return prev.map((t) => {
              const idx = tempIds.indexOf(t.id);
              if (idx === -1) return t;
              const real = inserted[idx] as TableWithGuests | undefined;
              if (!real) return t;
              idAliasesRef.current.set(tempIds[idx], real.id);
              idAliasesRef.current.set(t.renderKey, real.id);
              return {
                ...tablePositionsToCanvas({ ...real, guests: real.guests ?? [] }),
                guests: real.guests ?? t.guests ?? [],
                renderKey: t.renderKey,
              };
            });
          });
        })
        .catch((err) => {
          console.error("Failed to insert tables:", err);
          tempIds.forEach((id) => pendingCreateIdsRef.current.delete(id));
          setLocalTables((prev) => prev.filter((t) => !tempIds.includes(t.id)));
        });
    },
    []
  );

  const resolveMutationTarget = useCallback((idOrKey: string) => {
    return findPlannerRow(
      localTablesRef.current,
      idOrKey,
      idAliasesRef.current
    );
  }, []);

  return {
    localTables,
    setLocalTables,
    localAllGuests,
    setLocalAllGuests,
    localUnassigned,
    setLocalUnassigned,
    patchLocalTable,
    runTableMutation,
    updateTableNotes,
    updateTableName,
    moveTableOnCanvas,
    deleteTableOptimistic,
    addTablesOptimistic,
    resolveMutationTarget,
  };
}
