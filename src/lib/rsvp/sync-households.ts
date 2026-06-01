import { createClient } from "@/lib/supabase/server";
import { generateInviteToken } from "@/lib/rsvp/token";

type GuestRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  parent_id: string | null;
  group_name: string | null;
  relationship_type: string | null;
};

function guestDisplayName(g: GuestRow): string {
  return g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
}

/**
 * Build RSVP households from the guest list.
 * Groups by group_name when set; otherwise one household per primary guest (+ children).
 * Skips guests already linked to a household.
 */
export async function syncHouseholdsFromGuests(
  eventId: string
): Promise<{ created: number; linked: number; error?: string }> {
  const supabase = await createClient();

  const { data: guests, error: guestsError } = await supabase
    .from("guests")
    .select("id, first_name, last_name, parent_id, group_name, relationship_type")
    .eq("event_id", eventId);

  if (guestsError) {
    console.error("syncHouseholdsFromGuests guests:", guestsError);
    return { created: 0, linked: 0, error: "Nu am putut citi lista de invitați." };
  }

  const all = (guests ?? []) as GuestRow[];
  const byId = new Map(all.map((g) => [g.id, g]));

  const { data: existingMembers } = await supabase
    .from("invitation_members")
    .select("guest_id")
    .not("guest_id", "is", null);

  const linkedIds = new Set(
    (existingMembers ?? []).map((m) => m.guest_id).filter(Boolean) as string[]
  );

  const unlinked = all.filter((g) => !linkedIds.has(g.id));
  if (unlinked.length === 0) {
    return { created: 0, linked: 0 };
  }

  type Bucket = { label: string; guestIds: Set<string> };
  const buckets = new Map<string, Bucket>();

  const addToBucket = (key: string, label: string, guestId: string) => {
    const b = buckets.get(key) ?? { label, guestIds: new Set() };
    b.guestIds.add(guestId);
    buckets.set(key, b);
  };

  for (const g of unlinked) {
    if (g.parent_id) continue;
    const groupLabel = g.group_name?.trim();
    if (groupLabel) {
      addToBucket(`g:${groupLabel.toLowerCase()}`, groupLabel, g.id);
    } else {
      addToBucket(`p:${g.id}`, guestDisplayName(g), g.id);
    }
  }

  for (const g of unlinked) {
    if (!g.parent_id) continue;
    const parent = byId.get(g.parent_id);
    if (!parent || linkedIds.has(g.parent_id)) {
      addToBucket(`solo:${g.id}`, guestDisplayName(g), g.id);
      continue;
    }
    const groupLabel = parent.group_name?.trim();
    const key = groupLabel
      ? `g:${groupLabel.toLowerCase()}`
      : `p:${parent.id}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.guestIds.add(g.id);
    } else {
      addToBucket(`solo:${g.id}`, guestDisplayName(g), g.id);
    }
  }

  let created = 0;
  let linked = 0;

  for (const bucket of buckets.values()) {
    const guestIds = [...bucket.guestIds];
    if (guestIds.length === 0) continue;

    const { data: household, error: hError } = await supabase
      .from("invitation_households")
      .insert({
        event_id: eventId,
        invite_token: generateInviteToken(),
        display_name: bucket.label,
        invitation_status: "draft",
      })
      .select("id")
      .single();

    if (hError || !household) {
      console.error("syncHouseholdsFromGuests household:", hError);
      continue;
    }

    created++;

    await supabase.from("rsvp_units").insert({
      household_id: household.id,
      display_name: bucket.label,
      sort_order: 0,
    });

    const { data: seatingGroup } = await supabase
      .from("seating_groups")
      .insert({
        household_id: household.id,
        display_name: "Împreună",
        locked_together: true,
        sort_order: 0,
      })
      .select("id")
      .single();

    let order = 0;
    for (const guestId of guestIds) {
      const guest = byId.get(guestId);
      if (!guest) continue;

      const memberType =
        guest.relationship_type === "child" ? "child" : "adult";

      const { error: mError } = await supabase.from("invitation_members").insert({
        household_id: household.id,
        guest_id: guestId,
        display_name: guestDisplayName(guest),
        member_type: memberType,
        seating_group_id: seatingGroup?.id ?? null,
        sort_order: order++,
      });

      if (!mError) linked++;
    }
  }

  return { created, linked };
}
