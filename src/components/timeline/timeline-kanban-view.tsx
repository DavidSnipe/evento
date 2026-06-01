"use client";

import { useCallback, useRef, useState } from "react";

import { TimelineTaskCard } from "@/components/timeline/timeline-task-card";
import { cn } from "@/lib/utils";
import type { CalendarExportContext } from "@/lib/calendar/types";
import { ro } from "@/lib/i18n/ro";
import type {
  TimelineCategoryRow,
  TimelineMilestoneRow,
  TimelineTaskPriority,
  TimelineTaskStatus,
  TimelineTaskWithRelations,
} from "@/types/timeline";
import { TIMELINE_TASK_STATUSES } from "@/types/timeline";

type TimelineKanbanViewProps = {
  tasks: TimelineTaskWithRelations[];
  calendarContext?: CalendarExportContext;
  categories: TimelineCategoryRow[];
  milestones: TimelineMilestoneRow[];
  syncingTaskIds: Set<string>;
  onComplete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TimelineTaskStatus) => void;
  onUpdate: (
    taskId: string,
    fields: {
      title?: string;
      categoryId?: string | null;
      milestoneId?: string | null;
      dueDate?: string | null;
      priority?: TimelineTaskPriority;
      assignee?: string | null;
      notes?: string | null;
    }
  ) => void;
  onDelete: (taskId: string) => void;
};

const COLUMN_STYLES: Record<TimelineTaskStatus, string> = {
  not_started: "from-slate-50 to-white border-slate-200/60",
  in_progress: "from-amber-50/80 to-white border-amber-200/50",
  waiting: "from-violet-50/80 to-white border-violet-200/50",
  completed: "from-emerald-50/80 to-white border-emerald-200/50",
  cancelled: "from-slate-50/50 to-white border-slate-200/40",
};

export function TimelineKanbanView({
  tasks,
  calendarContext,
  categories,
  milestones,
  syncingTaskIds,
  onComplete,
  onStatusChange,
  onUpdate,
  onDelete,
}: TimelineKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TimelineTaskStatus | null>(null);
  const touchDragRef = useRef<{ taskId: string; status: TimelineTaskStatus } | null>(
    null
  );

  const columns = TIMELINE_TASK_STATUSES.map((status) => ({
    status,
    label: ro.timeline.status[status],
    tasks: tasks.filter((t) => t.status === status),
  }));

  const handleDrop = useCallback(
    (status: TimelineTaskStatus, taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === status) return;
      onStatusChange(taskId, status);
    },
    [tasks, onStatusChange]
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
      {columns.map(({ status, label, tasks: columnTasks }) => (
        <div
          key={status}
          className={cn(
            "flex w-[min(100%,280px)] shrink-0 snap-start flex-col rounded-2xl border bg-gradient-to-b min-h-[320px]",
            COLUMN_STYLES[status],
            dropTarget === status && "ring-2 ring-[#B8516B]/40"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget(status);
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            const taskId =
              e.dataTransfer.getData("taskId") ||
              e.dataTransfer.getData("text/plain");
            setDropTarget(null);
            setDraggingId(null);
            if (taskId) handleDrop(status, taskId);
          }}
        >
          <div className="sticky top-0 z-10 border-b border-inherit bg-inherit/90 px-3 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#1A0E14]">
                {label}
              </h3>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                {columnTasks.length}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 p-2">
            {columnTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("taskId", task.id);
                  e.dataTransfer.setData("text/plain", task.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingId(task.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                onTouchStart={() => {
                  touchDragRef.current = { taskId: task.id, status: task.status };
                }}
                onTouchEnd={() => {
                  touchDragRef.current = null;
                }}
                className={cn(
                  "cursor-grab active:cursor-grabbing",
                  draggingId === task.id && "opacity-50"
                )}
              >
                <TimelineTaskCard
                  task={task}
                  calendarContext={calendarContext}
                  syncing={syncingTaskIds.has(task.id)}
                  categories={categories}
                  milestones={milestones}
                  onComplete={() => onComplete(task.id)}
                  onStatusChange={(s) => onStatusChange(task.id, s)}
                  onUpdate={(fields) => onUpdate(task.id, fields)}
                  onDelete={() => onDelete(task.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
