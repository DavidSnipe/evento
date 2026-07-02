"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  applySignupRoleToProfile,
  getProfileFlagsForUser,
  redirectPathAfterAuth,
} from "@/lib/auth/profile";
import { clearProfileCacheFromStore } from "@/lib/auth/profile-cache";
import { parseSignupAccountRole } from "@/lib/auth/signup-role";
import { translateAuthError } from "@/lib/auth/errors";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/site-url";

export type AuthState = {
  error?: string;
  success?: string;
};

async function redirectAfterAuthenticatedSession(userId: string, showVendorHint = false) {
  const flags = await getProfileFlagsForUser(userId);
  const path = redirectPathAfterAuth(
    flags ?? { is_planner: true, is_vendor: false },
    { showVendorHint }
  );
  revalidatePath("/", "layout");
  redirect(path);
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: ro.auth.errors.required };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user) {
    await redirectAfterAuthenticatedSession(data.user.id);
  }

  return { error: ro.auth.errors.generic };
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const accountRole = parseSignupAccountRole(formData.get("account_role"));

  if (!email || !password) {
    return { error: ro.auth.errors.required };
  }

  if (!fullName) {
    return { error: ro.auth.errors.required };
  }

  if (!accountRole) {
    return { error: ro.auth.errors.generic };
  }

  if (password.length < 8) {
    return { error: ro.auth.errors.passwordMin };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        full_name: fullName,
        account_role: accountRole,
      },
    },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user) {
    const profileResult = await applySignupRoleToProfile(
      supabase,
      data.user.id,
      accountRole,
      fullName
    );

    if (profileResult.error) {
      return { error: ro.auth.signupRole.profileUpdateFailed };
    }
  }

  if (data.session && data.user) {
    await redirectAfterAuthenticatedSession(
      data.user.id,
      accountRole === "both"
    );
  }

  return { success: ro.auth.success.checkEmail };
}

export async function signInWithGoogle(formData: FormData) {
  const siteUrl = await getSiteUrl();
  const role = parseSignupAccountRole(formData.get("role"));
  const callbackUrl = role
    ? `${siteUrl}/auth/callback?role=${encodeURIComponent(role)}`
    : `${siteUrl}/auth/callback`;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}

export async function selectSignupRole(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const accountRole = parseSignupAccountRole(formData.get("account_role"));
  if (!accountRole) {
    return { error: ro.auth.errors.generic };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  const profileResult = await applySignupRoleToProfile(
    supabase,
    user.id,
    accountRole,
    fullName
  );

  if (profileResult.error) {
    return { error: ro.auth.signupRole.profileUpdateFailed };
  }

  await supabase.auth.updateUser({
    data: { account_role: accountRole },
  });

  await clearProfileCacheFromStore();
  revalidatePath("/", "layout");
  await redirectAfterAuthenticatedSession(user.id, accountRole === "both");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearProfileCacheFromStore();
  revalidatePath("/", "layout");
  redirect("/login");
}
