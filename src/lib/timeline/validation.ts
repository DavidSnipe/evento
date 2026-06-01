import {
  TIMELINE_EVENT_SEGMENTS,
  TIMELINE_TASK_PRIORITIES,
  TIMELINE_TASK_STATUSES,
  type TimelineCategoryInput,
  type TimelineEventSegment,
  type TimelineMilestoneInput,
  type TimelineTaskInput,
  type TimelineTaskPriority,
  type TimelineTaskStatus,
} from "@/types/timeline";

export type TimelineActionResult = {
  error?: string;
  success?: boolean;
  id?: string;
};

export function parseTimelineTaskStatus(value: string): TimelineTaskStatus | null {
  return TIMELINE_TASK_STATUSES.includes(value as TimelineTaskStatus)
    ? (value as TimelineTaskStatus)
    : null;
}

export function parseTimelineTaskPriority(value: string): TimelineTaskPriority | null {
  return TIMELINE_TASK_PRIORITIES.includes(value as TimelineTaskPriority)
    ? (value as TimelineTaskPriority)
    : null;
}

export function parseTimelineEventSegment(value: string): TimelineEventSegment | null {
  return TIMELINE_EVENT_SEGMENTS.includes(value as TimelineEventSegment)
    ? (value as TimelineEventSegment)
    : null;
}

export function requireTimelineTitle(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const d = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

export function parseOptionalNonNegativeInt(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function parseCategorySlug(value: string): string | null {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
  return slug.length > 0 ? slug : null;
}

export function validateTimelineTaskInput(input: TimelineTaskInput): string | null {
  if (!requireTimelineTitle(input.title)) return "Titlul este obligatoriu.";
  if (input.status && !parseTimelineTaskStatus(input.status)) return "Status invalid.";
  if (input.priority && !parseTimelineTaskPriority(input.priority)) {
    return "Prioritate invalidă.";
  }
  if (input.eventSegment && !parseTimelineEventSegment(input.eventSegment)) {
    return "Segment eveniment invalid.";
  }
  if (input.dueDate !== undefined && input.dueDate !== null) {
    if (!parseOptionalDate(input.dueDate)) return "Data limită invalidă.";
  }
  return null;
}

export function validateTimelineMilestoneInput(
  input: TimelineMilestoneInput
): string | null {
  if (!requireTimelineTitle(input.label)) return "Eticheta milestone este obligatorie.";

  const hasOffset =
    parseOptionalNonNegativeInt(input.monthsBefore) !== null ||
    parseOptionalNonNegativeInt(input.weeksBefore) !== null ||
    parseOptionalNonNegativeInt(input.daysBefore) !== null;
  const fixed = input.fixedDate ? parseOptionalDate(input.fixedDate) : null;

  if (!hasOffset && !fixed) {
    return "Milestone-ul necesită o dată fixă sau un offset relativ.";
  }
  if (input.fixedDate && !fixed) return "Data fixă invalidă.";
  return null;
}

export function validateTimelineCategoryInput(
  input: TimelineCategoryInput
): string | null {
  if (!parseCategorySlug(input.slug)) return "Slug categorie invalid.";
  if (!requireTimelineTitle(input.name)) return "Numele categoriei este obligatoriu.";
  return null;
}

/** Map status transitions to completed_at side effects. */
export function completedAtForStatus(
  status: TimelineTaskStatus,
  previousCompletedAt: string | null
): string | null {
  if (status === "completed") {
    return previousCompletedAt ?? new Date().toISOString();
  }
  return null;
}
