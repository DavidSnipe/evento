"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
} from "lucide-react";

import { CalendarExportActions } from "@/components/calendar/calendar-export-actions";
import { Button } from "@/components/ui/button";
import { timelineTaskToCalendarEvent } from "@/lib/calendar";
import type { CalendarExportContext } from "@/lib/calendar/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseAssigneeFromNotes, stripAssigneeFromNotes } from "@/lib/timeline/assignee";
import { ro } from "@/lib/i18n/ro";
import type {
  TimelineCategoryRow,
  TimelineMilestoneRow,
  TimelineTaskPriority,
  TimelineTaskStatus,
  TimelineTaskWithRelations,
} from "@/types/timeline";
import { TIMELINE_TASK_STATUSES } from "@/types/timeline";

const STATUS_STYLES: Record<TimelineTaskStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-50 text-amber-700",
  waiting: "bg-violet-50 text-violet-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-50 text-slate-400 line-through",
};

const PRIORITY_STYLES: Record<TimelineTaskPriority, string> = {
  low: "text-slate-500",
  medium: "text-[#B8516B]",
  high: "text-orange-600",
  critical: "text-red-600 font-semibold",
};

type TimelineTaskCardProps = {
  task: TimelineTaskWithRelations;
  calendarContext?: CalendarExportContext;
  syncing?: boolean;
  categories: TimelineCategoryRow[];
  milestones: TimelineMilestoneRow[];
  onComplete: () => void;
  onStatusChange: (status: TimelineTaskStatus) => void;
  onUpdate: (fields: {
    title?: string;
    categoryId?: string | null;
    milestoneId?: string | null;
    dueDate?: string | null;
    priority?: TimelineTaskPriority;
    assignee?: string | null;
    notes?: string | null;
  }) => void;
  onDelete: () => void;
};

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
  });
}

function isOverdue(task: TimelineTaskWithRelations): boolean {
  if (!task.due_date || task.status === "completed" || task.status === "cancelled") {
    return false;
  }
  return task.due_date < new Date().toISOString().slice(0, 10);
}

export function TimelineTaskCard({
  task,
  calendarContext,
  syncing,
  categories,
  milestones,
  onComplete,
  onStatusChange,
  onUpdate,
  onDelete,
}: TimelineTaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const assignee = parseAssigneeFromNotes(task.notes);
  const notes = stripAssigneeFromNotes(task.notes);
  const overdue = isOverdue(task);
  const isCompleted = task.status === "completed";
  const calendarEvent = calendarContext
    ? timelineTaskToCalendarEvent(task, calendarContext)
    : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div
      className={cn(
        "group rounded-xl border bg-white/90 transition-all",
        syncing && "opacity-70",
        isCompleted
          ? "border-emerald-100/80 bg-emerald-50/20"
          : overdue
            ? "border-red-200/70 bg-red-50/20"
            : "border-[rgba(210,170,185,0.18)] hover:border-[#B8516B]/25 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        <button
          type="button"
          onClick={onComplete}
          disabled={syncing || task.status === "cancelled"}
          className={cn(
            "mt-0.5 shrink-0 rounded-full transition-colors",
            isCompleted
              ? "text-emerald-600"
              : "text-[rgba(210,170,185,0.8)] hover:text-[#B8516B]"
          )}
          aria-label={ro.timeline.actions.complete}
        >
          {syncing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isCompleted ? (
            <Check className="h-5 w-5 rounded-full bg-emerald-100 p-0.5" strokeWidth={2.5} />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-current" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-left"
            >
              <p
                className={cn(
                  "font-medium text-[#1A0E14] leading-snug",
                  isCompleted && "text-text-secondary line-through"
                )}
              >
                {task.title}
              </p>
            </button>

            <div className="flex items-center gap-1.5">
              <div className="relative" ref={statusRef}>
                <button
                  type="button"
                  onClick={() => setStatusOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    STATUS_STYLES[task.status]
                  )}
                >
                  {ro.timeline.status[task.status]}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {statusOpen && (
                  <div className="absolute right-0 z-20 mt-1 min-w-[140px] rounded-xl border border-[rgba(210,170,185,0.25)] bg-white py-1 shadow-lg">
                    {TIMELINE_TASK_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          onStatusChange(status);
                          setStatusOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center px-3 py-2 text-left text-xs hover:bg-[#FEF0F3]/60",
                          task.status === status && "font-semibold text-[#B8516B]"
                        )}
                      >
                        {ro.timeline.status[status]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="rounded-lg p-1.5 text-text-subtle opacity-0 transition-opacity hover:bg-[#FEF0F3] hover:text-[#B8516B] group-hover:opacity-100"
                  aria-label={ro.timeline.actions.more}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-1 min-w-[120px] rounded-xl border border-[rgba(210,170,185,0.25)] bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-[#FEF0F3]/60"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {ro.timeline.actions.edit}
                    </button>
                    {calendarEvent && (
                      <div onClick={() => setMenuOpen(false)}>
                        <CalendarExportActions
                          variant="menu"
                          events={calendarEvent}
                          filename={task.title}
                          calendarName={task.title}
                        />
                      </div>
                    )}
                    {!calendarEvent && calendarContext && !task.due_date && (
                      <p className="px-3 py-2 text-[10px] text-text-subtle">
                        {ro.calendar.noDueDate}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onDelete();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {ro.timeline.actions.delete}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {task.category && (
              <span className="rounded-md bg-[#FEF0F3] px-2 py-0.5 font-medium text-[#B8516B]">
                {task.category.name}
              </span>
            )}
            <span className={cn("font-medium", PRIORITY_STYLES[task.priority])}>
              {ro.timeline.priority[task.priority]}
            </span>
            {task.due_date && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue ? "font-semibold text-red-600" : "text-text-subtle"
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDueDate(task.due_date)}
              </span>
            )}
            {assignee && (
              <span className="inline-flex items-center gap-1 text-text-subtle">
                <User className="h-3 w-3" />
                {assignee}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[rgba(210,170,185,0.15)] px-3.5 py-3 space-y-3 bg-[#FEF8F9]/40">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.timeline.form.title}
              </span>
              <Input
                defaultValue={task.title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== task.title) onUpdate({ title: v });
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.timeline.form.assignee}
              </span>
              <Input
                defaultValue={assignee ?? ""}
                placeholder={ro.timeline.form.assigneePlaceholder}
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== assignee) onUpdate({ assignee: v, notes });
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.timeline.form.category}
              </span>
              <select
                defaultValue={task.category_id ?? ""}
                onChange={(e) =>
                  onUpdate({ categoryId: e.target.value || null })
                }
                className="flex h-10 w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 text-[12.5px]"
              >
                <option value="">{ro.timeline.form.noCategory}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.timeline.form.milestone}
              </span>
              <select
                defaultValue={task.milestone_id ?? ""}
                onChange={(e) =>
                  onUpdate({ milestoneId: e.target.value || null })
                }
                className="flex h-10 w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 text-[12.5px]"
              >
                <option value="">{ro.timeline.form.noMilestone}</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.timeline.form.dueDate}
              </span>
              <Input
                type="date"
                defaultValue={task.due_date ?? ""}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== task.due_date) onUpdate({ dueDate: v });
                }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-text-subtle">
                {ro.timeline.form.priority}
              </span>
              <select
                defaultValue={task.priority}
                onChange={(e) =>
                  onUpdate({
                    priority: e.target.value as TimelineTaskPriority,
                  })
                }
                className="flex h-10 w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 text-[12.5px]"
              >
                {(["low", "medium", "high", "critical"] as const).map((p) => (
                  <option key={p} value={p}>
                    {ro.timeline.priority[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase text-text-subtle">
              {ro.timeline.form.notes}
            </span>
            <textarea
              defaultValue={notes ?? ""}
              rows={2}
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== notes) onUpdate({ notes: v, assignee });
              }}
              className="w-full rounded-[10px] border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 py-2 text-[12.5px] resize-none"
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
          >
            {ro.timeline.actions.collapse}
          </Button>
        </div>
      )}
    </div>
  );
}
