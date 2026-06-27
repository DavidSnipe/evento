import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";

/** Network / upstream outage (e.g. paused Supabase project behind Cloudflare). */
export function isAuthNetworkError(error: AuthError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.status === 0 ||
    error.status === 521 ||
    error.status === 502 ||
    error.status === 503
  );
}

/** Stale or invalid session cookies — safe to clear locally without calling Supabase. */
export function isStaleSessionError(error: AuthError | null | undefined): boolean {
  if (!error) return false;
  if (error.status === 400) return true;
  const code = (error as AuthError & { code?: string }).code;
  return (
    code === "refresh_token_not_found" ||
    code === "invalid_refresh_token" ||
    /refresh token/i.test(error.message ?? "")
  );
}

export async function clearLocalAuthSession(
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Best-effort cookie cleanup only.
  }
}

/**
 * getUser() wrapper that never throws.
 * Clears broken local sessions; treats network outages as logged-out for routing.
 */
export async function getUserSafely(
  supabase: SupabaseClient
): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (isStaleSessionError(error)) {
        await clearLocalAuthSession(supabase);
      }
      if (isAuthNetworkError(error)) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[auth] Supabase unreachable (status %s). Check project is running and NEXT_PUBLIC_SUPABASE_URL.",
            error.status
          );
        }
        return { user: null, error };
      }
      return { user: null, error };
    }

    return { user: data.user ?? null, error: null };
  } catch (err) {
    const authError = err as AuthError;
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth] getUser failed:", authError?.message ?? err);
    }
    return { user: null, error: authError ?? null };
  }
}
