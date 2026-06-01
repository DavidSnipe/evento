"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { CalendarExportMenu } from "@/components/calendar/calendar-export-menu";
import { Progress } from "@/components/ui/progress";
import { TimelineTaskCard } from "@/components/timeline/timeline-task-card";
import { milestoneGroupToCalendarEvents, sanitizeFilename } from "@/lib/calendar";
import type { CalendarExportContext } from "@/lib/calendar/types";
import { milestoneProgress } from "@/lib/timeline/stats";
import { formatEventDate } from "@/lib/events/utils";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { MilestoneGroup } from "@/lib/timeline/group-milestones";
import type {
  TimelineCategoryRow,
  TimelineMilestoneRow,
  TimelineTaskPriority,
  TimelineTaskStatus,
  TimelineTaskWithRelations,
} from "@/types/timeline";

type TimelineMilestoneViewProps = {
  groups: MilestoneGroup[];
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

export function TimelineMilestoneView({
  groups,
  calendarContext,
  categories,
  milestones,
  syncingTaskIds,
  onComplete,
  onStatusChange,
  onUpdate,
  onDelete,
}: TimelineMilestoneViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const progress = milestoneProgress(group.tasks);
        const isCollapsed = collapsed[group.key] ?? false;
        const hasTasks = group.tasks.length > 0;

        return (
          <section
            key={group.key}
            className={cn(
              "rounded-2xl border border-[rgba(210,170,185,0.2)] bg-white/60 overflow-hidden",
              !hasTasks && "opacity-60"
            )}
          >
            <div className="flex items-stretch">
            <button
              type="button"
              onClick={() =>
                setCollapsed((prev) => ({
                  ...prev,
                  [group.key]: !prev[group.key],
                }))
              }
              className="flex flex-1 items-center gap-3 px-4 py-4 text-left hover:bg-[#FEF8F9]/50 transition-colors"
            >
              <span className="text-[#B8516B]">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-serif text-lg font-semibold text-[#1A0E14]">
                    {group.label}
                  </h3>
                  {group.computedDate && (
                    <span className="text-xs text-text-subtle">
                      {formatEventDate(group.computedDate)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-text-secondary">
                    {progress.total}{" "}
                    {progress.total === 1
                      ? ro.timeline.milestone.task
                      : ro.timeline.milestone.tasks}
                    {progress.total > 0 && (
                      <>
                        {" · "}
                        {progress.completed} {ro.timeline.milestone.done}
                      </>
                    )}
                  </span>
                  {progress.total > 0 && (
                    <div className="flex min-w-[120px] max-w-[200px] flex-1 items-center gap-2">
                      <Progress value={progress.percent} className="h-1.5" />
                      <span className="text-[10px] font-semibold text-[#B8516B]">
                        {progress.percent}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
            {calendarContext && hasTasks && (
              <div className="flex items-center pr-3 shrink-0">
                <CalendarExportMenu
                  events={milestoneGroupToCalendarEvents(group, calendarContext)}
                  filename={sanitizeFilename(`${calendarContext.eventTitle}-${group.label}`)}
                  calendarName={`${calendarContext.eventTitle} — ${group.label}`}
                  label={ro.calendar.exportMilestone}
                />
              </div>
            )}
            </div>

            {!isCollapsed && hasTasks && (
              <div className="space-y-2 border-t border-[rgba(210,170,185,0.12)] px-4 pb-4 pt-3">
                {group.tasks.map((task) => (
                  <TimelineTaskCard
                    key={task.id}
                    task={task}
                    calendarContext={calendarContext}
                    syncing={syncingTaskIds.has(task.id)}
                    categories={categories}
                    milestones={milestones}
                    onComplete={() => onComplete(task.id)}
                    onStatusChange={(status) => onStatusChange(task.id, status)}
                    onUpdate={(fields) => onUpdate(task.id, fields)}
                    onDelete={() => onDelete(task.id)}
                  />
                ))}
              </div>
            )}

            {!isCollapsed && !hasTasks && (
              <p className="border-t border-[rgba(210,170,185,0.12)] px-4 pb-4 pt-3 text-xs text-text-subtle italic">
                {ro.timeline.milestone.empty}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
