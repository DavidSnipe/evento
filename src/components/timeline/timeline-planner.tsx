"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Columns3,
  LayoutList,
  Loader2,
  Sparkles,
} from "lucide-react";

import { resolveTimezone } from "@/lib/calendar/format";
import type { CalendarExportContext } from "@/lib/calendar/types";

import { CalendarSubscribeButton } from "@/components/calendar/calendar-subscribe-button";
import { TimelineCreateForm } from "@/components/timeline/timeline-create-form";
import { TimelineKanbanView } from "@/components/timeline/timeline-kanban-view";
import { TimelineMilestoneView } from "@/components/timeline/timeline-milestone-view";
import { TimelineOverview } from "@/components/timeline/timeline-overview";
import { TimelineSegmentTabs } from "@/components/timeline/timeline-segment-tabs";
import { Button } from "@/components/ui/button";
import { useTimelineOptimistic } from "@/hooks/timeline/use-timeline-optimistic";
import { groupTasksByMilestone } from "@/lib/timeline/group-milestones";
import { computeTimelineStats } from "@/lib/timeline/stats";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type {
  TimelineCategoryRow,
  TimelineEventSegment,
  TimelineMilestoneRow,
  TimelineTaskPriority,
  TimelineTaskStatus,
  TimelineTaskWithRelations,
} from "@/types/timeline";

type ViewMode = "timeline" | "kanban";

type TimelinePlannerProps = {
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  eventVenue?: string | null;
  subscriptionUrls?: { httpsUrl: string; webcalUrl: string } | null;
  categories: TimelineCategoryRow[];
  milestoneTemplates: TimelineMilestoneRow[];
  eventMilestones: TimelineMilestoneRow[];
  initialTasks: TimelineTaskWithRelations[];
};

export function TimelinePlanner({
  eventId,
  eventTitle,
  eventDate,
  eventVenue,
  subscriptionUrls,
  categories,
  milestoneTemplates,
  eventMilestones,
  initialTasks,
}: TimelinePlannerProps) {
  const milestones =
    eventMilestones.length > 0 ? eventMilestones : milestoneTemplates;

  const {
    tasks,
    syncingTaskIds,
    isGeneratingChecklist,
    createTaskOptimistic,
    updateTaskOptimistic,
    updateStatusOptimistic,
    deleteTaskOptimistic,
    generateChecklistOptimistic,
  } = useTimelineOptimistic(eventId, initialTasks, categories, milestones);

  const [view, setView] = useState<ViewMode>("timeline");
  const [segment, setSegment] = useState<TimelineEventSegment | "all">("all");
  const [generateError, setGenerateError] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    if (segment === "all") return tasks;
    return tasks.filter((t) => t.event_segment === segment);
  }, [tasks, segment]);

  const stats = useMemo(
    () => computeTimelineStats(filteredTasks),
    [filteredTasks]
  );

  const segmentCounts = useMemo(() => {
    const counts: Record<TimelineEventSegment | "all", number> = {
      all: tasks.length,
      general: 0,
      civil: 0,
      religious: 0,
      party: 0,
    };
    for (const t of tasks) counts[t.event_segment]++;
    return counts;
  }, [tasks]);

  const milestoneGroups = useMemo(
    () =>
      groupTasksByMilestone(
        filteredTasks,
        milestones,
        eventDate,
        ro.timeline.milestone.unassigned
      ),
    [filteredTasks, milestones, eventDate]
  );

  const handleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next =
      task.status === "completed" ? "not_started" : ("completed" as const);
    updateStatusOptimistic(taskId, next);
  };

  const handleUpdate = (
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
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTaskOptimistic(taskId, {
      title: fields.title ?? task.title,
      categoryId: fields.categoryId !== undefined ? fields.categoryId : task.category_id,
      milestoneId:
        fields.milestoneId !== undefined ? fields.milestoneId : task.milestone_id,
      dueDate: fields.dueDate !== undefined ? fields.dueDate : task.due_date,
      priority: fields.priority ?? task.priority,
      assignee: fields.assignee,
      notes: fields.notes,
      eventSegment: task.event_segment,
    });
  };

  const handleGenerateChecklist = async () => {
    setGenerateError(null);
    const result = await generateChecklistOptimistic();
    if (result.error) setGenerateError(result.error);
  };

  const defaultSegment = segment === "all" ? "general" : segment;
  const isEmpty = tasks.length === 0;

  const calendarContext = useMemo<CalendarExportContext>(
    () => ({
      eventTitle,
      eventVenue,
      timezone: resolveTimezone(),
    }),
    [eventTitle, eventVenue]
  );

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#FCEAEF]/80 bg-gradient-to-br from-[#FEF8F9] to-white px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF0F3] border border-[#FCEAEF]">
            <CalendarDays className="h-7 w-7 text-[#B8516B]" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#1A0E14]">
            {ro.timeline.empty.title}
          </h2>
          <p className="mt-2 max-w-md text-sm text-text-secondary leading-relaxed">
            {ro.timeline.empty.desc}
          </p>
          <Button
            type="button"
            className="mt-6"
            onClick={handleGenerateChecklist}
            disabled={isGeneratingChecklist || !eventDate}
          >
            {isGeneratingChecklist ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {ro.timeline.checklist.generate}
          </Button>
          {!eventDate && (
            <p className="mt-3 text-xs text-amber-700">
              {ro.timeline.checklist.needsDate}
            </p>
          )}
          {generateError && (
            <p className="mt-3 text-xs text-red-600">{generateError}</p>
          )}
        </div>
      ) : (
        <>
          <TimelineOverview stats={stats} />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TimelineSegmentTabs
              value={segment}
              onChange={setSegment}
              counts={segmentCounts}
            />
            <div className="flex flex-wrap items-center gap-2">
              {subscriptionUrls && (
                <CalendarSubscribeButton
                  httpsUrl={subscriptionUrls.httpsUrl}
                  webcalUrl={subscriptionUrls.webcalUrl}
                />
              )}
              <div className="inline-flex rounded-xl border border-[rgba(210,170,185,0.25)] bg-white/80 p-1">
                <button
                  type="button"
                  onClick={() => setView("timeline")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    view === "timeline"
                      ? "bg-[#FEF0F3] text-[#B8516B]"
                      : "text-text-secondary hover:text-[#B8516B]"
                  )}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  {ro.timeline.views.timeline}
                </button>
                <button
                  type="button"
                  onClick={() => setView("kanban")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    view === "kanban"
                      ? "bg-[#FEF0F3] text-[#B8516B]"
                      : "text-text-secondary hover:text-[#B8516B]"
                  )}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  {ro.timeline.views.kanban}
                </button>
              </div>
              {tasks.length < 12 && eventDate && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateChecklist}
                  disabled={isGeneratingChecklist}
                >
                  {isGeneratingChecklist ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {ro.timeline.checklist.generateShort}
                </Button>
              )}
            </div>
          </div>

          <TimelineCreateForm
            categories={categories}
            milestones={milestones}
            defaultSegment={defaultSegment}
            onCreate={async (input) =>
              createTaskOptimistic({
                title: input.title,
                categoryId: input.categoryId,
                milestoneId: input.milestoneId,
                dueDate: input.dueDate,
                priority: input.priority,
                assignee: input.assignee,
                notes: input.notes,
                eventSegment: input.eventSegment,
              })
            }
          />

          {view === "timeline" ? (
            <TimelineMilestoneView
              groups={milestoneGroups}
              calendarContext={calendarContext}
              categories={categories}
              milestones={milestones}
              syncingTaskIds={syncingTaskIds}
              onComplete={handleComplete}
              onStatusChange={(id, status) =>
                updateStatusOptimistic(id, status)
              }
              onUpdate={handleUpdate}
              onDelete={(id) => deleteTaskOptimistic(id)}
            />
          ) : (
            <TimelineKanbanView
              tasks={filteredTasks}
              calendarContext={calendarContext}
              categories={categories}
              milestones={milestones}
              syncingTaskIds={syncingTaskIds}
              onComplete={handleComplete}
              onStatusChange={(id, status) =>
                updateStatusOptimistic(id, status)
              }
              onUpdate={handleUpdate}
              onDelete={(id) => deleteTaskOptimistic(id)}
            />
          )}
        </>
      )}
    </div>
  );
}
