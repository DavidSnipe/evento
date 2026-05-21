import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { GuestWithTable, RsvpStatus, SeatingTableRow, GuestRow } from "@/types/guests";
import {
  updateGuestRsvp,
  deleteGuest as apiDeleteGuest,
  assignGuestToTable,
  bulkDeleteGuests,
  bulkUpdateRsvp,
  bulkAssignTable,
  updateGuestTags,
  updateGuestField,
  createSubGuest as apiCreateSubGuest,
  deleteSubGuest as apiDeleteSubGuest,
} from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";

type PendingUpdate = {
  fields: Partial<GuestWithTable>;
};

export function useGuestOptimistic(
  eventId: string,
  initialGuests: GuestWithTable[],
  tables: SeatingTableRow[]
) {
  const [localGuests, setLocalGuests] = useState<GuestWithTable[]>(initialGuests);
  const [syncingCounts, setSyncingCounts] = useState<Record<string, number>>({});

  const syncingIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(syncingCounts).forEach(([id, count]) => {
      if (count > 0) ids.add(id);
    });
    return ids;
  }, [syncingCounts]);

  // Track pending updates in-flight to prevent race conditions during prop updates
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());

  // Keep a ref to localGuests to avoid re-creating mutation callbacks
  const guestsRef = useRef(localGuests);
  useEffect(() => {
    guestsRef.current = localGuests;
  }, [localGuests]);

  // Synchronize state when initialGuests prop changes, merging any in-flight optimistic states
  useEffect(() => {
    setLocalGuests(() => {
      return initialGuests.map((serverGuest) => {
        const pending = pendingUpdates.current.get(serverGuest.id);
        if (pending) {
          // Check if the server version has caught up with all our optimistic fields
          const isCaughtUp = Object.keys(pending.fields).every((key) => {
            const k = key as keyof GuestWithTable;
            if (k === "seating_tables") {
              return serverGuest.seating_tables?.id === pending.fields.seating_tables?.id;
            }
            if (k === "subGuests") {
              const serverSub = serverGuest.subGuests ?? [];
              const pendingSub = pending.fields.subGuests ?? [];
              if (serverSub.length !== pendingSub.length) return false;
              // Check if any subGuest has temporary ID
              if (pendingSub.some((sg) => sg.id.startsWith("temp-"))) return false;
              return pendingSub.every((psg) =>
                serverSub.some(
                  (ssg) =>
                    ssg.id === psg.id &&
                    ssg.first_name === psg.first_name &&
                    ssg.last_name === psg.last_name &&
                    ssg.rsvp_status === psg.rsvp_status &&
                    ssg.relationship_type === psg.relationship_type
                )
              );
            }
            return serverGuest[k] === pending.fields[k];
          });

          if (isCaughtUp) {
            pendingUpdates.current.delete(serverGuest.id);
            return serverGuest;
          } else {
            // Preserve the optimistic override
            return {
              ...serverGuest,
              ...pending.fields,
            };
          }
        }
        return serverGuest;
      });
    });
  }, [initialGuests]);

  // General optimistic helper
  const performMutation = useCallback(
    (
      guestId: string,
      fieldsToUpdate: Partial<GuestWithTable>,
      apiCall: () => Promise<unknown>
    ) => {
      const guestBefore = guestsRef.current.find((g) => g.id === guestId);
      if (!guestBefore) return;

      // Capture original values for modified keys for granular rollback
      const originalFields: Partial<GuestWithTable> = {};
      Object.keys(fieldsToUpdate).forEach((key) => {
        const k = key as keyof GuestWithTable;
        originalFields[k] = guestBefore[k] as never;
      });

      // 1. Update local state instantly and synchronously
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (g.id === guestId) {
            return { ...g, ...fieldsToUpdate };
          }
          return g;
        })
      );

      // 2. Track in the pendingUpdates ref
      const existingPending = pendingUpdates.current.get(guestId);
      pendingUpdates.current.set(guestId, {
        fields: {
          ...(existingPending?.fields ?? {}),
          ...fieldsToUpdate,
        },
      });

      // 3. Mark guest as syncing in local state
      setSyncingCounts((prev) => ({
        ...prev,
        [guestId]: (prev[guestId] ?? 0) + 1,
      }));

      // 4. Fire backend API call asynchronously in the background
      apiCall()
        .then((res) => {
          const typedRes = res as { error?: string } | null | undefined;
          if (typedRes && typedRes.error) {
            throw new Error(typedRes.error);
          }
        })
        .catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[Mutation Failed] Rolling back fields:", error.message);
          
          // Revert only the specific modified fields
          setLocalGuests((prev) =>
            prev.map((g) => {
              if (g.id === guestId) {
                return { ...g, ...originalFields };
              }
              return g;
            })
          );

          pendingUpdates.current.delete(guestId);
          alert(error.message || "A apărut o eroare la salvarea datelor.");
        })
        .finally(() => {
          setSyncingCounts((prev) => ({
            ...prev,
            [guestId]: Math.max(0, (prev[guestId] ?? 1) - 1),
          }));
        });
    },
    []
  );

  // RSVP Change
  const handleRsvpChange = useCallback(
    (guestId: string, status: RsvpStatus) => {
      performMutation(guestId, { rsvp_status: status }, () =>
        updateGuestRsvp(eventId, guestId, status)
      );
    },
    [eventId, performMutation]
  );

  // Table Change
  const handleTableChange = useCallback(
    (guestId: string, tableId: string | null) => {
      const selectedTable = tables.find((t) => t.id === tableId);
      const seatingTables = selectedTable ? { id: selectedTable.id, name: selectedTable.name } : null;

      performMutation(
        guestId,
        {
          table_id: tableId,
          seating_tables: seatingTables,
        },
        () => assignGuestToTable(eventId, guestId, tableId)
      );
    },
    [eventId, tables, performMutation]
  );

  // Update Tags
  const handleUpdateTags = useCallback(
    (guestId: string, tags: string[]) => {
      performMutation(guestId, { tags }, () => updateGuestTags(eventId, guestId, tags));
    },
    [eventId, performMutation]
  );

  // Update Specific Field
  const handleUpdateField = useCallback(
    (guestId: string, field: string, value: string | boolean | null) => {
      performMutation(guestId, { [field]: value }, () =>
        updateGuestField(eventId, guestId, field, value)
      );
    },
    [eventId, performMutation]
  );

  // Delete Guest
  const handleDeleteGuest = useCallback(
    (guestId: string) => {
      if (!confirm("Ștergi acest invitat?")) return;
      const guestToDelete = guestsRef.current.find((g) => g.id === guestId);
      if (!guestToDelete) return;

      // Optimistic delete
      setLocalGuests((prev) => prev.filter((g) => g.id !== guestId));

      apiDeleteGuest(eventId, guestId).catch((err) => {
        console.error("Delete failed, rolling back:", err);
        // Put the deleted guest back
        setLocalGuests((prev) => [guestToDelete, ...prev]);
        alert("Eroare la ștergerea invitatului.");
      });
    },
    [eventId]
  );

  // Bulk Actions
  const handleBulkDelete = useCallback(
    (selectedIds: Set<string>) => {
      if (!confirm(`Ștergi ${selectedIds.size} invitați selectați?`)) return false;
      const guestsToDelete = guestsRef.current.filter((g) => selectedIds.has(g.id));

      // Optimistic delete
      setLocalGuests((prev) => prev.filter((g) => !selectedIds.has(g.id)));

      bulkDeleteGuests(eventId, Array.from(selectedIds)).catch((err) => {
        console.error("Bulk delete failed, rolling back:", err);
        // Put the deleted guests back
        setLocalGuests((prev) => [...guestsToDelete, ...prev]);
        alert("Eroare la ștergerea în masă.");
      });
      return true;
    },
    [eventId]
  );

  const handleBulkRsvp = useCallback(
    (selectedIds: Set<string>, status: RsvpStatus) => {
      const originalRsvps = new Map<string, RsvpStatus>();
      guestsRef.current.forEach((g) => {
        if (selectedIds.has(g.id)) {
          originalRsvps.set(g.id, g.rsvp_status);
        }
      });

      // Optimistic update
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (selectedIds.has(g.id)) {
            return { ...g, rsvp_status: status };
          }
          return g;
        })
      );

      // Add to syncing counts
      setSyncingCounts((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          next[id] = (next[id] ?? 0) + 1;
        });
        return next;
      });

      bulkUpdateRsvp(eventId, Array.from(selectedIds), status)
        .catch((err) => {
          console.error("Bulk RSVP update failed, rolling back:", err);
          // Rollback only the affected guests
          setLocalGuests((prev) =>
            prev.map((g) => {
              if (selectedIds.has(g.id)) {
                const orig = originalRsvps.get(g.id);
                return orig ? { ...g, rsvp_status: orig } : g;
              }
              return g;
            })
          );
          alert("Eroare la actualizarea în masă.");
        })
        .finally(() => {
          setSyncingCounts((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
              next[id] = Math.max(0, (next[id] ?? 1) - 1);
            });
            return next;
          });
        });
    },
    [eventId]
  );

  const handleBulkAssignTable = useCallback(
    (selectedIds: Set<string>, tableId: string | null) => {
      const selectedTable = tables.find((t) => t.id === tableId);
      const seatingTables = selectedTable ? { id: selectedTable.id, name: selectedTable.name } : null;

      const originalAssignments = new Map<string, { table_id: string | null, seating_tables: typeof seatingTables }>();
      guestsRef.current.forEach((g) => {
        if (selectedIds.has(g.id)) {
          originalAssignments.set(g.id, { table_id: g.table_id, seating_tables: g.seating_tables });
        }
      });

      // Optimistic update
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (selectedIds.has(g.id)) {
            return { ...g, table_id: tableId, seating_tables: seatingTables };
          }
          return g;
        })
      );

      // Add to syncing counts
      setSyncingCounts((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          next[id] = (next[id] ?? 0) + 1;
        });
        return next;
      });

      bulkAssignTable(eventId, Array.from(selectedIds), tableId)
        .catch((err) => {
          console.error("Bulk assign table failed, rolling back:", err);
          setLocalGuests((prev) =>
            prev.map((g) => {
              if (selectedIds.has(g.id)) {
                const orig = originalAssignments.get(g.id);
                return orig ? { ...g, table_id: orig.table_id, seating_tables: orig.seating_tables } : g;
              }
              return g;
            })
          );
          alert("Eroare la repartizarea în masă.");
        })
        .finally(() => {
          setSyncingCounts((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
              next[id] = Math.max(0, (next[id] ?? 1) - 1);
            });
            return next;
          });
        });
    },
    [eventId, tables]
  );

  // Sub-guest Management
  const handleAddSubGuest = useCallback(
    (parentId: string, type: "couple" | "family" | "child") => {
      const tempId = `temp-sub-${Date.now()}`;
      const parentGuest = guestsRef.current.find((g) => g.id === parentId);
      if (!parentGuest) return;

      const newSubTemp: GuestRow = {
        id: tempId,
        event_id: eventId,
        parent_id: parentId,
        first_name: type === "couple" ? "Partener" : "Membru",
        last_name: parentGuest.last_name || null,
        rsvp_status: parentGuest.rsvp_status || "pending",
        relationship_type: type,
        table_id: parentGuest.table_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        family_id: null,
        group_id: null,
        email: null,
        phone: null,
        plus_one: false,
        plus_one_name: null,
        group_name: null,
        dietary_notes: null,
        notes: null,
        seat_label: null,
        tags: [],
      };

      // 1. Optimistic Add
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (g.id === parentId) {
            const sub = g.subGuests ?? [];
            return { ...g, subGuests: [...sub, newSubTemp as GuestWithTable] };
          }
          return g;
        })
      );

      // Background API call
      apiCreateSubGuest(eventId, parentId, type)
        .then((res) => {
          if (res.error) throw new Error(res.error);
          if (res.subGuest) {
            // Swap temporary ID with DB ID
            const realSub = res.subGuest;
            setLocalGuests((prev) =>
              prev.map((g) => {
                if (g.id === parentId) {
                  const sub = g.subGuests ?? [];
                  return {
                    ...g,
                    subGuests: sub.map((s) => (s.id === tempId ? (realSub as GuestWithTable) : s)),
                  };
                }
                return g;
              })
            );
          }
        })
        .catch((err: unknown) => {
          console.error("Create sub-guest failed, rolling back:", err);
          // Rollback by removing the temp sub-guest
          setLocalGuests((prev) =>
            prev.map((g) => {
              if (g.id === parentId) {
                const sub = g.subGuests ?? [];
                return { ...g, subGuests: sub.filter((s) => s.id !== tempId) };
              }
              return g;
            })
          );
          const error = err instanceof Error ? err : new Error(String(err));
          alert(error.message || "Eroare la adăugarea membrului asociat.");
        });
    },
    [eventId]
  );

  const handleDeleteSubGuest = useCallback(
    (parentId: string, subGuestId: string) => {
      if (!confirm("Ștergi acest membru asociat?")) return;
      const parentGuest = guestsRef.current.find((g) => g.id === parentId);
      const subToDelete = parentGuest?.subGuests?.find((s) => s.id === subGuestId);
      if (!subToDelete) return;

      // Optimistic delete
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (g.id === parentId) {
            const sub = g.subGuests ?? [];
            return { ...g, subGuests: sub.filter((s) => s.id !== subGuestId) };
          }
          return g;
        })
      );

      apiDeleteSubGuest(eventId, subGuestId).catch((err) => {
        console.error("Delete sub-guest failed, rolling back:", err);
        // Put it back
        setLocalGuests((prev) =>
          prev.map((g) => {
            if (g.id === parentId) {
              const sub = g.subGuests ?? [];
              return { ...g, subGuests: [...sub, subToDelete] };
            }
            return g;
          })
        );
        alert("Eroare la ștergerea membrului asociat.");
      });
    },
    [eventId]
  );

  const handleUpdateSubField = useCallback(
    (parentId: string, subGuestId: string, field: string, value: string | null) => {
      const parentGuest = guestsRef.current.find((g) => g.id === parentId);
      const subGuest = parentGuest?.subGuests?.find((s) => s.id === subGuestId);
      if (!subGuest) return;
      const originalValue = subGuest[field as keyof GuestRow];

      // Optimistic update of sub-guest field
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (g.id === parentId) {
            const sub = g.subGuests ?? [];
            return {
              ...g,
              subGuests: sub.map((s) => (s.id === subGuestId ? { ...s, [field]: value } : s)),
            };
          }
          return g;
        })
      );

      updateGuestField(eventId, subGuestId, field, value).catch((err) => {
        console.error("Update sub-guest field failed, rolling back:", err);
        // Rollback
        setLocalGuests((prev) =>
          prev.map((g) => {
            if (g.id === parentId) {
              const sub = g.subGuests ?? [];
              return {
                ...g,
                subGuests: sub.map((s) => (s.id === subGuestId ? { ...s, [field]: originalValue } : s)),
              };
            }
            return g;
          })
        );
        alert("Eroare la salvarea membrului asociat.");
      });
    },
    [eventId]
  );

  return {
    localGuests,
    setLocalGuests,
    syncingIds,
    handleRsvpChange,
    handleTableChange,
    handleUpdateTags,
    handleUpdateField,
    handleDeleteGuest,
    handleBulkDelete,
    handleBulkRsvp,
    handleBulkAssignTable,
    handleAddSubGuest,
    handleDeleteSubGuest,
    handleUpdateSubField,
  };
}
