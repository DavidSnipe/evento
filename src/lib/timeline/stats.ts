import type { TimelineTaskStatus, TimelineTaskWithRelations } from "@/types/timeline";

export type TimelineStats = {
  total: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  overdue: number;
  progressPercent: number;
};

function isActiveTask(status: TimelineTaskStatus): boolean {
  return status !== "cancelled";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeTimelineStats(tasks: TimelineTaskWithRelations[]): TimelineStats {
  const today = todayIso();
  const active = tasks.filter((t) => isActiveTask(t.status));

  const completed = active.filter((t) => t.status === "completed").length;
  const inProgress = active.filter((t) => t.status === "in_progress").length;
  const upcoming = active.filter(
    (t) =>
      t.status !== "completed" &&
      (!t.due_date || t.due_date >= today)
  ).length;
  const overdue = active.filter(
    (t) =>
      t.status !== "completed" &&
      t.due_date != null &&
      t.due_date < today
  ).length;

  const progressPercent =
    active.length > 0 ? Math.round((completed / active.length) * 100) : 0;

  return {
    total: active.length,
    completed,
    inProgress,
    upcoming,
    overdue,
    progressPercent,
  };
}

export function milestoneProgress(tasks: TimelineTaskWithRelations[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const active = tasks.filter((t) => isActiveTask(t.status));
  const completed = active.filter((t) => t.status === "completed").length;
  const total = active.length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
