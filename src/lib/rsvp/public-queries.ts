import { createClient } from "@/lib/supabase/server";
import { getHouseholdBundlesByEvent } from "@/lib/rsvp/queries";
import { getPublicInvitationViewBySlug } from "@/lib/invitation/queries";
import { matchRank } from "@/lib/rsvp/fuzzy-search";
import type { PublicInvitationView } from "@/lib/invitation/resolve-invitation";
import type { InvitationHouseholdBundle } from "@/types/rsvp";
import type { EventType } from "@/types";

export type { PublicInvitationView as PublicInvitationContent };

export type PublicRsvpEvent = {
  id: string;
  title: string;
  event_type: EventType;
  rsvp_slug: string;
  event_date: string | null;
  venue: string | null;
  description: string | null;
};

export type PublicHouseholdSearchHit = {
  householdId: string;
  displayName: string;
  memberPreview: string;
  memberCount: number;
  /** Lower = better match */
  rank: number;
};

export async function getPublicEventByRsvpSlug(
  slug: string
): Promise<PublicRsvpEvent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_type, rsvp_slug, event_date, venue, description")
    .eq("rsvp_slug", slug)
    .maybeSingle();

  if (error || !data?.rsvp_slug) {
    if (error) console.error("getPublicEventByRsvpSlug:", error);
    return null;
  }

  return data as PublicRsvpEvent;
}

export async function getPublicInvitationByRsvpSlug(
  slug: string
): Promise<PublicInvitationView | null> {
  return getPublicInvitationViewBySlug(slug);
}

function memberPreviewLine(members: { display_name: string }[]): string {
  if (members.length === 0) return "";
  const names = members.slice(0, 3).map((m) => m.display_name);
  if (members.length > 3) {
    return `${names.join(", ")} +${members.length - 3}`;
  }
  return names.join(", ");
}

export async function searchPublicHouseholds(
  eventId: string,
  query: string
): Promise<PublicHouseholdSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const bundles = await getHouseholdBundlesByEvent(eventId);
  const hits: PublicHouseholdSearchHit[] = [];

  for (const household of bundles) {
    let rank = matchRank(household.display_name, q);

    for (const member of household.members) {
      rank = Math.min(rank, matchRank(member.display_name, q));
    }

    if (rank < 99) {
      hits.push({
        householdId: household.id,
        displayName: household.display_name,
        memberPreview: memberPreviewLine(household.members),
        memberCount: household.members.length,
        rank,
      });
    }
  }

  return hits
    .sort((a, b) => a.rank - b.rank || a.displayName.localeCompare(b.displayName))
    .slice(0, 12);
}

export async function getPublicHouseholdBundle(
  eventId: string,
  householdId: string
): Promise<InvitationHouseholdBundle | null> {
  const bundles = await getHouseholdBundlesByEvent(eventId);
  return bundles.find((b) => b.id === householdId) ?? null;
}

export type RsvpOverviewStats = {
  householdCount: number;
  memberCount: number;
  confirmed: number;
  declined: number;
  maybe: number;
  pending: number;
  partialHouseholds: number;
};

export async function getRsvpOverviewStats(
  eventId: string
): Promise<RsvpOverviewStats> {
  const bundles = await getHouseholdBundlesByEvent(eventId);
  let memberCount = 0;
  let confirmed = 0;
  let declined = 0;
  let maybe = 0;
  let pending = 0;
  let partialHouseholds = 0;

  for (const h of bundles) {
    let answered = 0;
    for (const m of h.members) {
      memberCount++;
      const s = m.rsvp_response?.attendance_status ?? "pending";
      if (s === "confirmed") confirmed++;
      else if (s === "declined") declined++;
      else if (s === "maybe") maybe++;
      else pending++;
      if (s !== "pending") answered++;
    }
    if (h.members.length > 0 && answered > 0 && answered < h.members.length) {
      partialHouseholds++;
    }
  }

  return {
    householdCount: bundles.length,
    memberCount,
    confirmed,
    declined,
    maybe,
    pending,
    partialHouseholds,
  };
}
