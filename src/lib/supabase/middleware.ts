import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { redirectPathAfterAuth } from "@/lib/auth/profile";
import { getProfileFlagsForMiddleware, isAdminUser } from "@/lib/auth/profile-cache";
import { getUserSafely } from "@/lib/supabase/safe-auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
      );
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { user } = await getUserSafely(supabase);
  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isVendorRoute = pathname.startsWith("/vendor");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute = isDashboardRoute || isVendorRoute || isAdminRoute;

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (isVendorRoute || isAdminRoute || isAuthRoute)) {
    const profileFlags = await getProfileFlagsForMiddleware(
      supabase,
      user,
      request,
      supabaseResponse
    );

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = redirectPathAfterAuth(profileFlags);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isVendorRoute && !profileFlags.is_vendor) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "?notice=vendor_required";
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && !isAdminUser(user, profileFlags)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
