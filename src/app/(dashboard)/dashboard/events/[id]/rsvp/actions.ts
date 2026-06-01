"use server";

import { revalidatePath } from "next/cache";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import {
  attendanceToGuestRsvpStatus,
  deriveHouseholdInvitationStatus,
} from "@/lib/rsvp/sync";
import { generateRsvpSlug } from "@/lib/rsvp/event-slug";
import { generateInviteToken } from "@/lib/rsvp/token";
import { syncHouseholdsFromGuests } from "@/lib/rsvp/sync-households";
import {
  getHouseholdById,
  getHouseholdBundle,
} from "@/lib/rsvp/queries";
import {
  parseAttendanceStatus,
  parseInvitationStatus,
  parseMemberType,
  parseOptionalPositiveInt,
  requireDisplayName,
  type RsvpActionResult,
} from "@/lib/rsvp/validation";
import { createClient } from "@/lib/supabase/server";
import type { InvitationMemberType, RsvpAttendanceStatus } from "@/types/rsvp";

function rsvpPaths(eventId: string) {
  return {
    rsvp: `/dashboard/events/${eventId}/rsvp`,
    guests: `/dashboard/events/${eventId}/guests`,
    event: `/dashboard/events/${eventId}`,
  };
}

function revalidateRsvpPages(eventId: string, rsvpSlug?: string | null) {
  const p = rsvpPaths(eventId);
  revalidatePath(p.rsvp);
  revalidatePath(p.guests);
  revalidatePath(p.event);
  if (rsvpSlug) revalidatePath(`/rsvp/${rsvpSlug}`);
}

async function assertHouseholdBelongsToEvent(
  eventId: string,
  householdId: string
) {
  const household = await getHouseholdById(householdId);
  if (!household || household.event_id !== eventId) {
    return { error: "Grupul RSVP nu a fost găsit." } as const;
  }
  return { household } as const;
}

async function refreshHouseholdStatus(householdId: string) {
  const bundle = await getHouseholdBundle(householdId);
  if (!bundle) return;

  const statuses = bundle.members.map(
    (m) => m.rsvp_response?.attendance_status ?? "pending"
  );
  const derived = deriveHouseholdInvitationStatus(statuses);
  const hasResponse = statuses.some((s) => s !== "pending");

  const supabase = await createClient();
  await supabase
    .from("invitation_households")
    .update({
      invitation_status: derived,
      responded_at: hasResponse ? new Date().toISOString() : null,
    })
    .eq("id", householdId);
}

async function syncGuestRsvpFromMember(
  memberId: string,
  attendanceStatus: RsvpAttendanceStatus
) {
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("invitation_members")
    .select("guest_id, household_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!member?.guest_id) return;

  await supabase
    .from("guests")
    .update({ rsvp_status: attendanceToGuestRsvpStatus(attendanceStatus) })
    .eq("id", member.guest_id);
}

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export async function createInvitationHousehold(
  eventId: string,
  _prev: RsvpActionResult,
  formData: FormData
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;

  const displayName = requireDisplayName(String(formData.get("display_name") ?? ""));
  if (!displayName) return { error: "Numele grupului este obligatoriu." };

  const maxSeatsRaw = String(formData.get("max_seats") ?? "");
  const max_seats = parseOptionalPositiveInt(maxSeatsRaw);
  if (maxSeatsRaw.trim() && max_seats === null) {
    return { error: "Numărul maxim de locuri trebuie să fie un număr pozitiv." };
  }

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const invite_token = generateInviteToken();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitation_households")
    .insert({
      event_id: eventId,
      invite_token,
      display_name: displayName,
      max_seats,
      notes,
      invitation_status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    console.error("createInvitationHousehold:", error);
    return { error: "Nu am putut crea grupul RSVP." };
  }

  const defaultUnitName =
    String(formData.get("default_rsvp_unit_name") ?? "").trim() || displayName;
  await supabase.from("rsvp_units").insert({
    household_id: data.id,
    display_name: defaultUnitName,
    sort_order: 0,
  });

  const defaultGroupName =
    String(formData.get("default_seating_group_name") ?? "").trim() ||
    "Împreună";
  await supabase.from("seating_groups").insert({
    household_id: data.id,
    display_name: defaultGroupName,
    locked_together: true,
    sort_order: 0,
  });

  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

export async function updateInvitationHousehold(
  eventId: string,
  householdId: string,
  _prev: RsvpActionResult,
  formData: FormData
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const check = await assertHouseholdBelongsToEvent(eventId, householdId);
  if ("error" in check) return check;

  const displayName = requireDisplayName(String(formData.get("display_name") ?? ""));
  if (!displayName) return { error: "Numele grupului este obligatoriu." };

  const statusRaw = String(formData.get("invitation_status") ?? "");
  const invitation_status =
    parseInvitationStatus(statusRaw) ?? check.household.invitation_status;

  const maxSeatsRaw = String(formData.get("max_seats") ?? "");
  const max_seats = parseOptionalPositiveInt(maxSeatsRaw);
  if (maxSeatsRaw.trim() && max_seats === null) {
    return { error: "Numărul maxim de locuri trebuie să fie un număr pozitiv." };
  }

  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitation_households")
    .update({
      display_name: displayName,
      invitation_status,
      max_seats,
      notes,
    })
    .eq("id", householdId);

  if (error) {
    console.error("updateInvitationHousehold:", error);
    return { error: "Nu am putut actualiza grupul RSVP." };
  }

  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

export async function deleteInvitationHousehold(
  eventId: string,
  householdId: string
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const check = await assertHouseholdBelongsToEvent(eventId, householdId);
  if ("error" in check) return check;

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitation_households")
    .delete()
    .eq("id", householdId);

  if (error) {
    console.error("deleteInvitationHousehold:", error);
    return { error: "Nu am putut șterge grupul RSVP." };
  }

  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

export async function regenerateHouseholdInviteToken(
  eventId: string,
  householdId: string
): Promise<RsvpActionResult & { invite_token?: string }> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const check = await assertHouseholdBelongsToEvent(eventId, householdId);
  if ("error" in check) return check;

  const invite_token = generateInviteToken();
  const supabase = await createClient();
  const { error } = await supabase
    .from("invitation_households")
    .update({ invite_token })
    .eq("id", householdId);

  if (error) {
    console.error("regenerateHouseholdInviteToken:", error);
    return { error: "Nu am putut regenera link-ul." };
  }

  revalidateRsvpPages(eventId);
  return { success: "ok", invite_token };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function addGuestToHousehold(
  eventId: string,
  householdId: string,
  guestId: string,
  options?: {
    memberType?: InvitationMemberType;
    rsvpUnitId?: string | null;
    seatingGroupId?: string | null;
    sortOrder?: number;
  }
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const check = await assertHouseholdBelongsToEvent(eventId, householdId);
  if ("error" in check) return check;

  const supabase = await createClient();
  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id, event_id, first_name, last_name, rsvp_status")
    .eq("id", guestId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (guestError || !guest) {
    return { error: "Invitatul nu a fost găsit." };
  }

  const { data: existing } = await supabase
    .from("invitation_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (existing) {
    return { error: "Acest invitat face deja parte dintr-un grup RSVP." };
  }

  const displayName = guest.last_name
    ? `${guest.first_name} ${guest.last_name}`
    : guest.first_name;

  const memberType = options?.memberType ?? "adult";

  const { data: member, error } = await supabase
    .from("invitation_members")
    .insert({
      household_id: householdId,
      guest_id: guestId,
      display_name: displayName,
      member_type: memberType,
      rsvp_unit_id: options?.rsvpUnitId ?? null,
      seating_group_id: options?.seatingGroupId ?? null,
      sort_order: options?.sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error || !member) {
    console.error("addGuestToHousehold:", error);
    return { error: "Nu am putut adăuga invitatul la grup." };
  }

  await supabase
    .from("rsvp_responses")
    .update({ attendance_status: guest.rsvp_status })
    .eq("invitation_member_id", member.id);

  await refreshHouseholdStatus(householdId);
  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

export async function addPlaceholderMember(
  eventId: string,
  householdId: string,
  _prev: RsvpActionResult,
  formData: FormData
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const check = await assertHouseholdBelongsToEvent(eventId, householdId);
  if ("error" in check) return check;

  const displayName = requireDisplayName(String(formData.get("display_name") ?? ""));
  if (!displayName) return { error: "Numele este obligatoriu." };

  const memberType =
    parseMemberType(String(formData.get("member_type") ?? "placeholder")) ??
    "placeholder";

  const supabase = await createClient();
  const { error } = await supabase.from("invitation_members").insert({
    household_id: householdId,
    guest_id: null,
    display_name: displayName,
    member_type: memberType,
    rsvp_unit_id: String(formData.get("rsvp_unit_id") ?? "").trim() || null,
    seating_group_id:
      String(formData.get("seating_group_id") ?? "").trim() || null,
    sort_order: Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
  });

  if (error) {
    console.error("addPlaceholderMember:", error);
    return { error: "Nu am putut adăuga locul rezervat." };
  }

  await refreshHouseholdStatus(householdId);
  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

export async function updateInvitationMember(
  eventId: string,
  memberId: string,
  _prev: RsvpActionResult,
  formData: FormData
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("invitation_members")
    .select("id, household_id, guest_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) return { error: "Membrul grupului nu a fost găsit." };

  const check = await assertHouseholdBelongsToEvent(eventId, member.household_id);
  if ("error" in check) return check;

  const displayName = requireDisplayName(String(formData.get("display_name") ?? ""));
  if (!displayName) return { error: "Numele este obligatoriu." };

  const member_type =
    parseMemberType(String(formData.get("member_type") ?? "adult")) ?? "adult";

  const { error } = await supabase
    .from("invitation_members")
    .update({
      display_name: displayName,
      member_type,
      rsvp_unit_id: String(formData.get("rsvp_unit_id") ?? "").trim() || null,
      seating_group_id:
        String(formData.get("seating_group_id") ?? "").trim() || null,
      sort_order: Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
    })
    .eq("id", memberId);

  if (error) {
    console.error("updateInvitationMember:", error);
    return { error: "Nu am putut actualiza membrul." };
  }

  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

export async function removeInvitationMember(
  eventId: string,
  memberId: string
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("invitation_members")
    .select("household_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) return { error: "Membrul grupului nu a fost găsit." };

  const check = await assertHouseholdBelongsToEvent(eventId, member.household_id);
  if ("error" in check) return check;

  const { error } = await supabase
    .from("invitation_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("removeInvitationMember:", error);
    return { error: "Nu am putut elimina membrul." };
  }

  await refreshHouseholdStatus(member.household_id);
  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

// ---------------------------------------------------------------------------
// RSVP units & seating groups
// ---------------------------------------------------------------------------

export async function createRsvpUnit(
  eventId: string,
  householdId: string,
  _prev: RsvpActionResult,
  formData: FormData
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const check = await assertHouseholdBelongsToEvent(eventId, householdId);
  if ("error" in check) return check;

  const displayName = requireDisplayName(String(formData.get("display_name") ?? ""));
  if (!displayName) return { error: "Numele unității RSVP este obligatoriu." };

  const supabase = await createClient();
  const { error } = await supabase.from("rsvp_units").insert({
    household_id: householdId,
    display_name: displayName,
    sort_order: Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
  });

  if (error) {
    console.error("createRsvpUnit:", error);
    return { error: "Nu am putut crea unitatea RSVP." };
  }

  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

export async function createSeatingGroup(
  eventId: string,
  householdId: string,
  _prev: RsvpActionResult,
  formData: FormData
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const check = await assertHouseholdBelongsToEvent(eventId, householdId);
  if ("error" in check) return check;

  const displayName = requireDisplayName(String(formData.get("display_name") ?? ""));
  if (!displayName) return { error: "Numele grupului este obligatoriu." };

  const supabase = await createClient();
  const { error } = await supabase.from("seating_groups").insert({
    household_id: householdId,
    display_name: displayName,
    locked_together: formData.get("locked_together") !== "off",
    sort_order: Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
  });

  if (error) {
    console.error("createSeatingGroup:", error);
    return { error: "Nu am putut crea grupul de așezare." };
  }

  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

// ---------------------------------------------------------------------------
// RSVP responses (per member — supports partial household answers)
// ---------------------------------------------------------------------------

export type RsvpResponseInput = {
  attendance_status: RsvpAttendanceStatus;
  attending_civil?: boolean;
  attending_religious?: boolean;
  attending_party?: boolean;
  menu_choice?: string | null;
  allergies?: string | null;
  notes?: string | null;
  preferred_seating_notes?: string | null;
};

export async function upsertMemberRsvpResponse(
  eventId: string,
  memberId: string,
  input: RsvpResponseInput
): Promise<RsvpActionResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("invitation_members")
    .select("id, household_id, guest_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) return { error: "Membrul grupului nu a fost găsit." };

  const check = await assertHouseholdBelongsToEvent(eventId, member.household_id);
  if ("error" in check) return check;

  const { error } = await supabase
    .from("rsvp_responses")
    .update({
      attendance_status: input.attendance_status,
      attending_civil: input.attending_civil ?? false,
      attending_religious: input.attending_religious ?? false,
      attending_party: input.attending_party ?? false,
      menu_choice: input.menu_choice?.trim() || null,
      allergies: input.allergies?.trim() || null,
      notes: input.notes?.trim() || null,
      preferred_seating_notes: input.preferred_seating_notes?.trim() || null,
    })
    .eq("invitation_member_id", memberId);

  if (error) {
    console.error("upsertMemberRsvpResponse:", error);
    return { error: "Nu am putut salva răspunsul RSVP." };
  }

  await syncGuestRsvpFromMember(memberId, input.attendance_status);
  await refreshHouseholdStatus(member.household_id);
  revalidateRsvpPages(eventId);
  return { success: "ok" };
}

/** Organizer bulk update from form (one member at a time). */
export async function updateMemberRsvpFromForm(
  eventId: string,
  memberId: string,
  _prev: RsvpActionResult,
  formData: FormData
): Promise<RsvpActionResult> {
  const attendance_status =
    parseAttendanceStatus(String(formData.get("attendance_status") ?? "pending")) ??
    "pending";

  return upsertMemberRsvpResponse(eventId, memberId, {
    attendance_status,
    attending_civil: formData.get("attending_civil") === "on",
    attending_religious: formData.get("attending_religious") === "on",
    attending_party: formData.get("attending_party") === "on",
    menu_choice: String(formData.get("menu_choice") ?? ""),
    allergies: String(formData.get("allergies") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    preferred_seating_notes: String(formData.get("preferred_seating_notes") ?? ""),
  });
}

// ---------------------------------------------------------------------------
// MVP: one public link per event
// ---------------------------------------------------------------------------

export async function generateEventRsvpSlug(
  eventId: string
): Promise<{ error?: string; slug?: string }> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;

  const slug = generateRsvpSlug();
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ rsvp_slug: slug })
    .eq("id", eventId);

  if (error) {
    console.error("generateEventRsvpSlug:", error);
    return { error: "Nu am putut activa link-ul public RSVP." };
  }

  revalidateRsvpPages(eventId, slug);
  return { slug };
}

export async function syncGuestsToRsvpGroups(
  eventId: string
): Promise<{ error?: string; created?: number; linked?: number }> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditRsvp, "canEditRsvp");
  if (accessDenied) return accessDenied;
  const result = await syncHouseholdsFromGuests(eventId);
  if (result.error) return { error: result.error };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("rsvp_slug")
    .eq("id", eventId)
    .maybeSingle();

  revalidateRsvpPages(eventId, event?.rsvp_slug);
  return { created: result.created, linked: result.linked };
}
