"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearActiveEventId,
  setActiveEventId,
} from "@/lib/events/active-event";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/types/events";
import type { EventType } from "@/types";

export type EventFormState = {
  error?: string;
};

function parseEventType(value: string): EventType | null {
  return EVENT_TYPES.includes(value as EventType) ? (value as EventType) : null;
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const eventType = parseEventType(String(formData.get("event_type") ?? ""));
  const eventDate = String(formData.get("event_date") ?? "").trim() || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) return { error: ro.events.errors.titleRequired };
  if (!eventType) return { error: ro.events.errors.typeRequired };

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
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("relation") || error.code === "42P01") {
      return { error: ro.events.errors.tableMissing };
    }
    return { error: ro.events.errors.saveFailed };
  }

  await setActiveEventId(data.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  redirect(`/dashboard/events/${data.id}`);
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const eventType = parseEventType(String(formData.get("event_type") ?? ""));
  const eventDate = String(formData.get("event_date") ?? "").trim() || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) return { error: ro.events.errors.titleRequired };
  if (!eventType) return { error: ro.events.errors.typeRequired };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      title,
      event_type: eventType,
      event_date: eventDate,
      venue,
      description,
    })
    .eq("id", eventId);

  if (error) {
    return { error: ro.events.errors.saveFailed };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
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
  await setActiveEventId(eventId);
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${eventId}`);
}
