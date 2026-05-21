import { useState, useEffect, useCallback, useRef, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

  // Track pending updates in-flight to prevent race conditions during prop updates
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());

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
    async (
      guestId: string,
      fieldsToUpdate: Partial<GuestWithTable>,
      apiCall: () => Promise<unknown>
    ) => {
      const originalGuests = [...localGuests];

      // 1. Update local state instantly
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

      // 3. Fire backend API call in background
      try {
        const res = (await apiCall()) as { error?: string } | null | undefined;
        if (res && res.error) {
          throw new Error(res.error);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[Mutation Failed] Rolling back:", error.message);
        // Rollback on failure
        setLocalGuests(originalGuests);
        pendingUpdates.current.delete(guestId);
        alert(error.message || "A apărut o eroare la salvarea datelor.");
      }
    },
    [localGuests]
  );

  // RSVP Change
  const handleRsvpChange = useCallback(
    (guestId: string, status: RsvpStatus) => {
      startTransition(() => {
        performMutation(guestId, { rsvp_status: status }, () =>
          updateGuestRsvp(eventId, guestId, status)
        );
      });
    },
    [eventId, performMutation]
  );

  // Table Change
  const handleTableChange = useCallback(
    (guestId: string, tableId: string | null) => {
      const selectedTable = tables.find((t) => t.id === tableId);
      const seatingTables = selectedTable ? { id: selectedTable.id, name: selectedTable.name } : null;

      startTransition(() => {
        performMutation(
          guestId,
          {
            table_id: tableId,
            seating_tables: seatingTables,
          },
          () => assignGuestToTable(eventId, guestId, tableId)
        );
      });
    },
    [eventId, tables, performMutation]
  );

  // Update Tags
  const handleUpdateTags = useCallback(
    (guestId: string, tags: string[]) => {
      startTransition(() => {
        performMutation(guestId, { tags }, () => updateGuestTags(eventId, guestId, tags));
      });
    },
    [eventId, performMutation]
  );

  // Update Specific Field
  const handleUpdateField = useCallback(
    (guestId: string, field: string, value: string | boolean | null) => {
      startTransition(() => {
        performMutation(guestId, { [field]: value }, () =>
          updateGuestField(eventId, guestId, field, value)
        );
      });
    },
    [eventId, performMutation]
  );

  // Delete Guest
  const handleDeleteGuest = useCallback(
    (guestId: string) => {
      if (!confirm("Ștergi acest invitat?")) return;
      const originalGuests = [...localGuests];

      // Optimistic delete
      setLocalGuests((prev) => prev.filter((g) => g.id !== guestId));

      startTransition(async () => {
        try {
          await apiDeleteGuest(eventId, guestId);
        } catch {
          setLocalGuests(originalGuests);
          alert("Eroare la ștergerea invitatului.");
        }
      });
    },
    [eventId, localGuests]
  );

  // Bulk Actions
  const handleBulkDelete = useCallback(
    (selectedIds: Set<string>) => {
      if (!confirm(`Ștergi ${selectedIds.size} invitați selectați?`)) return false;
      const originalGuests = [...localGuests];

      // Optimistic delete
      setLocalGuests((prev) => prev.filter((g) => !selectedIds.has(g.id)));

      startTransition(async () => {
        try {
          const res = await bulkDeleteGuests(eventId, Array.from(selectedIds));
          if (res && "error" in res && res.error) {
            throw new Error(res.error);
          }
        } catch {
          setLocalGuests(originalGuests);
          alert("Eroare la ștergerea în masă.");
        }
      });
      return true;
    },
    [eventId, localGuests]
  );

  const handleBulkRsvp = useCallback(
    (selectedIds: Set<string>, status: RsvpStatus) => {
      const originalGuests = [...localGuests];

      // Optimistic update
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (selectedIds.has(g.id)) {
            return { ...g, rsvp_status: status };
          }
          return g;
        })
      );

      startTransition(async () => {
        try {
          const res = await bulkUpdateRsvp(eventId, Array.from(selectedIds), status);
          if (res && "error" in res && res.error) {
            throw new Error(res.error);
          }
        } catch {
          setLocalGuests(originalGuests);
          alert("Eroare la actualizarea în masă.");
        }
      });
    },
    [eventId, localGuests]
  );

  const handleBulkAssignTable = useCallback(
    (selectedIds: Set<string>, tableId: string | null) => {
      const originalGuests = [...localGuests];
      const selectedTable = tables.find((t) => t.id === tableId);
      const seatingTables = selectedTable ? { id: selectedTable.id, name: selectedTable.name } : null;

      // Optimistic update
      setLocalGuests((prev) =>
        prev.map((g) => {
          if (selectedIds.has(g.id)) {
            return { ...g, table_id: tableId, seating_tables: seatingTables };
          }
          return g;
        })
      );

      startTransition(async () => {
        try {
          const res = await bulkAssignTable(eventId, Array.from(selectedIds), tableId);
          if (res && "error" in res && res.error) {
            throw new Error(res.error);
          }
        } catch {
          setLocalGuests(originalGuests);
          alert("Eroare la repartizarea în masă.");
        }
      });
    },
    [eventId, tables, localGuests]
  );

  // Sub-guest Management
  const handleAddSubGuest = useCallback(
    (parentId: string, type: "couple" | "family" | "child") => {
      const tempId = `temp-sub-${Date.now()}`;
      const originalGuests = [...localGuests];
      const parentGuest = localGuests.find((g) => g.id === parentId);

      const newSubTemp: GuestRow = {
        id: tempId,
        event_id: eventId,
        parent_id: parentId,
        first_name: type === "couple" ? "Partener" : "Membru",
        last_name: parentGuest?.last_name || null,
        rsvp_status: parentGuest?.rsvp_status || "pending",
        relationship_type: type,
        table_id: parentGuest?.table_id || null,
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

      startTransition(async () => {
        try {
          const res = await apiCreateSubGuest(eventId, parentId, type);
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
        } catch (err: unknown) {
          setLocalGuests(originalGuests);
          const error = err instanceof Error ? err : new Error(String(err));
          alert(error.message || "Eroare la adăugarea membrului asociat.");
        }
      });
    },
    [eventId, localGuests]
  );

  const handleDeleteSubGuest = useCallback(
    (parentId: string, subGuestId: string) => {
      if (!confirm("Ștergi acest membru asociat?")) return;
      const originalGuests = [...localGuests];

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

      startTransition(async () => {
        try {
          const res = await apiDeleteSubGuest(eventId, subGuestId);
          if (res.error) throw new Error(res.error);
        } catch (err: unknown) {
          setLocalGuests(originalGuests);
          const error = err instanceof Error ? err : new Error(String(err));
          alert(error.message || "Eroare la ștergerea membrului asociat.");
        }
      });
    },
    [eventId, localGuests]
  );

  const handleUpdateSubField = useCallback(
    (parentId: string, subGuestId: string, field: string, value: string | null) => {
      const originalGuests = [...localGuests];

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

      startTransition(async () => {
        try {
          const res = await updateGuestField(eventId, subGuestId, field, value);
          if (res.error) throw new Error(res.error);
        } catch (err: unknown) {
          setLocalGuests(originalGuests);
          const error = err instanceof Error ? err : new Error(String(err));
          alert(error.message || "Eroare la salvarea membrului asociat.");
        }
      });
    },
    [eventId, localGuests]
  );

  return {
    localGuests,
    setLocalGuests,
    isPending,
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
