import { computeMilestoneDate } from "@/lib/timeline/milestones";
import type { TimelineMilestoneRow, TimelineTaskWithRelations } from "@/types/timeline";

export type MilestoneGroup = {
  milestone: TimelineMilestoneRow | null;
  key: string;
  label: string;
  sortOrder: number;
  computedDate: string | null;
  tasks: TimelineTaskWithRelations[];
};

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

/** Resolve milestone for a task — explicit milestone_id first, else nearest by due_date. */
export function resolveTaskMilestoneId(
  task: TimelineTaskWithRelations,
  milestones: TimelineMilestoneRow[],
  eventDate: string | null
): string | null {
  if (task.milestone_id) return task.milestone_id;
  if (!eventDate || !task.due_date || milestones.length === 0) return null;

  let bestId: string | null = null;
  let bestDiff = Infinity;

  for (const milestone of milestones) {
    const milestoneDate = computeMilestoneDate(eventDate, milestone);
    if (!milestoneDate) continue;
    const diff = Math.abs(daysBetween(task.due_date, milestoneDate));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = milestone.id;
    }
  }

  return bestId;
}

export function groupTasksByMilestone(
  tasks: TimelineTaskWithRelations[],
  milestones: TimelineMilestoneRow[],
  eventDate: string | null,
  unassignedLabel: string
): MilestoneGroup[] {
  const sortedMilestones = [...milestones].sort((a, b) => a.sort_order - b.sort_order);

  const groups: MilestoneGroup[] = sortedMilestones.map((milestone) => ({
    milestone,
    key: milestone.id,
    label: milestone.label,
    sortOrder: milestone.sort_order,
    computedDate: eventDate ? computeMilestoneDate(eventDate, milestone) : null,
    tasks: [],
  }));

  const unassigned: MilestoneGroup = {
    milestone: null,
    key: "unassigned",
    label: unassignedLabel,
    sortOrder: 9999,
    computedDate: null,
    tasks: [],
  };

  for (const task of tasks) {
    const milestoneId = resolveTaskMilestoneId(task, sortedMilestones, eventDate);
    const group = milestoneId
      ? groups.find((g) => g.milestone?.id === milestoneId)
      : null;
    if (group) {
      group.tasks.push(task);
    } else {
      unassigned.tasks.push(task);
    }
  }

  const result = groups;
  if (unassigned.tasks.length > 0) result.push(unassigned);
  return result;
}
