import { createClient } from "@/lib/supabase/server";
import { rowToBuilderState } from "@/lib/invitation/defaults";
import {
  checkInvitationTableReady,
  formatSupabaseError,
  isInvitationStorageUnavailable,
} from "@/lib/invitation/storage";
import { resolvePublicInvitationView } from "@/lib/invitation/resolve-invitation";
import { buildPublicInvitationContent } from "@/lib/rsvp/invitation-content";
import { defaultsToDraftFromEvent } from "@/lib/invitation/seed-content";
import type { EventInvitationRow, InvitationBuilderState } from "@/types/invitation";

export { checkInvitationTableReady };

export async function getEventInvitationRow(
  eventId: string
): Promise<EventInvitationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_invitations")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    if (isInvitationStorageUnavailable(error)) return null;
    console.error("getEventInvitationRow:", formatSupabaseError(error));
    return null;
  }

  if (!data) return null;

  return {
    event_id: data.event_id,
    template_slug: data.template_slug,
    content: (data.content ?? {}) as EventInvitationRow["content"],
    sections: (data.sections ?? {}) as EventInvitationRow["sections"],
    theme: (data.theme ?? {}) as EventInvitationRow["theme"],
    cover_image_url: data.cover_image_url,
    gallery_image_urls: (data.gallery_image_urls ?? []) as string[],
    updated_at: data.updated_at,
  };
}

export async function getInvitationBuilderState(
  eventId: string
): Promise<InvitationBuilderState | null> {
  const supabase = await createClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, event_type, event_date, venue, description")
    .eq("id", eventId)
    .single();

  if (eventError || !event) return null;

  const { data: guests } = await supabase
    .from("guests")
    .select("id, first_name, last_name, parent_id, relationship_type, tags")
    .eq("event_id", eventId);

  const base = buildPublicInvitationContent(event, guests ?? []);
  const defaultDraft = defaultsToDraftFromEvent(base, event.title);
  const row = await getEventInvitationRow(eventId);

  return rowToBuilderState(row, defaultDraft);
}

export async function getPublicInvitationViewBySlug(slug: string) {
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, event_type, rsvp_slug, event_date, venue, description")
    .eq("rsvp_slug", slug)
    .maybeSingle();

  if (error || !event?.rsvp_slug) return null;

  const [{ data: guests }, invitationRow] = await Promise.all([
    supabase
      .from("guests")
      .select("id, first_name, last_name, parent_id, relationship_type, tags")
      .eq("event_id", event.id),
    getEventInvitationRow(event.id),
  ]);

  return resolvePublicInvitationView(event, guests ?? [], invitationRow);
}
