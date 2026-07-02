import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { ProfileFlags } from "@/lib/auth/profile";

const PROFILE_CACHE_COOKIE = "evento_profile_cache";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedProfileFlags = ProfileFlags & {
  uid: string;
  exp: number;
};

function parseCachedProfile(raw: string | undefined, userId: string): ProfileFlags | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedProfileFlags;
    if (parsed.uid !== userId || parsed.exp <= Date.now()) {
      return null;
    }

    return {
      is_admin: !!parsed.is_admin,
      is_planner: !!parsed.is_planner,
      is_vendor: !!parsed.is_vendor,
    };
  } catch {
    return null;
  }
}

function writeProfileCache(response: NextResponse, userId: string, flags: ProfileFlags): void {
  const payload: CachedProfileFlags = {
    uid: userId,
    exp: Date.now() + CACHE_TTL_MS,
    ...flags,
  };

  response.cookies.set(PROFILE_CACHE_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(CACHE_TTL_MS / 1000),
    path: "/",
  });
}

export function clearProfileCache(response: NextResponse): void {
  response.cookies.set(PROFILE_CACHE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function clearProfileCacheFromStore(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PROFILE_CACHE_COOKIE);
}

export async function getProfileFlagsForMiddleware(
  supabase: SupabaseClient,
  user: User,
  request: NextRequest,
  response: NextResponse
): Promise<ProfileFlags> {
  const cached = parseCachedProfile(request.cookies.get(PROFILE_CACHE_COOKIE)?.value, user.id);
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin, is_planner, is_vendor")
    .eq("id", user.id)
    .maybeSingle();

  const flags: ProfileFlags = {
    is_admin: data?.is_admin ?? false,
    is_planner: data?.is_planner ?? true,
    is_vendor: data?.is_vendor ?? false,
  };

  if (error && process.env.NODE_ENV === "development") {
    console.warn("[middleware] profile fetch failed:", error.message);
  }

  writeProfileCache(response, user.id, flags);
  return flags;
}

export function isAdminUser(user: User, flags: ProfileFlags): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = user.email?.trim().toLowerCase();

  if (!flags.is_admin) return false;
  if (!adminEmail) return flags.is_admin;
  return userEmail === adminEmail;
}
