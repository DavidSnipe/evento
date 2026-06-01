"use server";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { getEventById } from "@/lib/events/queries";
import {
  getTimelineCategoriesForEvent,
  getTimelineMilestoneTemplates,
  getTimelineTaskById,
  getTimelineTasksForEvent,
  isTimelineTableMissing,
} from "@/lib/timeline/queries";
import {
  resolveTemplateCategoryId,
  resolveTemplateDueDate,
  resolveTemplateMilestoneId,
  WEDDING_CHECKLIST_TEMPLATES,
} from "@/lib/timeline/wedding-templates";
import {
  completedAtForStatus,
  parseCategorySlug,
  parseOptionalDate,
  parseOptionalNonNegativeInt,
  parseTimelineTaskStatus,
  requireTimelineTitle,
  validateTimelineCategoryInput,
  validateTimelineMilestoneInput,
  validateTimelineTaskInput,
  type TimelineActionResult,
} from "@/lib/timeline/validation";
import { createClient } from "@/lib/supabase/server";
import type {
  TimelineCategoryInput,
  TimelineMilestoneInput,
  TimelineTaskInput,
  TimelineTaskStatus,
  TimelineTaskWithRelations,
} from "@/types/timeline";

const MIGRATION_HINT =
  "Rulează migrarea 013_timeline_foundation.sql în Supabase (SQL Editor).";

function migrationError(): TimelineActionResult {
  return { error: MIGRATION_HINT };
}

async function assertCategoryForEvent(eventId: string, categoryId: string | null) {
  if (!categoryId) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_categories")
    .select("id, event_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!data) return false;
  if (data.event_id === null) return true;
  return data.event_id === eventId;
}

async function assertMilestoneForEvent(eventId: string, milestoneId: string | null) {
  if (!milestoneId) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_milestones")
    .select("id, event_id")
    .eq("id", milestoneId)
    .maybeSingle();
  if (!data) return false;
  if (data.event_id === null) return true;
  return data.event_id === eventId;
}

export async function createTimelineCategory(
  eventId: string,
  input: TimelineCategoryInput
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const validation = validateTimelineCategoryInput(input);
  if (validation) return { error: validation };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_categories")
    .insert({
      event_id: eventId,
      slug: parseCategorySlug(input.slug)!,
      name: input.name.trim(),
      sort_order: input.sortOrder ?? 999,
    })
    .select("id")
    .single();

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("createTimelineCategory:", error);
    return { error: "Nu am putut crea categoria." };
  }

  return { success: true, id: data.id };
}

export async function createTimelineMilestone(
  eventId: string,
  input: TimelineMilestoneInput
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const validation = validateTimelineMilestoneInput(input);
  if (validation) return { error: validation };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_milestones")
    .insert({
      event_id: eventId,
      label: input.label.trim(),
      months_before: parseOptionalNonNegativeInt(input.monthsBefore),
      weeks_before: parseOptionalNonNegativeInt(input.weeksBefore),
      days_before: parseOptionalNonNegativeInt(input.daysBefore),
      fixed_date: input.fixedDate ? parseOptionalDate(input.fixedDate) : null,
      sort_order: input.sortOrder ?? 999,
    })
    .select("id")
    .single();

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("createTimelineMilestone:", error);
    return { error: "Nu am putut crea milestone-ul." };
  }

  return { success: true, id: data.id };
}

export async function updateTimelineMilestone(
  eventId: string,
  milestoneId: string,
  input: TimelineMilestoneInput
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const validation = validateTimelineMilestoneInput(input);
  if (validation) return { error: validation };

  const supabase = await createClient();
  const { error } = await supabase
    .from("timeline_milestones")
    .update({
      label: input.label.trim(),
      months_before: parseOptionalNonNegativeInt(input.monthsBefore),
      weeks_before: parseOptionalNonNegativeInt(input.weeksBefore),
      days_before: parseOptionalNonNegativeInt(input.daysBefore),
      fixed_date: input.fixedDate ? parseOptionalDate(input.fixedDate) : null,
      sort_order: input.sortOrder ?? 999,
    })
    .eq("id", milestoneId)
    .eq("event_id", eventId);

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("updateTimelineMilestone:", error);
    return { error: "Nu am putut actualiza milestone-ul." };
  }

  return { success: true, id: milestoneId };
}

export async function deleteTimelineMilestone(
  eventId: string,
  milestoneId: string
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("timeline_milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("event_id", eventId);

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("deleteTimelineMilestone:", error);
    return { error: "Nu am putut șterge milestone-ul." };
  }

  return { success: true };
}

export async function createTimelineTask(
  eventId: string,
  input: TimelineTaskInput
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const validation = validateTimelineTaskInput(input);
  if (validation) return { error: validation };

  if (!(await assertCategoryForEvent(eventId, input.categoryId ?? null))) {
    return { error: "Categoria selectată nu este validă." };
  }
  if (!(await assertMilestoneForEvent(eventId, input.milestoneId ?? null))) {
    return { error: "Milestone-ul selectat nu este valid." };
  }

  const status = input.status ?? "not_started";
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("timeline_tasks")
    .insert({
      event_id: eventId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category_id: input.categoryId ?? null,
      milestone_id: input.milestoneId ?? null,
      status,
      priority: input.priority ?? "medium",
      event_segment: input.eventSegment ?? "general",
      due_date: input.dueDate ? parseOptionalDate(input.dueDate) : null,
      notes: input.notes?.trim() || null,
      sort_order: input.sortOrder ?? 0,
      vendor_id: input.vendorId ?? null,
      budget_item_id: input.budgetItemId ?? null,
      invitation_household_id: input.invitationHouseholdId ?? null,
      completed_at: completedAtForStatus(status, null),
    })
    .select("id")
    .single();

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("createTimelineTask:", error);
    return { error: "Nu am putut crea activitatea." };
  }

  return { success: true, id: data.id };
}

export async function updateTimelineTask(
  eventId: string,
  taskId: string,
  input: TimelineTaskInput
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const validation = validateTimelineTaskInput(input);
  if (validation) return { error: validation };

  const existing = await getTimelineTaskById(eventId, taskId);
  if (!existing) return { error: "Activitatea nu a fost găsită." };

  if (!(await assertCategoryForEvent(eventId, input.categoryId ?? null))) {
    return { error: "Categoria selectată nu este validă." };
  }
  if (!(await assertMilestoneForEvent(eventId, input.milestoneId ?? null))) {
    return { error: "Milestone-ul selectat nu este valid." };
  }

  const status = input.status ?? existing.status;
  const supabase = await createClient();

  const { error } = await supabase
    .from("timeline_tasks")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category_id: input.categoryId ?? null,
      milestone_id: input.milestoneId ?? null,
      status,
      priority: input.priority ?? existing.priority,
      event_segment: input.eventSegment ?? existing.event_segment,
      due_date:
        input.dueDate !== undefined
          ? input.dueDate
            ? parseOptionalDate(input.dueDate)
            : null
          : existing.due_date,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      sort_order: input.sortOrder ?? existing.sort_order,
      vendor_id: input.vendorId !== undefined ? input.vendorId : existing.vendor_id,
      budget_item_id:
        input.budgetItemId !== undefined ? input.budgetItemId : existing.budget_item_id,
      invitation_household_id:
        input.invitationHouseholdId !== undefined
          ? input.invitationHouseholdId
          : existing.invitation_household_id,
      completed_at: completedAtForStatus(status, existing.completed_at),
    })
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("updateTimelineTask:", error);
    return { error: "Nu am putut actualiza activitatea." };
  }

  return { success: true, id: taskId };
}

export async function updateTimelineTaskStatus(
  eventId: string,
  taskId: string,
  status: TimelineTaskStatus
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  if (!parseTimelineTaskStatus(status)) return { error: "Status invalid." };

  const existing = await getTimelineTaskById(eventId, taskId);
  if (!existing) return { error: "Activitatea nu a fost găsită." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("timeline_tasks")
    .update({
      status,
      completed_at: completedAtForStatus(status, existing.completed_at),
    })
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("updateTimelineTaskStatus:", error);
    return { error: "Nu am putut actualiza statusul." };
  }

  return { success: true, id: taskId };
}

export async function deleteTimelineTask(
  eventId: string,
  taskId: string
): Promise<TimelineActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("timeline_tasks")
    .delete()
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("deleteTimelineTask:", error);
    return { error: "Nu am putut șterge activitatea." };
  }

  return { success: true };
}

export type GenerateChecklistResult = TimelineActionResult & {
  created?: number;
  skipped?: number;
  tasks?: TimelineTaskWithRelations[];
};

export async function generateWeddingChecklist(
  eventId: string
): Promise<GenerateChecklistResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditTimeline, "canEditTimeline");
  if (accessDenied) return accessDenied;

  const event = await getEventById(eventId);
  if (!event?.event_date) {
    return { error: "Adaugă data evenimentului pentru a genera checklist-ul." };
  }

  const [categories, milestoneTemplates, existingTasks] = await Promise.all([
    getTimelineCategoriesForEvent(eventId),
    getTimelineMilestoneTemplates(),
    getTimelineTasksForEvent(eventId),
  ]);

  const existingTitles = new Set(
    existingTasks.map((t) => t.title.trim().toLowerCase())
  );

  const toInsert = WEDDING_CHECKLIST_TEMPLATES.filter(
    (tpl) => !existingTitles.has(tpl.title.trim().toLowerCase())
  );

  if (toInsert.length === 0) {
    return {
      success: true,
      created: 0,
      skipped: WEDDING_CHECKLIST_TEMPLATES.length,
    };
  }

  const supabase = await createClient();
  const rows = toInsert.map((tpl, index) => ({
    event_id: eventId,
    title: tpl.title,
    category_id: resolveTemplateCategoryId(tpl, categories),
    milestone_id: resolveTemplateMilestoneId(tpl, milestoneTemplates),
    status: "not_started" as const,
    priority: tpl.priority,
    event_segment: tpl.eventSegment,
    due_date: resolveTemplateDueDate(tpl, event.event_date!, milestoneTemplates),
    notes: null,
    sort_order: index * 10,
  }));

  const { data, error } = await supabase
    .from("timeline_tasks")
    .insert(rows)
    .select(
      `
      *,
      category:timeline_categories (*),
      milestone:timeline_milestones (*)
    `
    );

  if (error) {
    if (isTimelineTableMissing(error)) return migrationError();
    console.error("generateWeddingChecklist:", error);
    return { error: "Nu am putut genera checklist-ul." };
  }

  return {
    success: true,
    created: data?.length ?? 0,
    skipped: WEDDING_CHECKLIST_TEMPLATES.length - (data?.length ?? 0),
    tasks: (data ?? []).map((row) => ({
      ...(row as TimelineTaskWithRelations),
      category: (row as { category?: TimelineTaskWithRelations["category"] }).category ?? null,
      milestone: (row as { milestone?: TimelineTaskWithRelations["milestone"] }).milestone ?? null,
    })),
  };
}

export async function patchTimelineTaskTitle(
  eventId: string,
  taskId: string,
  title: string
): Promise<TimelineActionResult> {
  const trimmed = requireTimelineTitle(title);
  if (!trimmed) return { error: "Titlul este obligatoriu." };
  return updateTimelineTask(eventId, taskId, { title: trimmed });
}
