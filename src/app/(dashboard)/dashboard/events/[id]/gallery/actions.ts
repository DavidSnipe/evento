"use server";

import { revalidatePath } from "next/cache";

import { denyUnlessEventAccess } from "@/lib/events/assert-event-access";
import { createClient } from "@/lib/supabase/server";

export type GalleryModerationResult = {
  success?: boolean;
  error?: string;
};

async function removeMediaStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileUrl: string
) {
  const filePath = fileUrl.split("event_media/")[1];
  if (filePath) {
    await supabase.storage.from("event_media").remove([filePath]);
  }
}

export async function approvePhoto(
  eventId: string,
  mediaId: string
): Promise<GalleryModerationResult> {
  const accessDenied = await denyUnlessEventAccess(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("media_uploads")
    .update({ approved: true })
    .eq("id", mediaId)
    .eq("event_id", eventId);

  if (error) {
    console.error("[approvePhoto]", error);
    return { error: "Nu am putut aproba fotografia." };
  }

  revalidatePath(`/dashboard/events/${eventId}/gallery`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function approveAllPhotos(eventId: string): Promise<GalleryModerationResult> {
  const accessDenied = await denyUnlessEventAccess(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("media_uploads")
    .update({ approved: true })
    .eq("event_id", eventId)
    .eq("approved", false);

  if (error) {
    console.error("[approveAllPhotos]", error);
    return { error: "Nu am putut aproba fotografiile." };
  }

  revalidatePath(`/dashboard/events/${eventId}/gallery`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function rejectPhoto(
  eventId: string,
  mediaId: string
): Promise<GalleryModerationResult> {
  const accessDenied = await denyUnlessEventAccess(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();

  const { data: media, error: fetchError } = await supabase
    .from("media_uploads")
    .select("file_url")
    .eq("id", mediaId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (fetchError || !media) {
    return { error: "Nu am putut găsi fișierul." };
  }

  await removeMediaStorage(supabase, media.file_url);

  const { error } = await supabase
    .from("media_uploads")
    .delete()
    .eq("id", mediaId)
    .eq("event_id", eventId);

  if (error) {
    console.error("[rejectPhoto]", error);
    return { error: "Eroare la respingerea fișierului." };
  }

  revalidatePath(`/dashboard/events/${eventId}/gallery`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function rejectAllPendingPhotos(
  eventId: string
): Promise<GalleryModerationResult> {
  const accessDenied = await denyUnlessEventAccess(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();

  const { data: pending, error: fetchError } = await supabase
    .from("media_uploads")
    .select("id, file_url")
    .eq("event_id", eventId)
    .eq("approved", false);

  if (fetchError) {
    console.error("[rejectAllPendingPhotos] fetch", fetchError);
    return { error: "Nu am putut încărca fotografiile în așteptare." };
  }

  for (const item of pending ?? []) {
    await removeMediaStorage(supabase, item.file_url);
  }

  const { error } = await supabase
    .from("media_uploads")
    .delete()
    .eq("event_id", eventId)
    .eq("approved", false);

  if (error) {
    console.error("[rejectAllPendingPhotos] delete", error);
    return { error: "Eroare la ștergerea fotografiilor respinse." };
  }

  revalidatePath(`/dashboard/events/${eventId}/gallery`);
  revalidatePath("/", "layout");
  return { success: true };
}
