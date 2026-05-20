"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function generateQrSlug(eventId: string) {
  const supabase = await createClient();

  // Generate a random slug
  const slug = crypto.randomBytes(4).toString("hex");

  const { error } = await supabase
    .from("events")
    .update({ qr_slug: slug })
    .eq("id", eventId);

  if (error) {
    console.error("Error generating qr slug:", error);
    return { error: "Nu am putut genera codul QR." };
  }

  revalidatePath(`/dashboard/events/${eventId}/gallery`);
  return { success: true, slug };
}

export async function deleteMedia(eventId: string, mediaId: string) {
  const supabase = await createClient();

  // First get the media to find the file URL
  const { data: media, error: fetchError } = await supabase
    .from("media_uploads")
    .select("file_url")
    .eq("id", mediaId)
    .single();

  if (fetchError || !media) {
    return { error: "Nu am putut găsi fișierul." };
  }

  // Delete from storage
  const filePath = media.file_url.split("event_media/")[1];
  if (filePath) {
    await supabase.storage.from("event_media").remove([filePath]);
  }

  // Delete from DB
  const { error } = await supabase
    .from("media_uploads")
    .delete()
    .eq("id", mediaId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error deleting media:", error);
    return { error: "Eroare la ștergerea fișierului." };
  }

  revalidatePath(`/dashboard/events/${eventId}/gallery`);
  return { success: true };
}
