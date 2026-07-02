import { redirect } from "next/navigation";

import { getProfileFlagsForUser } from "@/lib/auth/profile";
import { isAdminUser } from "@/lib/auth/profile-cache";
import { getServerUser } from "@/lib/supabase/server-auth";

export async function requireAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const flags = await getProfileFlagsForUser(user.id);
  if (!flags || !isAdminUser(user, flags)) {
    redirect("/dashboard");
  }

  return { user, flags };
}
