"use server";

import { revalidatePath } from "next/cache";

import {
  getPublicEventByRsvpSlug,
  getPublicHouseholdBundle,
  searchPublicHouseholds,
  type PublicHouseholdSearchHit,
} from "@/lib/rsvp/public-queries";
import type { InvitationHouseholdBundle } from "@/types/rsvp";
import { deriveHouseholdInvitationStatus } from "@/lib/rsvp/sync";
import { attendanceToGuestRsvpStatus } from "@/lib/rsvp/sync";
import type { RsvpAttendanceStatus } from "@/types/rsvp";
import { createClient } from "@/lib/supabase/server";

export type PublicRsvpMemberInput = {
  memberId: string;
  attendance_status: RsvpAttendanceStatus;
  attending_civil?: boolean;
  attending_religious?: boolean;
  attending_party?: boolean;
  menu_choice?: string | null;
  allergies?: string | null;
  notes?: string | null;
};

export type PublicRsvpSubmitResult = {
  error?: string;
  success?: boolean;
};

export async function searchPublicRsvpHouseholds(
  rsvpSlug: string,
  query: string
): Promise<{ results: PublicHouseholdSearchHit[]; error?: string }> {
  const event = await getPublicEventByRsvpSlug(rsvpSlug);
  if (!event) return { results: [], error: "Eveniment negăsit." };
  const results = await searchPublicHouseholds(event.id, query);
  return { results };
}

export async function loadPublicRsvpHousehold(
  rsvpSlug: string,
  householdId: string
): Promise<{ bundle: InvitationHouseholdBundle | null; error?: string }> {
  const event = await getPublicEventByRsvpSlug(rsvpSlug);
  if (!event) return { bundle: null, error: "Eveniment negăsit." };
  const bundle = await getPublicHouseholdBundle(event.id, householdId);
  if (!bundle) return { bundle: null, error: "Grup negăsit." };
  return { bundle };
}

export async function submitPublicHouseholdRsvp(
  rsvpSlug: string,
  householdId: string,
  members: PublicRsvpMemberInput[]
): Promise<PublicRsvpSubmitResult> {
  const event = await getPublicEventByRsvpSlug(rsvpSlug);
  if (!event) {
    return { error: "Evenimentul nu a fost găsit." };
  }

  if (event.event_date) {
    const eventDay = new Date(`${event.event_date}T23:59:59`);
    if (eventDay.getTime() < Date.now()) {
      return { error: "Perioada de confirmare s-a încheiat." };
    }
  }

  const bundle = await getPublicHouseholdBundle(event.id, householdId);
  if (!bundle) {
    return { error: "Grupul selectat nu a fost găsit." };
  }

  const memberIds = new Set(bundle.members.map((m) => m.id));
  const supabase = await createClient();

  for (const input of members) {
    if (!memberIds.has(input.memberId)) {
      return { error: "Date invalide pentru acest grup." };
    }

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
      })
      .eq("invitation_member_id", input.memberId);

    if (error) {
      console.error("submitPublicHouseholdRsvp:", error);
      return { error: "Nu am putut salva răspunsul. Încearcă din nou." };
    }

    const member = bundle.members.find((m) => m.id === input.memberId);
    if (member?.guest_id) {
      await supabase
        .from("guests")
        .update({
          rsvp_status: attendanceToGuestRsvpStatus(input.attendance_status),
        })
        .eq("id", member.guest_id);
    }
  }

  const statuses = members.map((m) => m.attendance_status);
  const derived = deriveHouseholdInvitationStatus(statuses);
  const hasResponse = statuses.some((s) => s !== "pending");

  await supabase
    .from("invitation_households")
    .update({
      invitation_status: derived,
      responded_at: hasResponse ? new Date().toISOString() : null,
    })
    .eq("id", householdId);

  revalidatePath(`/rsvp/${rsvpSlug}`);
  revalidatePath(`/dashboard/events/${event.id}/rsvp`);

  return { success: true };
}
