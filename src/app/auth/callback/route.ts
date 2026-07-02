import { NextResponse } from "next/server";

import {
  applySignupRoleFromMetadata,
  applySignupRoleToProfile,
  getProfileFlagsForUser,
  redirectPathAfterAuth,
} from "@/lib/auth/profile";
import { parseSignupAccountRole } from "@/lib/auth/signup-role";
import { createClient } from "@/lib/supabase/server";

const NEW_OAUTH_USER_WINDOW_MS = 5 * 60 * 1000;

function isFreshOAuthSignup(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_OAUTH_USER_WINDOW_MS;
}

function metadataFullName(metadata: Record<string, unknown> | undefined): string | null {
  if (typeof metadata?.full_name === "string") return metadata.full_name;
  if (typeof metadata?.name === "string") return metadata.name;
  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const roleParam = parseSignupAccountRole(searchParams.get("role"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const metadataRole = parseSignupAccountRole(data.user.user_metadata?.account_role);

      if (roleParam) {
        await applySignupRoleToProfile(
          supabase,
          data.user.id,
          roleParam,
          metadataFullName(data.user.user_metadata)
        );
        await supabase.auth.updateUser({
          data: { account_role: roleParam },
        });
      } else {
        await applySignupRoleFromMetadata(supabase, data.user.id, data.user.user_metadata);
      }

      const needsRoleSelection =
        !roleParam &&
        !metadataRole &&
        isFreshOAuthSignup(data.user.created_at);

      if (needsRoleSelection) {
        return NextResponse.redirect(`${origin}/signup/role-select`);
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const flags = await getProfileFlagsForUser(data.user.id);
      const path = redirectPathAfterAuth(flags ?? { is_planner: true, is_vendor: false });
      return NextResponse.redirect(`${origin}${path}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}