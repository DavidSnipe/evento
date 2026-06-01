import { useCallback, useEffect, useRef, useState } from "react";

import {
  createDayScheduleItem,
  deleteDayScheduleItem,
  generateDaySchedule,
  reorderDayScheduleItems,
  updateDayScheduleItem,
} from "@/app/(dashboard)/dashboard/events/[id]/timeline/day/actions";
import type {
  DayScheduleItemInput,
  DayScheduleItemRow,
} from "@/types/day-schedule";

type PendingUpdate = {
  fields: Partial<DayScheduleItemRow>;
};

export function useDayScheduleOptimistic(
  eventId: string,
  initialItems: DayScheduleItemRow[]
) {
  const [localItems, setLocalItems] = useState(initialItems);
  const [syncingIds, setSyncingIds] = useState<Record<string, number>>({});

  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  const itemsRef = useRef(localItems);

  useEffect(() => {
    itemsRef.current = localItems;
  }, [localItems]);

  useEffect(() => {
    setLocalItems(() =>
      initialItems.map((serverItem) => {
        const pending = pendingUpdates.current.get(serverItem.id);
        if (!pending) return serverItem;

        const caughtUp = Object.keys(pending.fields).every(
          (key) =>
            serverItem[key as keyof DayScheduleItemRow] ===
            pending.fields[key as keyof DayScheduleItemRow]
        );

        if (caughtUp) {
          pendingUpdates.current.delete(serverItem.id);
          return serverItem;
        }

        return { ...serverItem, ...pending.fields };
      })
    );
  }, [initialItems]);

  const bumpSync = useCallback((id: string, delta: number) => {
    setSyncingIds((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const performMutation = useCallback(
    async (
      itemId: string,
      fields: Partial<DayScheduleItemRow>,
      apiCall: () => Promise<{ error?: string; success?: boolean }>
    ) => {
      const before = itemsRef.current.find((i) => i.id === itemId);
      pendingUpdates.current.set(itemId, {
        fields: {
          ...(pendingUpdates.current.get(itemId)?.fields ?? {}),
          ...fields,
        },
      });

      setLocalItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, ...fields } : i))
      );
      bumpSync(itemId, 1);

      try {
        const result = await apiCall();
        if (result.error) {
          if (before) {
            pendingUpdates.current.set(itemId, { fields: before });
            setLocalItems((prev) =>
              prev.map((i) => (i.id === itemId ? before : i))
            );
          }
          return result;
        }
        pendingUpdates.current.delete(itemId);
        return result;
      } finally {
        bumpSync(itemId, -1);
      }
    },
    [bumpSync]
  );

  const inputFromRow = (item: DayScheduleItemRow): DayScheduleItemInput => ({
    title: item.title,
    scheduleDate: item.schedule_date,
    startTime: item.start_time.slice(0, 5),
    endTime: item.end_time?.slice(0, 5) ?? null,
    location: item.location,
    notes: item.notes,
    responsiblePerson: item.responsible_person,
    eventSegment: item.event_segment,
    sortOrder: item.sort_order,
    vendorId: item.vendor_id,
    vendorRole: item.vendor_role,
  });

  const createItemOptimistic = useCallback(
    async (input: DayScheduleItemInput) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: DayScheduleItemRow = {
        id: tempId,
        event_id: eventId,
        schedule_date: input.scheduleDate,
        title: input.title.trim(),
        start_time: input.startTime,
        end_time: input.endTime ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        responsible_person: input.responsiblePerson ?? null,
        event_segment: input.eventSegment ?? "party",
        sort_order: input.sortOrder ?? 999,
        vendor_id: input.vendorId ?? null,
        vendor_role: input.vendorRole ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setLocalItems((prev) => [...prev, optimistic]);
      bumpSync(tempId, 1);

      const result = await createDayScheduleItem(eventId, input);
      bumpSync(tempId, -1);

      if (result.error) {
        setLocalItems((prev) => prev.filter((i) => i.id !== tempId));
        return result;
      }

      if (result.id) {
        setLocalItems((prev) =>
          prev.map((i) => (i.id === tempId ? { ...i, id: result.id! } : i))
        );
      }

      return result;
    },
    [eventId, bumpSync]
  );

  const updateItemOptimistic = useCallback(
    (itemId: string, input: DayScheduleItemInput) => {
      const fields: Partial<DayScheduleItemRow> = {
        title: input.title.trim(),
        schedule_date: input.scheduleDate,
        start_time: input.startTime,
        end_time: input.endTime ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        responsible_person: input.responsiblePerson ?? null,
        event_segment: input.eventSegment ?? "party",
        sort_order: input.sortOrder,
        vendor_id: input.vendorId ?? null,
        vendor_role: input.vendorRole ?? null,
      };

      return performMutation(itemId, fields, () =>
        updateDayScheduleItem(eventId, itemId, input)
      );
    },
    [eventId, performMutation]
  );

  const deleteItemOptimistic = useCallback(
    async (itemId: string) => {
      const before = itemsRef.current.find((i) => i.id === itemId);
      setLocalItems((prev) => prev.filter((i) => i.id !== itemId));
      bumpSync(itemId, 1);

      const result = await deleteDayScheduleItem(eventId, itemId);
      bumpSync(itemId, -1);

      if (result.error && before) {
        setLocalItems((prev) => [...prev, before]);
      }
      return result;
    },
    [eventId, bumpSync]
  );

  const reorderOptimistic = useCallback(
    async (orderedIds: string[]) => {
      const before = itemsRef.current;
      const orderMap = new Map(orderedIds.map((id, i) => [id, i * 10]));

      setLocalItems((prev) =>
        prev.map((item) => {
          const newOrder = orderMap.get(item.id);
          if (newOrder === undefined) return item;
          return { ...item, sort_order: newOrder };
        })
      );
      bumpSync("reorder", 1);

      const result = await reorderDayScheduleItems(eventId, orderedIds);
      bumpSync("reorder", -1);

      if (result.error) {
        setLocalItems(before);
      }

      return result;
    },
    [eventId, bumpSync]
  );

  const generateScheduleOptimistic = useCallback(
    async (scheduleDate: string) => {
      bumpSync("generate", 1);
      const result = await generateDaySchedule(eventId, scheduleDate);
      bumpSync("generate", -1);

      if (result.error) return result;

      if (result.items?.length) {
        setLocalItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const merged = [...prev];
          for (const item of result.items!) {
            if (!existingIds.has(item.id)) merged.push(item);
          }
          return merged;
        });
      }

      return result;
    },
    [eventId, bumpSync]
  );

  const syncingItemIds = new Set(
    Object.entries(syncingIds)
      .filter(([id, count]) => count > 0 && id !== "reorder" && id !== "generate")
      .map(([id]) => id)
  );

  return {
    items: localItems,
    syncingItemIds,
    isReordering: (syncingIds.reorder ?? 0) > 0,
    isGenerating: (syncingIds.generate ?? 0) > 0,
    createItemOptimistic,
    updateItemOptimistic,
    deleteItemOptimistic,
    reorderOptimistic,
    generateScheduleOptimistic,
    inputFromRow,
  };
}
