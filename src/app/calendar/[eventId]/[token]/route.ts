import { NextResponse } from "next/server";

import {
  buildSubscriptionFeedIcs,
  subscriptionFeedEtag,
} from "@/lib/calendar/feed";
import { fetchCalendarSubscriptionPayload } from "@/lib/calendar/subscription-queries";
import {
  calendarFeedRateLimitKey,
  isValidSubscriptionToken,
  parseSubscriptionTokenParam,
} from "@/lib/calendar/subscription";

type CalendarFeedRouteContext = {
  params: Promise<{ eventId: string; token: string }>;
};

export async function GET(
  request: Request,
  context: CalendarFeedRouteContext
): Promise<NextResponse> {
  const { eventId, token: rawToken } = await context.params;
  const token = parseSubscriptionTokenParam(rawToken);

  if (!isValidSubscriptionToken(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");
  void calendarFeedRateLimitKey(eventId, clientIp);

  const payload = await fetchCalendarSubscriptionPayload(eventId, token);
  if (!payload) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = buildSubscriptionFeedIcs(payload);
  const etag = subscriptionFeedEtag(content);

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="evento-${sanitizeFilename(payload.event.title)}.ics"`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      ETag: etag,
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "calendar";
}

export async function HEAD(
  request: Request,
  context: CalendarFeedRouteContext
): Promise<NextResponse> {
  const response = await GET(request, context);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
