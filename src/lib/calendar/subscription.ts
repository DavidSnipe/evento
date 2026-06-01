/** Build HTTPS and webcal subscription URLs for an event feed. */
export function buildCalendarSubscriptionUrls(
  siteUrl: string,
  eventId: string,
  token: string
): { httpsUrl: string; webcalUrl: string } {
  const base = siteUrl.replace(/\/$/, "");
  const httpsUrl = `${base}/calendar/${eventId}/${token}.ics`;
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");
  return { httpsUrl, webcalUrl };
}

export function parseSubscriptionTokenParam(raw: string): string {
  return raw.endsWith(".ics") ? raw.slice(0, -4) : raw;
}

/** Basic UUID v4 format check for feed tokens. */
export function isValidSubscriptionToken(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    token
  );
}

/** Hook point for future rate limiting (IP + eventId). */
export function calendarFeedRateLimitKey(eventId: string, clientIp: string | null): string {
  return `calendar-feed:${eventId}:${clientIp ?? "unknown"}`;
}
