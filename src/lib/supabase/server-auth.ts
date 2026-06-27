import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getUserSafely } from "@/lib/supabase/safe-auth";

/** Per-request cached auth user — dedupes getUser() across layouts and pages. */
export const getServerUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { user } = await getUserSafely(supabase);
  return user;
});
