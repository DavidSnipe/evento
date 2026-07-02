import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/marketplace";

import {
  parseSignupAccountRole,
  resolvePostAuthRedirect,
  roleToProfileFlags,
  type ProfileRoleFlags,
  type SignupAccountRole,
} from "./signup-role";

export type ProfileFlags = ProfileRoleFlags & {
  is_admin: boolean;
};

export async function getProfileForUser(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getProfileForUser]", error.message);
    return null;
  }

  return data as Profile | null;
}

export async function getProfileFlagsForUser(userId: string): Promise<ProfileFlags | null> {
  const profile = await getProfileForUser(userId);
  if (!profile) return null;

  return {
    is_admin: profile.is_admin,
    is_planner: profile.is_planner,
    is_vendor: profile.is_vendor,
  };
}

export async function applySignupRoleToProfile(
  supabase: SupabaseClient,
  userId: string,
  role: SignupAccountRole,
  fullName?: string | null
): Promise<{ error?: string }> {
  const flags = roleToProfileFlags(role);
  const payload: Record<string, unknown> = {
    id: userId,
    ...flags,
  };

  if (fullName?.trim()) {
    payload.full_name = fullName.trim();
  }

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("[applySignupRoleToProfile]", error.message);
    return { error: error.message };
  }

  return {};
}

export async function applySignupRoleFromMetadata(
  supabase: SupabaseClient,
  userId: string,
  metadata: Record<string, unknown> | undefined
): Promise<void> {
  const role = parseSignupAccountRole(metadata?.account_role);
  if (!role) return;

  const fullName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : null;

  await applySignupRoleToProfile(supabase, userId, role, fullName);
}

export function redirectPathAfterAuth(
  flags: ProfileRoleFlags,
  options?: { showVendorHint?: boolean }
): string {
  return resolvePostAuthRedirect(flags, options);
}
