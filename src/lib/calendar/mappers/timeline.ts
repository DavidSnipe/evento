import { buildCalendarUid } from "@/lib/calendar/uid";
import { parseAssigneeFromNotes, stripAssigneeFromNotes } from "@/lib/timeline/assignee";
import { ro } from "@/lib/i18n/ro";
import type { CalendarEvent, CalendarExportContext } from "@/lib/calendar/types";
import type { MilestoneGroup } from "@/lib/timeline/group-milestones";
import type { TimelineTaskWithRelations } from "@/types/timeline";

function buildTaskDescription(
  task: TimelineTaskWithRelations,
  ctx: CalendarExportContext
): string | undefined {
  const parts: string[] = [];
  const notes = stripAssigneeFromNotes(task.notes);
  const assignee = parseAssigneeFromNotes(task.notes);

  if (task.description) parts.push(task.description);
  if (notes) parts.push(notes);
  if (assignee) parts.push(`${ro.timeline.form.assignee}: ${assignee}`);
  if (task.category?.name) parts.push(`${ro.timeline.form.category}: ${task.category.name}`);
  if (task.milestone?.label) parts.push(`${ro.timeline.form.milestone}: ${task.milestone.label}`);
  if (task.event_segment !== "general") {
    parts.push(`${ro.timeline.segment[task.event_segment]}`);
  }
  parts.push(`${ro.timeline.form.priority}: ${ro.timeline.priority[task.priority]}`);
  parts.push(ctx.eventTitle);

  const text = parts.filter(Boolean).join("\n");
  return text || undefined;
}

function isExportableTask(task: TimelineTaskWithRelations): boolean {
  return task.status !== "cancelled" && !!task.due_date;
}

export function timelineTaskToCalendarEvent(
  task: TimelineTaskWithRelations,
  ctx: CalendarExportContext
): CalendarEvent | null {
  if (!isExportableTask(task)) return null;

  const uid = buildCalendarUid(task.event_id, "timeline_task", task.id);

  return {
    uid,
    eventId: task.event_id,
    sourceType: "timeline_task",
    sourceId: task.id,
    id: task.id,
    title: task.title,
    description: buildTaskDescription(task, ctx),
    location: ctx.eventVenue ?? undefined,
    startDate: task.due_date!,
    allDay: true,
    timezone: ctx.timezone,
    reminderMinutes: priorityToReminderMinutes(task.priority),
  };
}

function priorityToReminderMinutes(
  priority: TimelineTaskWithRelations["priority"]
): number | undefined {
  switch (priority) {
    case "critical":
      return 24 * 60;
    case "high":
      return 3 * 24 * 60;
    case "medium":
      return 7 * 24 * 60;
    default:
      return undefined;
  }
}

export function milestoneGroupToCalendarEvents(
  group: MilestoneGroup,
  ctx: CalendarExportContext
): CalendarEvent[] {
  return group.tasks
    .map((task) => timelineTaskToCalendarEvent(task, ctx))
    .filter((e): e is CalendarEvent => e !== null);
}

export function timelineTasksToCalendarEvents(
  tasks: TimelineTaskWithRelations[],
  ctx: CalendarExportContext
): CalendarEvent[] {
  return tasks
    .map((task) => timelineTaskToCalendarEvent(task, ctx))
    .filter((e): e is CalendarEvent => e !== null);
}
