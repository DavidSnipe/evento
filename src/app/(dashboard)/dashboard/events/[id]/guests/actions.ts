"use server";

import { revalidatePath } from "next/cache";

import { requireEvent } from "@/lib/events/verify-event";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import { RSVP_STATUSES } from "@/types/guests";
import type { RsvpStatus } from "@/types/guests";

export type GuestFormState = { error?: string; success?: string };

function parseRsvp(value: string): RsvpStatus | null {
  return RSVP_STATUSES.includes(value as RsvpStatus) ? (value as RsvpStatus) : null;
}

function guestPaths(eventId: string) {
  return {
    guests: `/dashboard/events/${eventId}/guests`,
    seating: `/dashboard/events/${eventId}/seating`,
    event: `/dashboard/events/${eventId}`,
  };
}

function revalidateGuestPages(eventId: string) {
  const p = guestPaths(eventId);
  revalidatePath(p.guests);
  revalidatePath(p.seating);
  revalidatePath(p.event);
  revalidatePath("/dashboard");
}

export async function createGuest(
  eventId: string,
  _prev: GuestFormState,
  formData: FormData
): Promise<GuestFormState> {
  await requireEvent(eventId);

  const first_name = String(formData.get("first_name") ?? "").trim();
  if (!first_name) return { error: ro.guests.errors.firstNameRequired };

  const rsvp_status = parseRsvp(String(formData.get("rsvp_status") ?? "pending")) ?? "pending";
  const table_id = String(formData.get("table_id") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("guests").insert({
    event_id: eventId,
    first_name,
    last_name: String(formData.get("last_name") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    rsvp_status,
    plus_one: formData.get("plus_one") === "on",
    plus_one_name: String(formData.get("plus_one_name") ?? "").trim() || null,
    group_name: String(formData.get("group_name") ?? "").trim() || null,
    dietary_notes: String(formData.get("dietary_notes") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    table_id,
    seat_label: String(formData.get("seat_label") ?? "").trim() || null,
  });

  if (error) {
    if (error.message.includes("relation") || error.code === "42P01") {
      return { error: ro.guests.errors.tablesMissing };
    }
    return { error: ro.guests.errors.saveFailed };
  }

  revalidateGuestPages(eventId);
  return { success: "ok" };
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  _prev: GuestFormState,
  formData: FormData
): Promise<GuestFormState> {
  await requireEvent(eventId);

  const first_name = String(formData.get("first_name") ?? "").trim();
  if (!first_name) return { error: ro.guests.errors.firstNameRequired };

  const rsvp_status = parseRsvp(String(formData.get("rsvp_status") ?? "pending")) ?? "pending";
  const table_id = String(formData.get("table_id") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("guests")
    .update({
      first_name,
      last_name: String(formData.get("last_name") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      rsvp_status,
      plus_one: formData.get("plus_one") === "on",
      plus_one_name: String(formData.get("plus_one_name") ?? "").trim() || null,
      group_name: String(formData.get("group_name") ?? "").trim() || null,
      dietary_notes: String(formData.get("dietary_notes") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      table_id,
      seat_label: String(formData.get("seat_label") ?? "").trim() || null,
    })
    .eq("id", guestId)
    .eq("event_id", eventId);

  if (error) return { error: ro.guests.errors.saveFailed };

  revalidateGuestPages(eventId);
  return { success: "ok" };
}

export async function deleteGuest(eventId: string, guestId: string) {
  await requireEvent(eventId);
  const supabase = await createClient();
  await supabase.from("guests").delete().eq("id", guestId).eq("event_id", eventId);
  revalidateGuestPages(eventId);
}

export async function updateGuestRsvp(
  eventId: string,
  guestId: string,
  rsvpStatus: RsvpStatus
) {
  await requireEvent(eventId);
  const supabase = await createClient();
  await supabase
    .from("guests")
    .update({ rsvp_status: rsvpStatus })
    .eq("id", guestId)
    .eq("event_id", eventId);
  revalidateGuestPages(eventId);
}

export async function assignGuestToTable(
  eventId: string,
  guestId: string,
  tableId: string | null
) {
  await requireEvent(eventId);
  const supabase = await createClient();

  if (tableId) {
    const { data: table } = await supabase
      .from("seating_tables")
      .select("capacity")
      .eq("id", tableId)
      .eq("event_id", eventId)
      .single();

    if (!table) return { error: ro.seating.errors.assignFailed };

    const { data: tableGuests } = await supabase
      .from("guests")
      .select("id, plus_one")
      .eq("table_id", tableId)
      .neq("id", guestId);

    const { data: guest } = await supabase
      .from("guests")
      .select("plus_one")
      .eq("id", guestId)
      .single();

    const occupied =
      (tableGuests ?? []).reduce((s, g) => s + 1 + (g.plus_one ? 1 : 0), 0) +
      1 +
      (guest?.plus_one ? 1 : 0);

    if (occupied > table.capacity) {
      return { error: ro.seating.errors.tableFull };
    }
  }

  const { error } = await supabase
    .from("guests")
    .update({ table_id: tableId })
    .eq("id", guestId)
    .eq("event_id", eventId);

  if (error) return { error: ro.seating.errors.assignFailed };

  revalidateGuestPages(eventId);
  return { success: true };
}
