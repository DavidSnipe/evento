import { useCallback, useEffect, useRef, useState } from "react";

import {
  createTimelineTask,
  deleteTimelineTask,
  generateWeddingChecklist,
  updateTimelineTask,
  updateTimelineTaskStatus,
} from "@/app/(dashboard)/dashboard/events/[id]/timeline/actions";
import { encodeAssigneeInNotes, parseAssigneeFromNotes, stripAssigneeFromNotes } from "@/lib/timeline/assignee";
import type {
  TimelineCategoryRow,
  TimelineMilestoneRow,
  TimelineTaskInput,
  TimelineTaskStatus,
  TimelineTaskWithRelations,
} from "@/types/timeline";

type PendingTaskUpdate = {
  fields: Partial<TimelineTaskWithRelations>;
};

/**
 * Optimistic task state for future timeline UI.
 * Matches guest/seating patterns: local-first, reconcile on server ack, no router.refresh().
 */
export function useTimelineOptimistic(
  eventId: string,
  initialTasks: TimelineTaskWithRelations[],
  categories: TimelineCategoryRow[] = [],
  milestones: TimelineMilestoneRow[] = []
) {
  const [localTasks, setLocalTasks] = useState(initialTasks);
  const [syncingIds, setSyncingIds] = useState<Record<string, number>>({});

  const pendingUpdates = useRef<Map<string, PendingTaskUpdate>>(new Map());
  const tasksRef = useRef(localTasks);

  useEffect(() => {
    tasksRef.current = localTasks;
  }, [localTasks]);

  useEffect(() => {
    setLocalTasks(() =>
      initialTasks.map((serverTask) => {
        const pending = pendingUpdates.current.get(serverTask.id);
        if (!pending) return serverTask;

        const caughtUp = Object.keys(pending.fields).every(
          (key) =>
            serverTask[key as keyof TimelineTaskWithRelations] ===
            pending.fields[key as keyof TimelineTaskWithRelations]
        );

        if (caughtUp) {
          pendingUpdates.current.delete(serverTask.id);
          return serverTask;
        }

        return { ...serverTask, ...pending.fields };
      })
    );
  }, [initialTasks]);

  const bumpSync = useCallback((taskId: string, delta: number) => {
    setSyncingIds((prev) => {
      const next = (prev[taskId] ?? 0) + delta;
      if (next <= 0) {
        const { [taskId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [taskId]: next };
    });
  }, []);

  const performMutation = useCallback(
    async (
      taskId: string,
      fields: Partial<TimelineTaskWithRelations>,
      apiCall: () => Promise<{ error?: string; success?: boolean; id?: string }>
    ) => {
      const before = tasksRef.current.find((t) => t.id === taskId);
      pendingUpdates.current.set(taskId, {
        fields: { ...(pendingUpdates.current.get(taskId)?.fields ?? {}), ...fields },
      });

      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...fields } : t))
      );
      bumpSync(taskId, 1);

      try {
        const result = await apiCall();
        if (result.error) {
          if (before) {
            pendingUpdates.current.set(taskId, { fields: before });
            setLocalTasks((prev) =>
              prev.map((t) => (t.id === taskId ? before : t))
            );
          } else {
            pendingUpdates.current.delete(taskId);
            setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
          }
          return result;
        }
        pendingUpdates.current.delete(taskId);
        return result;
      } finally {
        bumpSync(taskId, -1);
      }
    },
    [bumpSync]
  );

  const createTaskOptimistic = useCallback(
    async (
      input: TimelineTaskInput & { assignee?: string | null }
    ) => {
      const tempId = `temp-${Date.now()}`;
      const category =
        categories.find((c) => c.id === input.categoryId) ?? null;
      const milestone =
        milestones.find((m) => m.id === input.milestoneId) ?? null;
      const notes = encodeAssigneeInNotes(input.assignee, input.notes);

      const optimistic: TimelineTaskWithRelations = {
        id: tempId,
        event_id: eventId,
        category_id: input.categoryId ?? null,
        milestone_id: input.milestoneId ?? null,
        title: input.title.trim(),
        description: input.description ?? null,
        status: input.status ?? "not_started",
        priority: input.priority ?? "medium",
        event_segment: input.eventSegment ?? "general",
        due_date: input.dueDate ?? null,
        completed_at: null,
        notes,
        sort_order: input.sortOrder ?? 0,
        vendor_id: input.vendorId ?? null,
        budget_item_id: input.budgetItemId ?? null,
        invitation_household_id: input.invitationHouseholdId ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category,
        milestone,
      };

      setLocalTasks((prev) => [...prev, optimistic]);
      bumpSync(tempId, 1);

      const result = await createTimelineTask(eventId, { ...input, notes: notes ?? undefined });
      bumpSync(tempId, -1);

      if (result.error) {
        setLocalTasks((prev) => prev.filter((t) => t.id !== tempId));
        return result;
      }

      if (result.id) {
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: result.id! } : t))
        );
      }

      return result;
    },
    [eventId, bumpSync, categories, milestones]
  );

  const updateTaskOptimistic = useCallback(
    (taskId: string, input: TimelineTaskInput & { assignee?: string | null }) => {
      const existing = tasksRef.current.find((t) => t.id === taskId);
      const notes =
        input.assignee !== undefined || input.notes !== undefined
          ? encodeAssigneeInNotes(
              input.assignee ?? parseAssigneeFromNotes(existing?.notes),
              input.notes !== undefined
                ? input.notes
                : stripAssigneeFromNotes(existing?.notes)
            )
          : undefined;
      const category =
        input.categoryId !== undefined
          ? categories.find((c) => c.id === input.categoryId) ?? null
          : undefined;
      const milestone =
        input.milestoneId !== undefined
          ? milestones.find((m) => m.id === input.milestoneId) ?? null
          : undefined;

      const fields: Partial<TimelineTaskWithRelations> = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
        ...(input.milestoneId !== undefined ? { milestone_id: input.milestoneId } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueDate !== undefined ? { due_date: input.dueDate } : {}),
        ...(input.eventSegment !== undefined
          ? { event_segment: input.eventSegment }
          : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(milestone !== undefined ? { milestone } : {}),
      };

      return performMutation(taskId, fields, () =>
        updateTimelineTask(eventId, taskId, {
          ...input,
          notes: notes ?? input.notes,
        })
      );
    },
    [eventId, performMutation, categories, milestones]
  );

  const updateStatusOptimistic = useCallback(
    (taskId: string, status: TimelineTaskStatus) => {
      const completed_at =
        status === "completed" ? new Date().toISOString() : null;
      return performMutation(taskId, { status, completed_at }, () =>
        updateTimelineTaskStatus(eventId, taskId, status)
      );
    },
    [eventId, performMutation]
  );

  const deleteTaskOptimistic = useCallback(
    async (taskId: string) => {
      const before = tasksRef.current.find((t) => t.id === taskId);
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
      bumpSync(taskId, 1);

      const result = await deleteTimelineTask(eventId, taskId);
      bumpSync(taskId, -1);

      if (result.error && before) {
        setLocalTasks((prev) => [...prev, before]);
      }
      return result;
    },
    [eventId, bumpSync]
  );

  const generateChecklistOptimistic = useCallback(async () => {
    bumpSync("checklist", 1);
    const result = await generateWeddingChecklist(eventId);
    bumpSync("checklist", -1);

    if (result.error) return result;

    if (result.tasks?.length) {
      setLocalTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const merged = [...prev];
        for (const task of result.tasks!) {
          if (!existingIds.has(task.id)) merged.push(task);
        }
        return merged;
      });
    }

    return result;
  }, [eventId, bumpSync]);

  const syncingTaskIds = new Set(
    Object.entries(syncingIds)
      .filter(([id, count]) => count > 0 && id !== "checklist")
      .map(([id]) => id)
  );

  const isGeneratingChecklist = (syncingIds.checklist ?? 0) > 0;

  return {
    tasks: localTasks,
    syncingTaskIds,
    isGeneratingChecklist,
    createTaskOptimistic,
    updateTaskOptimistic,
    updateStatusOptimistic,
    deleteTaskOptimistic,
    generateChecklistOptimistic,
  };
}
