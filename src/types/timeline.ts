/** Timeline task workflow status */
export type TimelineTaskStatus =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled";

export type TimelineTaskPriority = "low" | "medium" | "high" | "critical";

/**
 * Which part of the wedding/event this task belongs to.
 * Supports different dates for civil / religious / party in future phases.
 */
export type TimelineEventSegment =
  | "general"
  | "civil"
  | "religious"
  | "party";

export type TimelineCategoryRow = {
  id: string;
  event_id: string | null;
  slug: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TimelineMilestoneRow = {
  id: string;
  event_id: string | null;
  label: string;
  months_before: number | null;
  weeks_before: number | null;
  days_before: number | null;
  fixed_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TimelineTaskRow = {
  id: string;
  event_id: string;
  category_id: string | null;
  milestone_id: string | null;
  title: string;
  description: string | null;
  status: TimelineTaskStatus;
  priority: TimelineTaskPriority;
  event_segment: TimelineEventSegment;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  sort_order: number;
  vendor_id: string | null;
  budget_item_id: string | null;
  invitation_household_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Task with joined category + milestone for UI layers (future phases). */
export type TimelineTaskWithRelations = TimelineTaskRow & {
  category: TimelineCategoryRow | null;
  milestone: TimelineMilestoneRow | null;
};

export type TimelineFoundation = {
  categories: TimelineCategoryRow[];
  milestoneTemplates: TimelineMilestoneRow[];
  eventMilestones: TimelineMilestoneRow[];
  tasks: TimelineTaskWithRelations[];
};

export const TIMELINE_TASK_STATUSES: TimelineTaskStatus[] = [
  "not_started",
  "in_progress",
  "waiting",
  "completed",
  "cancelled",
];

export const TIMELINE_TASK_PRIORITIES: TimelineTaskPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export const TIMELINE_EVENT_SEGMENTS: TimelineEventSegment[] = [
  "general",
  "civil",
  "religious",
  "party",
];

export type TimelineTaskInput = {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  milestoneId?: string | null;
  status?: TimelineTaskStatus;
  priority?: TimelineTaskPriority;
  eventSegment?: TimelineEventSegment;
  dueDate?: string | null;
  notes?: string | null;
  sortOrder?: number;
  vendorId?: string | null;
  budgetItemId?: string | null;
  invitationHouseholdId?: string | null;
};

export type TimelineMilestoneInput = {
  label: string;
  monthsBefore?: number | null;
  weeksBefore?: number | null;
  daysBefore?: number | null;
  fixedDate?: string | null;
  sortOrder?: number;
};

export type TimelineCategoryInput = {
  slug: string;
  name: string;
  sortOrder?: number;
};
