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
