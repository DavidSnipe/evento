import { createClient } from "@/lib/supabase/server";
import { isCollaborationTableMissing } from "@/lib/collaboration/queries";
import type { EventActivityAction } from "@/types/collaboration";

export type LogActivityInput = {
  eventId: string;
  action: EventActivityAction | string;
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
};

export type LogActivityResult = {
  success?: boolean;
  error?: string;
  id?: string;
};

/**
 * Append-only activity log for future UI / notifications.
 * Safe to call from any server action — fails silently if migration missing.
 */
export async function logEventActivity(
  input: LogActivityInput
): Promise<LogActivityResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("event_activity_log")
    .insert({
      event_id: input.eventId,
      actor_user_id: input.actorUserId ?? user?.id ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      summary: input.summary.trim(),
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    if (isCollaborationTableMissing(error)) {
      return { success: false, error: "activity_table_missing" };
    }
    console.error("logEventActivity:", error);
    return { error: "Nu am putut înregistra activitatea." };
  }

  return { success: true, id: data.id };
}

export async function getRecentEventActivity(
  eventId: string,
  limit = 50
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_activity_log")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (!isCollaborationTableMissing(error)) console.error("getRecentEventActivity:", error);
    return [];
  }

  return data ?? [];
}
