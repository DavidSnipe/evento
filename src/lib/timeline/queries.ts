import { createClient } from "@/lib/supabase/server";
import type {
  TimelineCategoryRow,
  TimelineFoundation,
  TimelineMilestoneRow,
  TimelineTaskRow,
  TimelineTaskWithRelations,
} from "@/types/timeline";

export function isTimelineTableMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("timeline_") && (msg.includes("does not exist") || msg.includes("schema cache"));
}

export async function checkTimelineReady(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_tasks").select("id").limit(1);
  if (!error) return true;
  return isTimelineTableMissing(error);
}

export async function getSystemTimelineCategories(): Promise<TimelineCategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_categories")
    .select("*")
    .is("event_id", null)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isTimelineTableMissing(error)) console.error("getSystemTimelineCategories:", error);
    return [];
  }
  return (data ?? []) as TimelineCategoryRow[];
}

export async function getEventTimelineCategories(
  eventId: string
): Promise<TimelineCategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_categories")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isTimelineTableMissing(error)) console.error("getEventTimelineCategories:", error);
    return [];
  }
  return (data ?? []) as TimelineCategoryRow[];
}

export async function getTimelineCategoriesForEvent(
  eventId: string
): Promise<TimelineCategoryRow[]> {
  const [system, custom] = await Promise.all([
    getSystemTimelineCategories(),
    getEventTimelineCategories(eventId),
  ]);
  return [...system, ...custom];
}

export async function getTimelineMilestoneTemplates(): Promise<TimelineMilestoneRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_milestones")
    .select("*")
    .is("event_id", null)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isTimelineTableMissing(error)) console.error("getTimelineMilestoneTemplates:", error);
    return [];
  }
  return (data ?? []) as TimelineMilestoneRow[];
}

export async function getEventTimelineMilestones(
  eventId: string
): Promise<TimelineMilestoneRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_milestones")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isTimelineTableMissing(error)) console.error("getEventTimelineMilestones:", error);
    return [];
  }
  return (data ?? []) as TimelineMilestoneRow[];
}

function mapTaskRow(row: Record<string, unknown>): TimelineTaskWithRelations {
  const task = row as unknown as TimelineTaskRow & {
    category?: TimelineCategoryRow | null;
    milestone?: TimelineMilestoneRow | null;
  };
  return {
    ...task,
    category: (row.category as TimelineCategoryRow | null) ?? null,
    milestone: (row.milestone as TimelineMilestoneRow | null) ?? null,
  };
}

export async function getTimelineTasksForEvent(
  eventId: string
): Promise<TimelineTaskWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_tasks")
    .select(
      `
      *,
      category:timeline_categories (*),
      milestone:timeline_milestones (*)
    `
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    if (!isTimelineTableMissing(error)) console.error("getTimelineTasksForEvent:", error);
    return [];
  }

  return (data ?? []).map((row) => mapTaskRow(row as Record<string, unknown>));
}

export async function getTimelineTaskById(
  eventId: string,
  taskId: string
): Promise<TimelineTaskWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_tasks")
    .select(
      `
      *,
      category:timeline_categories (*),
      milestone:timeline_milestones (*)
    `
    )
    .eq("event_id", eventId)
    .eq("id", taskId)
    .maybeSingle();

  if (error || !data) return null;
  return mapTaskRow(data as Record<string, unknown>);
}

export async function getTimelineFoundation(
  eventId: string
): Promise<TimelineFoundation> {
  const [categories, milestoneTemplates, eventMilestones, tasks] = await Promise.all([
    getTimelineCategoriesForEvent(eventId),
    getTimelineMilestoneTemplates(),
    getEventTimelineMilestones(eventId),
    getTimelineTasksForEvent(eventId),
  ]);

  return {
    categories,
    milestoneTemplates,
    eventMilestones,
    tasks,
  };
}
