"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearActiveEventId,
  setActiveEventId,
} from "@/lib/events/active-event";
import { assertEventAccess, assertEventPermission } from "@/lib/events/assert-event-access";
import { buildEventTitleFromForm, parseNameFieldsFromFormData } from "@/lib/events/event-title";
import {
  isBaptismType,
  isMajoratType,
  isWeddingType,
  normalizeEventType,
  usesGodparentsSection,
  usesManualTitle,
  usesSmartNameFields,
} from "@/lib/events/event-types";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/types";
import { EVENT_TYPES } from "@/types/events";

export type EventFormState = {
  error?: string;
  success?: boolean;
};

function parseEventType(value: string): EventType | null {
  const normalized = normalizeEventType(value);
  if (normalized && EVENT_TYPES.includes(normalized)) return normalized;
  return null;
}

function shouldSkipRedirect(formData: FormData): boolean {
  return formData.get("skip_redirect") === "true";
}

function buildTitleFromFormData(eventType: EventType, formData: FormData, nameFields: ReturnType<typeof parseNameFieldsFromFormData>): string {
  if (usesSmartNameFields(eventType) || usesManualTitle(eventType)) {
    return buildEventTitleFromForm(eventType, {
      title: String(formData.get("title") ?? "").trim(),
      groomFirstName: nameFields.groom_first_name ?? undefined,
      brideFirstName: nameFields.bride_first_name ?? undefined,
      parent1FirstName: nameFields.parent1_first_name ?? undefined,
      parent2FirstName: nameFields.parent2_first_name ?? undefined,
      parentLastName: nameFields.parent1_last_name ?? undefined,
      childFirstName: nameFields.child_first_name ?? undefined,
    });
  }
  return String(formData.get("title") ?? "").trim();
}

function validateNameFields(eventType: EventType, nameFields: ReturnType<typeof parseNameFieldsFromFormData>): string | null {
  if (isWeddingType(eventType)) {
    if (!nameFields.groom_first_name || !nameFields.groom_last_name) {
      return "Completează numele mirelui.";
    }
    if (!nameFields.bride_first_name || !nameFields.bride_last_name) {
      return "Completează numele miresei.";
    }
  }
  if (isBaptismType(eventType)) {
    if (!nameFields.parent1_first_name || !nameFields.parent2_first_name) {
      return "Completează prenumele părinților.";
    }
    if (!nameFields.parent1_last_name) {
      return "Completează numele de familie.";
    }
    nameFields.parent2_last_name = nameFields.parent1_last_name;
  }
  if (isMajoratType(eventType)) {
    if (!nameFields.groom_first_name) {
      return "Completează prenumele sărbătoritului.";
    }
  }
  if (usesManualTitle(eventType)) {
    return null;
  }
  return null;
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const eventType = parseEventType(String(formData.get("event_type") ?? ""));
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const nameFields = parseNameFieldsFromFormData(formData);
  const skipRedirect = shouldSkipRedirect(formData);

  if (!eventType) return { error: ro.events.errors.typeRequired };
  if (!eventDate) return { error: ro.events.errors.dateRequired };

  const nameError = validateNameFields(eventType, nameFields);
  if (nameError) return { error: nameError };

  let title = buildTitleFromFormData(eventType, formData, nameFields);
  if (usesManualTitle(eventType) && !title) {
    title = String(formData.get("title") ?? "").trim();
  }
  if (!title) return { error: ro.events.errors.titleRequired };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      title,
      event_type: eventType,
      event_date: eventDate,
      venue,
      description,
      ...nameFields,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("relation") || error.code === "42P01") {
      return { error: ro.events.errors.tableMissing };
    }
    return { error: ro.events.errors.saveFailed };
  }

  const hasGodparents = formData.get("has_godparents") === "on";
  const godfatherName = nameFields.godparent1_name ?? "";
  const godmotherName = nameFields.godparent2_name ?? "";
  const syncGodparentsActive =
    usesGodparentsSection(eventType) &&
    hasGodparents &&
    (godfatherName.length > 0 || godmotherName.length > 0);
  await syncGodparents(data.id, syncGodparentsActive, godfatherName, godmotherName);

  await setActiveEventId(data.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");

  if (skipRedirect) {
    return { success: true };
  }

  redirect(`/dashboard/events/${data.id}`);
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const eventType = parseEventType(String(formData.get("event_type") ?? ""));
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const nameFields = parseNameFieldsFromFormData(formData);
  const skipRedirect = shouldSkipRedirect(formData);

  if (!eventType) return { error: ro.events.errors.typeRequired };
  if (!eventDate) return { error: ro.events.errors.dateRequired };

  const nameError = validateNameFields(eventType, nameFields);
  if (nameError) return { error: nameError };

  let title = buildTitleFromFormData(eventType, formData, nameFields);
  if (usesManualTitle(eventType) && !title) {
    title = String(formData.get("title") ?? "").trim();
  }
  if (!title) return { error: ro.events.errors.titleRequired };

  const auth = await assertEventPermission(
    eventId,
    (p) => p.canDeleteEvent,
    "canDeleteEvent"
  );
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      title,
      event_type: eventType,
      event_date: eventDate,
      venue,
      description,
      ...nameFields,
    })
    .eq("id", eventId);

  if (error) {
    return { error: ro.events.errors.saveFailed };
  }

  const hasGodparents = formData.get("has_godparents") === "on";
  const godfatherName = nameFields.godparent1_name ?? "";
  const godmotherName = nameFields.godparent2_name ?? "";
  await syncGodparents(
    eventId,
    usesGodparentsSection(eventType) && hasGodparents,
    godfatherName,
    godmotherName
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);

  if (skipRedirect) {
    return { success: true };
  }

  redirect(`/dashboard/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const auth = await assertEventPermission(
    eventId,
    (p) => p.canDeleteEvent,
    "canDeleteEvent"
  );
  if (!auth.ok) {
    redirect(`/dashboard/events?error=access`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) {
    redirect(`/dashboard/events/${eventId}?error=delete`);
  }

  await clearActiveEventId();
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function setActiveEvent(eventId: string) {
  const auth = await assertEventAccess(eventId);
  if (!auth.ok) {
    redirect("/dashboard/events");
  }

  await setActiveEventId(eventId);
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${eventId}`);
}

async function syncGodparents(
  eventId: string,
  active: boolean,
  godfatherName: string,
  godmotherName: string
) {
  const supabase = await createClient();

  const { data: existingGuests } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventId);

  const godparents = existingGuests?.filter(g => g.tags?.includes("godparents")) ?? [];
  const existingGodfather = godparents.find(g => !g.parent_id);
  const existingGodmother = godparents.find(g => g.parent_id);

  if (!active) {
    if (godparents.length > 0) {
      await supabase
        .from("guests")
        .delete()
        .in("id", godparents.map(g => g.id));
    }
    return;
  }

  const gfName = godfatherName.trim();
  const gmName = godmotherName.trim();

  function splitName(name: string): [string, string] {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return ["", ""];
    if (parts.length === 1) return [parts[0], ""];
    return [parts.slice(1).join(" "), parts[0]];
  }

  let gfId: string | undefined = existingGodfather?.id;

  if (gfName) {
    const [gfFirst, gfLast] = splitName(gfName);
    if (existingGodfather) {
      await supabase
        .from("guests")
        .update({
          first_name: gfFirst,
          last_name: gfLast || null,
          tags: Array.from(new Set([...(existingGodfather.tags ?? []), "godparents", "vip"]))
        })
        .eq("id", existingGodfather.id);
    } else {
      const { data: newGf } = await supabase
        .from("guests")
        .insert({
          event_id: eventId,
          first_name: gfFirst,
          last_name: gfLast || null,
          rsvp_status: "accepted",
          tags: ["godparents", "vip"],
          relationship_type: "guest"
        })
        .select("id")
        .single();
      gfId = newGf?.id;
    }
  } else if (existingGodfather) {
    await supabase.from("guests").delete().eq("id", existingGodfather.id);
    gfId = undefined;
  }

  if (gmName && (gfId || existingGodfather?.id)) {
    const targetGfId = gfId || existingGodfather!.id;
    const [gmFirst, gmLast] = splitName(gmName);
    if (existingGodmother) {
      await supabase
        .from("guests")
        .update({
          parent_id: targetGfId,
          first_name: gmFirst,
          last_name: gmLast || null,
          tags: Array.from(new Set([...(existingGodmother.tags ?? []), "godparents", "vip"])),
          relationship_type: "couple"
        })
        .eq("id", existingGodmother.id);
    } else {
      await supabase
        .from("guests")
        .insert({
          event_id: eventId,
          parent_id: targetGfId,
          first_name: gmFirst,
          last_name: gmLast || null,
          rsvp_status: "accepted",
          tags: ["godparents", "vip"],
          relationship_type: "couple"
        });
    }
  } else if (existingGodmother) {
    await supabase.from("guests").delete().eq("id", existingGodmother.id);
  }
}
