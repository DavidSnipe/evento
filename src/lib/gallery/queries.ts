import { createClient } from "@/lib/supabase/server";
import type { MediaUpload, PublicGalleryPhoto } from "@/types/gallery";

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

  return (data ?? []).map((row) => ({
    ...row,
    is_favorite: row.is_favorite ?? false,
  }));
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

  return (data ?? []).map((row) => ({
    ...row,
    is_favorite: row.is_favorite ?? false,
  }));
}

// Public query using slug
export async function getEventBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_date")
    .eq("qr_slug", slug)
    .single();

  if (error) {
    return null;
  }

  return data;
}

async function getEventIdByQrSlug(qrSlug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("qr_slug", qrSlug)
    .maybeSingle();

  if (error || !data) {
    console.error("[getEventIdByQrSlug]", error?.message);
    return null;
  }

  return data.id;
}

export async function getPublicApprovedPhotos(qrSlug: string): Promise<PublicGalleryPhoto[]> {
  const eventId = await getEventIdByQrSlug(qrSlug);
  if (!eventId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_uploads")
    .select("id, file_url, file_type, created_at, uploaded_by")
    .eq("event_id", eventId)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPublicApprovedPhotos]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    url: row.file_url,
    thumbnail_url: row.file_url,
    file_type: row.file_type as "image" | "video",
    created_at: row.created_at,
    uploader_name: row.uploaded_by,
  }));
}

export async function getPublicPhotoCount(qrSlug: string): Promise<number> {
  const eventId = await getEventIdByQrSlug(qrSlug);
  if (!eventId) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("media_uploads")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("approved", true);

  if (error) {
    console.error("[getPublicPhotoCount]", error.message);
    return 0;
  }

  return count ?? 0;
}
