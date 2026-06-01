const DEFAULT_TIMEZONE = "Europe/Bucharest";

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

/** Fold lines per RFC 5545 (75 octets). */
export function foldIcsLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, max));
  rest = rest.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

export function icsNowUtc(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}
