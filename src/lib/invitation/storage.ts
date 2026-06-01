/** PostgREST / Postgres errors when event_invitations is not available yet. */
export function isInvitationStorageUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const e = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const code = e.code ?? "";
  const message = (e.message ?? "").toLowerCase();
  const details = (e.details ?? "").toLowerCase();

  if (code === "42P01" || code === "PGRST205") return true;

  const mentionsTable =
    message.includes("event_invitations") || details.includes("event_invitations");

  if (
    mentionsTable &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  ) {
    return true;
  }

  return false;
}

export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const e = error as { message?: string; code?: string; details?: string };
  return e.message || e.details || e.code || "Unknown error";
}

export async function checkInvitationTableReady(): Promise<boolean> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("event_invitations").select("event_id").limit(1);

  if (!error) return true;
  if (isInvitationStorageUnavailable(error)) return false;

  // Table exists but another error (RLS, etc.) — treat as ready so we don't block the UI.
  return true;
}
