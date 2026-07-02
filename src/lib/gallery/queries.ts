import { createClient } from "@/lib/supabase/server";
import type { MediaUpload } from "@/types/gallery";

export async function getEventGalleryInfo(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("qr_slug, title")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Error fetching event gallery info:", error);
    return null;
  }

  return data;
}

export async function getMediaUploads(eventId: string): Promise<MediaUpload[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media_uploads")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching media uploads:", error);
    return [];
  }

  return data;
}

export async function getPendingGalleryCount(eventId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("media_uploads")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("approved", false);

  if (error) {
    console.error("[getPendingGalleryCount]", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getApprovedMediaUploads(eventId: string): Promise<MediaUpload[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media_uploads")
    .select("*")
    .eq("event_id", eventId)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching approved media:", error);
    return [];
  }

  return data;
}

// Public query using slug
export async function getEventBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .eq("qr_slug", slug)
    .single();

  if (error) {
    return null;
  }

  return data;
}
