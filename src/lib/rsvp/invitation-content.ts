import { formatEventDate } from "@/lib/events/utils";
import type { EventType } from "@/types";

export type PublicScheduleItem = {
  time: string | null;
  label: string;
  location: string | null;
};

export type PublicInvitationContent = {
  eventId: string;
  eventType: EventType;
  title: string;
  coupleNames: string | null;
  invitationText: string | null;
  dateFormatted: string | null;
  dateIso: string | null;
  venue: string | null;
  schedule: PublicScheduleItem[];
  dressCode: string | null;
  parentsLine: string | null;
  godparentsLine: string | null;
  showCeremonyToggles: boolean;
};

type GuestSnippet = {
  id: string;
  first_name: string;
  last_name: string | null;
  parent_id: string | null;
  relationship_type: string | null;
  tags: string[] | null;
};

function personName(g: GuestSnippet): string {
  return g.last_name ? `${g.first_name} ${g.last_name}` : g.first_name;
}

function parseCoupleFromTitle(title: string): string | null {
  const patterns = [/\s+&\s+/, /\s+și\s+/i, /\s+si\s+/i];
  for (const p of patterns) {
    if (p.test(title)) {
      const parts = title.split(p).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(0, 2).join(" & ");
      }
    }
  }
  return null;
}

function deriveCoupleNames(
  title: string,
  guests: GuestSnippet[]
): string | null {
  const fromTitle = parseCoupleFromTitle(title);
  if (fromTitle) return fromTitle;

  const primaries = guests.filter((g) => !g.parent_id);

  for (const p of primaries) {
    const partner = guests.find(
      (g) => g.parent_id === p.id && g.relationship_type === "couple"
    );
    if (partner) {
      return `${personName(p)} & ${personName(partner)}`;
    }
  }

  const hosts = primaries.filter(
    (g) => g.tags?.includes("vip") || !g.relationship_type
  );
  if (hosts.length >= 2) {
    return `${personName(hosts[0])} & ${personName(hosts[1])}`;
  }
  if (hosts.length === 1) return personName(hosts[0]);

  return title.trim() || null;
}

const TIME_LINE =
  /^(\d{1,2}[:.]\d{2})\s*[-–—]?\s*(.+)$/;

function parseDescriptionSections(description: string | null): {
  invitationText: string | null;
  schedule: PublicScheduleItem[];
  dressCode: string | null;
  parentsLine: string | null;
} {
  if (!description?.trim()) {
    return { invitationText: null, schedule: [], dressCode: null, parentsLine: null };
  }

  const lines = description.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const schedule: PublicScheduleItem[] = [];
  const body: string[] = [];
  let dressCode: string | null = null;
  let parentsLine: string | null = null;

  for (const line of lines) {
    const timeMatch = line.match(TIME_LINE);
    if (timeMatch) {
      schedule.push({
        time: timeMatch[1].replace(".", ":"),
        label: timeMatch[2].trim(),
        location: null,
      });
      continue;
    }
    if (/^(ținută|tinuta|dress code|cod vestimentar)/i.test(line)) {
      dressCode = line.replace(/^[^:]+:\s*/i, "").trim() || line;
      continue;
    }
    if (/^(părinți|parinti|parents)/i.test(line)) {
      parentsLine = line.replace(/^[^:]+:\s*/i, "").trim() || line;
      continue;
    }
    body.push(line);
  }

  return {
    invitationText: body.length > 0 ? body.join("\n\n") : description.trim(),
    schedule,
    dressCode,
    parentsLine,
  };
}

function defaultWeddingSchedule(venue: string | null): PublicScheduleItem[] {
  return [
    { time: null, label: "Cununie religioasă", location: venue },
    { time: null, label: "Petrecere", location: venue },
  ];
}

function deriveGodparentsLine(guests: GuestSnippet[]): string | null {
  const godparents = guests.filter((g) => g.tags?.includes("godparents"));
  if (godparents.length === 0) return null;
  const godfather = godparents.find((g) => !g.parent_id);
  const godmother = godfather
    ? godparents.find((g) => g.parent_id === godfather.id)
    : godparents.find((g) => g.parent_id);
  const parts: string[] = [];
  if (godfather) parts.push(personName(godfather));
  if (godmother) parts.push(personName(godmother));
  return parts.length > 0 ? parts.join(" & ") : null;
}

export function buildPublicInvitationContent(
  event: {
    id: string;
    title: string;
    event_type: EventType;
    event_date: string | null;
    venue: string | null;
    description: string | null;
  },
  guests: GuestSnippet[]
): PublicInvitationContent {
  const parsed = parseDescriptionSections(event.description);
  const coupleNames = deriveCoupleNames(event.title, guests);
  const godparentsLine = deriveGodparentsLine(guests);

  let schedule = parsed.schedule;
  if (schedule.length === 0 && event.event_type === "wedding") {
    schedule = defaultWeddingSchedule(event.venue);
  }

  return {
    eventId: event.id,
    eventType: event.event_type,
    title: event.title,
    coupleNames,
    invitationText: parsed.invitationText,
    dateFormatted: formatEventDate(event.event_date),
    dateIso: event.event_date,
    venue: event.venue,
    schedule,
    dressCode: parsed.dressCode,
    parentsLine: parsed.parentsLine,
    godparentsLine,
    showCeremonyToggles: event.event_type === "wedding",
  };
}
