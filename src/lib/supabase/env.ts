export type SupabaseEnvStatus = {
  ok: boolean;
  missing: string[];
};

/** Check required env vars exist (does not validate key correctness) */
export function checkSupabaseEnv(): SupabaseEnvStatus {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());

  return {
    ok: missing.length === 0,
    missing: [...missing],
  };
}
