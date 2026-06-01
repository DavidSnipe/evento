import { getEventAccessForUser } from "@/lib/collaboration/queries";
import { logAccessDecision } from "@/lib/collaboration/access-debug";
import type { EventPermissions } from "@/types/collaboration";
import { getEventById } from "@/lib/events/queries";
import type { EventAccessContext } from "@/lib/events/verify-event";
import { createClient } from "@/lib/supabase/server";

export type AssertEventResult =
  | { ok: true; ctx: EventAccessContext }
  | { ok: false; error: string };

export async function assertEventAccess(
  eventId: string
): Promise<AssertEventResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logAccessDecision({
      decision: "denied",
      source: "assertEventAccess",
      eventId,
      reason: "unauthenticated",
    });
    return { ok: false, error: "Neautentificat." };
  }

  const access = await getEventAccessForUser(
    eventId,
    user.id,
    user.email ?? null
  );

  if (!access) {
    logAccessDecision({
      decision: "denied",
      source: "assertEventAccess",
      eventId,
      userId: user.id,
      userEmail: user.email,
      reason: "no_access_record",
    });
    return {
      ok: false,
      error: "Evenimentul nu a fost găsit sau nu ai acces.",
    };
  }

  const event = await getEventById(eventId);
  if (!event) {
    logAccessDecision({
      decision: "denied",
      source: "assertEventAccess",
      eventId,
      userId: user.id,
      userEmail: user.email,
      role: access.role,
      reason: "event_row_not_visible",
    });
    return {
      ok: false,
      error: "Evenimentul nu a fost găsit sau nu ai acces.",
    };
  }

  logAccessDecision({
    decision: "granted",
    source: "assertEventAccess",
    eventId,
    userId: user.id,
    userEmail: user.email,
    role: access.role,
  });

  return { ok: true, ctx: { event, access } };
}

export async function assertEventPermission(
  eventId: string,
  check: (permissions: EventPermissions) => boolean,
  permissionName: string
): Promise<AssertEventResult> {
  const result = await assertEventAccess(eventId);
  if (!result.ok) return result;

  if (!check(result.ctx.access.permissions)) {
    logAccessDecision({
      decision: "denied",
      source: "assertEventPermission",
      eventId,
      userId: result.ctx.access.userId,
      role: result.ctx.access.role,
      reason: `missing_permission:${permissionName}`,
    });
    return { ok: false, error: "Nu ai permisiunea necesară pentru această acțiune." };
  }

  return result;
}

export async function assertManageCollaborators(
  eventId: string
): Promise<AssertEventResult> {
  return assertEventPermission(
    eventId,
    (permissions) => permissions.canManageCollaborators,
    "canManageCollaborators"
  );
}

/** Convenience for server actions that return `{ error?: string }`. */
export async function denyUnlessEventAccess(
  eventId: string
): Promise<{ error: string } | null> {
  const result = await assertEventAccess(eventId);
  if (!result.ok) return { error: result.error };
  return null;
}

export async function denyUnlessEventPermission(
  eventId: string,
  check: (permissions: EventPermissions) => boolean,
  permissionName: string
): Promise<{ error: string } | null> {
  const result = await assertEventPermission(eventId, check, permissionName);
  if (!result.ok) return { error: result.error };
  return null;
}

/** Map access denial to `{ success: false, error }` for actions that require `success`. */
export function deniedAsSuccess(
  denied: { error: string } | null
): { success: false; error: string } | null {
  if (!denied) return null;
  return { success: false, error: denied.error };
}

export function deniedAsSuccessWithCount(
  denied: { error: string } | null
): { success: false; count: number; error: string } | null {
  if (!denied) return null;
  return { success: false, count: 0, error: denied.error };
}
