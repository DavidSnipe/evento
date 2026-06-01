const DEFAULT_TIMEZONE = "Europe/Bucharest";

/** Fixed TZ for live subscription feeds (must match VTIMEZONE in ICS). */
export const SUBSCRIPTION_FEED_TIMEZONE = DEFAULT_TIMEZONE;

export function resolveTimezone(preferred?: string): string {
  if (preferred) return preferred;
  if (typeof Intl !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  }
  return DEFAULT_TIMEZONE;
}

export function formatIcsDate(date: string): string {
  return date.replace(/-/g, "");
}

/** Normalize HH:mm or HH:mm:ss to HHmmss */
export function normalizeTimeToIcs(time: string): string {
  const parts = time.trim().split(":");
  const h = parts[0]?.padStart(2, "0") ?? "00";
  const m = parts[1]?.padStart(2, "0") ?? "00";
  const s = parts[2]?.padStart(2, "0") ?? "00";
  return `${h}${m}${s}`;
}

export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addHoursToDateTime(
  date: string,
  time: string,
  hours: number
): { date: string; time: string } {
  const d = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`);
  d.setHours(d.getHours() + hours);
  const iso = d.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
  };
}

export function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u00C0-\u024F]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "eveniment"
  );
}

export function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Fold lines per RFC 5545 (75 octets, not UTF-16 code units). */
export function foldIcsLine(line: string): string {
  const maxOctets = 75;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= maxOctets) return line;

  const lines: string[] = [];
  let pos = 0;
  while (pos < bytes.length) {
    const isContinuation = pos > 0;
    const limit = isContinuation ? maxOctets - 1 : maxOctets;
    let end = Math.min(pos + limit, bytes.length);

    while (end > pos && end < bytes.length) {
      const slice = bytes.subarray(pos, end);
      if (encoder.encode(decoder.decode(slice)).length === slice.length) break;
      end--;
    }

    const piece = decoder.decode(bytes.subarray(pos, end));
    lines.push(isContinuation ? ` ${piece}` : piece);
    pos = end;
  }
  return lines.join("\r\n");
}

export function icsNowUtc(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}
