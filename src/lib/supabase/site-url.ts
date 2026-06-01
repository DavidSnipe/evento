import { headers } from "next/headers";

/** Base URL for auth redirects and public calendar subscription links */
export async function getSiteUrl(): Promise<string> {
  const headersList = await headers();
  const forwardedHost = headersList.get("x-forwarded-host");
  const host =
    forwardedHost?.split(",")[0]?.trim() || headersList.get("host")?.trim();
  const proto =
    headersList.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    return `${proto}://${host}`;
  }

  const origin = headersList.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
