import { checkSupabaseEnv } from "@/lib/supabase/env";

export function SupabaseEnvBanner() {
  if (process.env.NODE_ENV === "production") return null;

  const { ok, missing } = checkSupabaseEnv();
  if (ok) return null;

  return (
    <div className="mb-4 w-full max-w-md rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Configurare Supabase incompletă</p>
      <p className="mt-1 text-amber-800">
        Lipsesc variabilele din <code className="rounded bg-amber-100 px-1">.env.local</code>:{" "}
        {missing.join(", ")}
      </p>
    </div>
  );
}
