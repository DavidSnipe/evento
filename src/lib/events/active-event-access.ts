import { getEventAccessForUser } from "@/lib/collaboration/queries";
import { logAccessDecision } from "@/lib/collaboration/access-debug";
import { clearActiveEventId, getActiveEventId } from "@/lib/events/active-event";
import { getServerUser } from "@/lib/supabase/server-auth";

/** Clear active-event cookie when user no longer has access. */
export async function reconcileActiveEventAccess(): Promise<string | null> {
  const activeEventId = await getActiveEventId();
  if (!activeEventId) return null;

  const user = await getServerUser();

  if (!user) {
    await clearActiveEventId();
    return null;
  }

  const access = await getEventAccessForUser(
    activeEventId,
    user.id,
    user.email ?? null
  );

  if (!access) {
    logAccessDecision({
      decision: "denied",
      source: "reconcileActiveEventAccess",
      eventId: activeEventId,
      userId: user.id,
      userEmail: user.email,
      reason: "clearing_stale_active_event_cookie",
    });
    await clearActiveEventId();
    return null;
  }

  return activeEventId;
}
