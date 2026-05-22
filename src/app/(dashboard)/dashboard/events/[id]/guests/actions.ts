"use server";

import { revalidatePath } from "next/cache";

import { requireEvent } from "@/lib/events/verify-event";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import { RSVP_STATUSES } from "@/types/guests";
import type { RsvpStatus, GuestRow } from "@/types/guests";

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

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts.slice(1).join(" "), parts[0]];
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
  const last_name = String(formData.get("last_name") ?? "").trim() || null;

  const supabase = await createClient();
  const { data: primaryGuest, error } = await supabase
    .from("guests")
    .insert({
      event_id: eventId,
      first_name,
      last_name,
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
    .select("id, last_name, rsvp_status")
    .single();

  if (error) {
    if (error.message.includes("relation") || error.code === "42P01") {
      return { error: ro.guests.errors.tablesMissing };
    }
    return { error: ro.guests.errors.saveFailed };
  }

  // Relational sub-guest creation for couple partner
  if (primaryGuest && formData.get("plus_one") === "on") {
    const plusOneName = String(formData.get("plus_one_name") ?? "").trim();
    if (plusOneName) {
      const [pFirst, pLast] = splitName(plusOneName);
      await supabase.from("guests").insert({
        event_id: eventId,
        parent_id: primaryGuest.id,
        first_name: pFirst || "Partener",
        last_name: pLast || primaryGuest.last_name || null,
        rsvp_status: primaryGuest.rsvp_status,
        relationship_type: "couple",
        table_id,
      });
    }
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
  const last_name = String(formData.get("last_name") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("guests")
    .update({
      first_name,
      last_name,
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

  // Relational sub-guest sync for couple partner
  if (formData.get("plus_one") === "on") {
    const plusOneName = String(formData.get("plus_one_name") ?? "").trim();
    if (plusOneName) {
      const [pFirst, pLast] = splitName(plusOneName);
      const { data: existingCouple } = await supabase
        .from("guests")
        .select("id")
        .eq("parent_id", guestId)
        .eq("relationship_type", "couple")
        .maybeSingle();

      if (existingCouple) {
        await supabase
          .from("guests")
          .update({
            first_name: pFirst || "Partener",
            last_name: pLast || last_name,
            table_id,
            rsvp_status,
          })
          .eq("id", existingCouple.id);
      } else {
        await supabase.from("guests").insert({
          event_id: eventId,
          parent_id: guestId,
          first_name: pFirst || "Partener",
          last_name: pLast || last_name,
          rsvp_status,
          relationship_type: "couple",
          table_id,
        });
      }
    }
  } else {
    // Delete any sub-guests of type 'couple'
    await supabase
      .from("guests")
      .delete()
      .eq("parent_id", guestId)
      .eq("relationship_type", "couple");
  }

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

export async function bulkCreateGuests(
  eventId: string,
  guests: {
    firstName: string;
    lastName?: string;
    plusOneName?: string;
    groupName?: string;
    tags?: string[];
    phone?: string;
    email?: string;
    rsvpStatus?: RsvpStatus;
    tableId?: string;
  }[]
): Promise<{ error?: string; count?: number; insertedIds?: string[] }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const rows = guests.map((g) => ({
    event_id: eventId,
    first_name: g.firstName,
    last_name: g.lastName || null,
    plus_one: !!g.plusOneName,
    plus_one_name: g.plusOneName || null,
    group_name: g.groupName || null,
    tags: g.tags || [],
    rsvp_status: g.rsvpStatus || "pending",
    phone: g.phone || null,
    email: g.email || null,
    table_id: g.tableId || null,
  }));

  const { data, error } = await supabase.from("guests").insert(rows).select("id");
  if (error) return { error: ro.guests.errors.saveFailed };

  revalidateGuestPages(eventId);
  return { count: rows.length, insertedIds: data?.map((d) => d.id) || [] };
}

export async function bulkDeleteGuests(
  eventId: string,
  guestIds: string[]
): Promise<{ error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("event_id", eventId)
    .in("id", guestIds);

  if (error) return { error: ro.guests.errors.deleteFailed };

  revalidateGuestPages(eventId);
  return {};
}

export async function bulkUpdateRsvp(
  eventId: string,
  guestIds: string[],
  rsvpStatus: RsvpStatus
): Promise<{ error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("guests")
    .update({ rsvp_status: rsvpStatus })
    .eq("event_id", eventId)
    .in("id", guestIds);

  if (error) return { error: ro.guests.errors.saveFailed };

  revalidateGuestPages(eventId);
  return {};
}

export async function bulkAssignTable(
  eventId: string,
  guestIds: string[],
  tableId: string | null
): Promise<{ error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("guests")
    .update({ table_id: tableId })
    .eq("event_id", eventId)
    .in("id", guestIds);

  if (error) return { error: ro.seating.errors.assignFailed };

  revalidateGuestPages(eventId);
  return {};
}

export async function updateGuestTags(
  eventId: string,
  guestId: string,
  tags: string[]
): Promise<{ error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("guests")
    .update({ tags })
    .eq("id", guestId)
    .eq("event_id", eventId);

  if (error) return { error: ro.guests.errors.saveFailed };

  revalidateGuestPages(eventId);
  return {};
}

export async function updateGuestField(
  eventId: string,
  guestId: string,
  field: string,
  value: string | boolean | null
): Promise<{ error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("guests")
    .update({ [field]: value })
    .eq("id", guestId)
    .eq("event_id", eventId);

  if (error) return { error: ro.guests.errors.saveFailed };

  revalidateGuestPages(eventId);
  return {};
}

export async function createSubGuest(
  eventId: string,
  parentId: string,
  relationshipType: "couple" | "family" | "child"
): Promise<{ error?: string; subGuest?: GuestRow }> {
  await requireEvent(eventId);
  const supabase = await createClient();
  
  // Get parent guest to inherit last name, RSVP status, table, etc.
  const { data: parent } = await supabase
    .from("guests")
    .select("last_name, rsvp_status, table_id")
    .eq("id", parentId)
    .single();

  const { data: newSub, error } = await supabase
    .from("guests")
    .insert({
      event_id: eventId,
      parent_id: parentId,
      first_name: relationshipType === "couple" ? "Partener" : "Membru",
      last_name: parent?.last_name || null,
      rsvp_status: parent?.rsvp_status || "pending",
      relationship_type: relationshipType,
      table_id: parent?.table_id || null,
    })
    .select("*")
    .single();

  if (error) return { error: ro.guests.errors.saveFailed };

  revalidateGuestPages(eventId);
  return { subGuest: newSub };
}

export async function deleteSubGuest(eventId: string, subGuestId: string): Promise<{ error?: string }> {
  await requireEvent(eventId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("id", subGuestId)
    .eq("event_id", eventId);

  if (error) return { error: ro.guests.errors.deleteFailed };

  revalidateGuestPages(eventId);
  return {};
}
