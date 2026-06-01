import { createClient } from "@/lib/supabase/server";
import type {
  InvitationHouseholdBundle,
  InvitationHouseholdRow,
  InvitationMemberRow,
  InvitationMemberWithResponse,
  RsvpResponseRow,
  RsvpUnitRow,
  SeatingGroupRow,
} from "@/types/rsvp";

function sortByOrder<T extends { sort_order: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

export async function getHouseholdsByEvent(
  eventId: string
): Promise<InvitationHouseholdRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitation_households")
    .select("*")
    .eq("event_id", eventId)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("getHouseholdsByEvent:", error);
    return [];
  }
  return (data ?? []) as InvitationHouseholdRow[];
}

export async function getHouseholdById(
  householdId: string
): Promise<InvitationHouseholdRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitation_households")
    .select("*")
    .eq("id", householdId)
    .maybeSingle();

  if (error) {
    console.error("getHouseholdById:", error);
    return null;
  }
  return (data as InvitationHouseholdRow | null) ?? null;
}

/** For future public RSVP page — token is the only public identifier. */
export async function getHouseholdByInviteToken(
  inviteToken: string
): Promise<InvitationHouseholdRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitation_households")
    .select("*")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (error) {
    console.error("getHouseholdByInviteToken:", error);
    return null;
  }
  return (data as InvitationHouseholdRow | null) ?? null;
}

export async function getHouseholdBundle(
  householdId: string
): Promise<InvitationHouseholdBundle | null> {
  const supabase = await createClient();

  const { data: household, error: householdError } = await supabase
    .from("invitation_households")
    .select("*")
    .eq("id", householdId)
    .maybeSingle();

  if (householdError || !household) {
    if (householdError) console.error("getHouseholdBundle household:", householdError);
    return null;
  }

  const [membersRes, unitsRes, groupsRes] = await Promise.all([
    supabase
      .from("invitation_members")
      .select(
        `
        *,
        rsvp_response:rsvp_responses (*),
        guest:guests (id, first_name, last_name, rsvp_status, table_id, parent_id)
      `
      )
      .eq("household_id", householdId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("rsvp_units")
      .select("*")
      .eq("household_id", householdId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("seating_groups")
      .select("*")
      .eq("household_id", householdId)
      .order("sort_order", { ascending: true }),
  ]);

  if (membersRes.error) {
    console.error("getHouseholdBundle members:", membersRes.error);
    return null;
  }

  const members: InvitationMemberWithResponse[] = (membersRes.data ?? []).map(
    (row) => {
      const typed = row as InvitationMemberRow & {
        rsvp_response: RsvpResponseRow | RsvpResponseRow[] | null;
        guest: InvitationMemberWithResponse["guest"] | InvitationMemberWithResponse["guest"][];
      };
      const response = Array.isArray(typed.rsvp_response)
        ? typed.rsvp_response[0] ?? null
        : typed.rsvp_response;
      const guest = Array.isArray(typed.guest) ? typed.guest[0] ?? null : typed.guest;
      return {
        ...typed,
        rsvp_response: response,
        guest,
      };
    }
  );

  return {
    ...(household as InvitationHouseholdRow),
    members,
    rsvp_units: sortByOrder((unitsRes.data ?? []) as RsvpUnitRow[]),
    seating_groups: sortByOrder((groupsRes.data ?? []) as SeatingGroupRow[]),
  };
}

export async function getHouseholdBundlesByEvent(
  eventId: string
): Promise<InvitationHouseholdBundle[]> {
  const households = await getHouseholdsByEvent(eventId);
  const bundles = await Promise.all(
    households.map((h) => getHouseholdBundle(h.id))
  );
  return bundles.filter((b): b is InvitationHouseholdBundle => b !== null);
}
