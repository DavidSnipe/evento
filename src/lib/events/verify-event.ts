import { notFound } from "next/navigation";

import { getEventAccessForUser } from "@/lib/collaboration/queries";
import { logAccessDecision } from "@/lib/collaboration/access-debug";
import type { EventAccess } from "@/types/collaboration";
import { canManageCollaborators } from "@/lib/collaboration/permissions";
import { getEventById } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import type { EventPermissions } from "@/types/collaboration";
import type { EventRow } from "@/types/events";

export type EventAccessContext = {
  event: EventRow;
  access: EventAccess;
};

/** Load event if user has any access (owner or accepted collaborator). */
export async function requireEventAccess(
  eventId: string
): Promise<EventAccessContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await getEventAccessForUser(
    eventId,
    user?.id ?? null,
    user?.email ?? null
  );

  if (!access) {
    logAccessDecision({
      decision: "denied",
      source: "requireEventAccess",
      eventId,
      userId: user?.id,
      userEmail: user?.email,
      reason: "no_access",
    });
    notFound();
  }

  const event = await getEventById(eventId);
  if (!event) {
    logAccessDecision({
      decision: "denied",
      source: "requireEventAccess",
      eventId,
      userId: user?.id,
      userEmail: user?.email,
      role: access.role,
      reason: "event_row_not_visible",
    });
    notFound();
  }

  logAccessDecision({
    decision: "granted",
    source: "requireEventAccess",
    eventId,
    userId: user?.id,
    userEmail: user?.email,
    role: access.role,
  });

  return { event, access };
}

/** Backward-compatible: any event member can open the page. */
export async function requireEvent(eventId: string): Promise<EventRow> {
  const { event } = await requireEventAccess(eventId);
  return event;
}

export async function requireEventPermission(
  eventId: string,
  check: (permissions: EventPermissions) => boolean
): Promise<EventAccessContext> {
  const ctx = await requireEventAccess(eventId);
  if (!check(ctx.access.permissions)) {
    logAccessDecision({
      decision: "denied",
      source: "requireEventPermission",
      eventId,
      userId: ctx.access.userId,
      role: ctx.access.role,
      reason: "missing_permission",
    });
    notFound();
  }
  return ctx;
}

export async function requireManageCollaborators(
  eventId: string
): Promise<EventAccessContext> {
  const ctx = await requireEventAccess(eventId);
  if (!canManageCollaborators(ctx.access)) {
    logAccessDecision({
      decision: "denied",
      source: "requireManageCollaborators",
      eventId,
      userId: ctx.access.userId,
      role: ctx.access.role,
      reason: "not_owner",
    });
    notFound();
  }
  return ctx;
}
