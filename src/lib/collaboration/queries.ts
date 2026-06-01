import { createClient } from "@/lib/supabase/server";
import { logAccessDecision } from "@/lib/collaboration/access-debug";
import { buildEventAccess } from "@/lib/collaboration/permissions";
import type {
  EventAccess,
  EventAccessRole,
  EventCollaboratorRow,
  EventMemberView,
  EventOwnerView,
} from "@/types/collaboration";
import type { EventRow } from "@/types/events";

export function isCollaborationTableMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    (msg.includes("event_collaborators") || msg.includes("event_activity_log")) &&
    (msg.includes("does not exist") || msg.includes("schema cache"))
  );
}

export async function checkCollaborationReady(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_collaborators").select("id").limit(1);
  if (!error) return true;
  return isCollaborationTableMissing(error);
}

/** Single source of truth: matches RLS `user_event_access_role()` in Postgres. */
export async function getEventAccessForUser(
  eventId: string,
  userId: string | null,
  userEmail?: string | null
): Promise<EventAccess | null> {
  if (!userId) {
    logAccessDecision({
      decision: "denied",
      source: "getEventAccessForUser",
      eventId,
      reason: "no_user_id",
    });
    return null;
  }

  const supabase = await createClient();

  const { data: role, error: roleError } = await supabase.rpc("user_event_access_role", {
    p_event_id: eventId,
  });

  if (roleError) {
    if (isCollaborationTableMissing(roleError)) {
      const { data: event } = await supabase
        .from("events")
        .select("user_id")
        .eq("id", eventId)
        .maybeSingle();

      if (event?.user_id === userId) {
        logAccessDecision({
          decision: "granted",
          source: "getEventAccessForUser:fallback_owner",
          eventId,
          userId,
          userEmail,
          role: "owner",
        });
        return buildEventAccess("owner", userId);
      }

      logAccessDecision({
        decision: "denied",
        source: "getEventAccessForUser:fallback",
        eventId,
        userId,
        userEmail,
        error: roleError.message,
      });
      return null;
    }

    logAccessDecision({
      decision: "denied",
      source: "getEventAccessForUser:rpc",
      eventId,
      userId,
      userEmail,
      error: roleError.message,
    });
    console.error("getEventAccessForUser rpc:", roleError);
    return null;
  }

  if (!role) {
    logAccessDecision({
      decision: "denied",
      source: "getEventAccessForUser:rpc",
      eventId,
      userId,
      userEmail,
      reason: "no_role",
    });
    return null;
  }

  let collaboratorStatus: string | null = null;
  if (role !== "owner") {
    const { data: collaborator } = await supabase
      .from("event_collaborators")
      .select("status, role")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    collaboratorStatus = collaborator?.status ?? null;
  }

  logAccessDecision({
    decision: "granted",
    source: "getEventAccessForUser:rpc",
    eventId,
    userId,
    userEmail,
    role: String(role),
    collaboratorStatus,
  });

  return buildEventAccess(role as EventAccessRole, userId);
}

export async function getEventCollaborators(
  eventId: string
): Promise<EventCollaboratorRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_collaborators")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    if (!isCollaborationTableMissing(error)) console.error("getEventCollaborators:", error);
    return [];
  }

  return (data ?? []) as EventCollaboratorRow[];
}

export async function getEventMembers(
  event: EventRow,
  ownerEmail: string | null
): Promise<EventMemberView[]> {
  const owner: EventOwnerView = {
    id: "owner",
    event_id: event.id,
    email: ownerEmail ?? "—",
    user_id: event.user_id,
    role: "owner",
    status: "accepted",
    isOwner: true,
  };

  const collaborators = await getEventCollaborators(event.id);
  return [owner, ...collaborators.map((c) => ({ ...c, isOwner: false as const }))];
}

export async function getCollaboratorInviteByToken(token: string): Promise<{
  id: string;
  event_id: string;
  email: string;
  role: string;
  status: string;
  invite_token: string;
  event?: { title: string } | null;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pending_collaborator_invite", {
    p_token: token,
  });

  if (error) {
    if (!isCollaborationTableMissing(error)) {
      console.error("getCollaboratorInviteByToken:", error);
    }
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    event_id: row.event_id,
    email: row.email,
    role: row.role,
    status: row.status,
    invite_token: row.invite_token,
    event: { title: row.event_title },
  };
}
