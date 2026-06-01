"use server";

import { revalidatePath } from "next/cache";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import {
  buildInvitationCoverStoragePath,
  EVENT_MEDIA_BUCKET,
  extractEventMediaPath,
  getPublicUrlForStoragePath,
  isInvitationCoverPath,
  validateCoverFile,
} from "@/lib/invitation/cover-storage";
import { createClient } from "@/lib/supabase/server";
import {
  formatSupabaseError,
  isInvitationStorageUnavailable,
} from "@/lib/invitation/storage";
import {
  parseColorPreset,
  parseFontPreset,
  parseInvitationTemplateSlug,
} from "@/lib/invitation/templates/registry";
import type {
  InvitationBuilderState,
  InvitationContentDraft,
  InvitationSections,
  InvitationTheme,
} from "@/types/invitation";

export type InvitationSaveResult = {
  error?: string;
  success?: boolean;
  updatedAt?: string;
  coverImageUrl?: string | null;
};

async function getRsvpSlug(eventId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("rsvp_slug")
    .eq("id", eventId)
    .single();
  return data?.rsvp_slug ?? null;
}

function revalidateInvitationPages(eventId: string, rsvpSlug: string | null) {
  revalidatePath(`/dashboard/events/${eventId}/rsvp`);
  revalidatePath(`/dashboard/events/${eventId}/rsvp/invitation`);
  if (rsvpSlug) revalidatePath(`/rsvp/${rsvpSlug}`);
}

async function getExistingCoverUrl(eventId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_invitations")
    .select("cover_image_url")
    .eq("event_id", eventId)
    .maybeSingle();
  return data?.cover_image_url ?? null;
}

async function deleteCoverFromStorage(publicUrl: string | null): Promise<void> {
  if (!publicUrl) return;
  const path = extractEventMediaPath(publicUrl);
  if (!path || !isInvitationCoverPath(path)) return;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(EVENT_MEDIA_BUCKET).remove([path]);
  if (error) {
    console.warn("deleteCoverFromStorage:", formatSupabaseError(error));
  }
}

async function persistCoverUrl(
  eventId: string,
  coverImageUrl: string | null
): Promise<InvitationSaveResult> {
  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("event_invitations")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (readError && isInvitationStorageUnavailable(readError)) {
    return {
      error:
        "Rulează migrarea 011_event_invitations.sql în Supabase (SQL Editor), apoi reîncarcă pagina.",
    };
  }

  if (existing) {
    const { error } = await supabase
      .from("event_invitations")
      .update({ cover_image_url: coverImageUrl })
      .eq("event_id", eventId);

    if (error) {
      console.error("persistCoverUrl update:", formatSupabaseError(error));
      return { error: "Nu am putut salva imaginea de copertă." };
    }
  } else {
    const { error } = await supabase.from("event_invitations").insert({
      event_id: eventId,
      cover_image_url: coverImageUrl,
    });

    if (error) {
      if (isInvitationStorageUnavailable(error)) {
        return {
          error:
            "Rulează migrarea 011_event_invitations.sql în Supabase (SQL Editor), apoi reîncarcă pagina.",
        };
      }
      console.error("persistCoverUrl insert:", formatSupabaseError(error));
      return { error: "Nu am putut salva imaginea de copertă." };
    }
  }

  const rsvpSlug = await getRsvpSlug(eventId);
  revalidateInvitationPages(eventId, rsvpSlug);

  return { success: true, coverImageUrl };
}

/** Upload cover via server (authenticated) — persists URL in event_invitations. */
export async function uploadInvitationCover(
  eventId: string,
  formData: FormData
): Promise<InvitationSaveResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditInvitation, "canEditInvitation");
  if (accessDenied) return accessDenied;

  const file = formData.get("cover");
  if (!(file instanceof File)) {
    return { error: "Selectează o imagine." };
  }

  const validationError = validateCoverFile(file);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const previousUrl = await getExistingCoverUrl(eventId);
  const storagePath = buildInvitationCoverStoragePath(
    eventId,
    file.name,
    file.type
  );

  const { error: uploadError } = await supabase.storage
    .from(EVENT_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("uploadInvitationCover storage:", formatSupabaseError(uploadError));
    return {
      error:
        "Nu am putut încărca imaginea. Verifică migrarea 012_storage_event_media_policies.sql.",
    };
  }

  const publicUrl = getPublicUrlForStoragePath(supabase, storagePath);
  const saveResult = await persistCoverUrl(eventId, publicUrl);

  if (saveResult.error) {
    await supabase.storage.from(EVENT_MEDIA_BUCKET).remove([storagePath]);
    return saveResult;
  }

  if (previousUrl && previousUrl !== publicUrl) {
    await deleteCoverFromStorage(previousUrl);
  }

  return { success: true, coverImageUrl: publicUrl };
}

/** Remove cover from DB and delete storage object when safe. */
export async function removeInvitationCover(
  eventId: string
): Promise<InvitationSaveResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditInvitation, "canEditInvitation");
  if (accessDenied) return accessDenied;

  const previousUrl = await getExistingCoverUrl(eventId);
  const saveResult = await persistCoverUrl(eventId, null);

  if (saveResult.error) return saveResult;

  await deleteCoverFromStorage(previousUrl);
  return { success: true, coverImageUrl: null };
}

export async function saveEventInvitation(
  eventId: string,
  state: InvitationBuilderState
): Promise<InvitationSaveResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditInvitation, "canEditInvitation");
  if (accessDenied) return accessDenied;
  const supabase = await createClient();

  const templateSlug = parseInvitationTemplateSlug(state.templateSlug);
  const theme: InvitationTheme = {
    fontPreset: parseFontPreset(state.theme.fontPreset),
    colorPreset: parseColorPreset(state.theme.colorPreset),
  };

  const payload = {
    event_id: eventId,
    template_slug: templateSlug,
    content: state.content,
    sections: state.sections,
    theme,
    cover_image_url: state.coverImageUrl,
    gallery_image_urls: state.galleryImageUrls,
  };

  const { data, error } = await supabase
    .from("event_invitations")
    .upsert(payload, { onConflict: "event_id" })
    .select("updated_at")
    .single();

  if (error) {
    if (isInvitationStorageUnavailable(error)) {
      return {
        error:
          "Rulează migrarea 011_event_invitations.sql în Supabase (SQL Editor), apoi reîncarcă pagina.",
      };
    }
    console.error("saveEventInvitation:", formatSupabaseError(error));
    return { error: "Nu am putut salva invitația." };
  }

  const rsvpSlug = await getRsvpSlug(eventId);
  revalidateInvitationPages(eventId, rsvpSlug);

  return { success: true, updatedAt: data.updated_at };
}

/** @deprecated Use uploadInvitationCover / removeInvitationCover */
export async function updateInvitationCoverUrl(
  eventId: string,
  coverImageUrl: string | null
): Promise<InvitationSaveResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditInvitation, "canEditInvitation");
  if (accessDenied) return accessDenied;
  if (coverImageUrl === null) {
    return removeInvitationCover(eventId);
  }
  return persistCoverUrl(eventId, coverImageUrl);
}

export async function updateInvitationGalleryUrls(
  eventId: string,
  galleryImageUrls: string[]
): Promise<InvitationSaveResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditInvitation, "canEditInvitation");
  if (accessDenied) return accessDenied;
  const supabase = await createClient();

  const { error } = await supabase.from("event_invitations").upsert(
    {
      event_id: eventId,
      gallery_image_urls: galleryImageUrls,
    },
    { onConflict: "event_id" }
  );

  if (error) {
    console.error("updateInvitationGalleryUrls:", error);
    return { error: "Nu am putut actualiza galeria." };
  }

  const rsvpSlug = await getRsvpSlug(eventId);
  revalidateInvitationPages(eventId, rsvpSlug);
  return { success: true };
}

/** Partial content patch for auto-save */
export async function patchEventInvitationContent(
  eventId: string,
  patch: {
    templateSlug?: InvitationBuilderState["templateSlug"];
    content?: Partial<InvitationContentDraft>;
    sections?: Partial<InvitationSections>;
    theme?: Partial<InvitationTheme>;
  }
): Promise<InvitationSaveResult> {
  const accessDenied = await denyUnlessEventPermission(eventId, (p) => p.canEditInvitation, "canEditInvitation");
  if (accessDenied) return accessDenied;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("event_invitations")
    .select("template_slug, content, sections, theme")
    .eq("event_id", eventId)
    .maybeSingle();

  const payload = {
    event_id: eventId,
    template_slug: patch.templateSlug
      ? parseInvitationTemplateSlug(patch.templateSlug)
      : parseInvitationTemplateSlug(existing?.template_slug),
    content: { ...(existing?.content ?? {}), ...(patch.content ?? {}) },
    sections: { ...(existing?.sections ?? {}), ...(patch.sections ?? {}) },
    theme: { ...(existing?.theme ?? {}), ...(patch.theme ?? {}) },
  };

  const { data, error } = await supabase
    .from("event_invitations")
    .upsert(payload, { onConflict: "event_id" })
    .select("updated_at")
    .single();

  if (error) {
    if (isInvitationStorageUnavailable(error)) {
      return { error: "Rulează migrarea 011_event_invitations.sql în Supabase." };
    }
    console.error("patchEventInvitationContent:", formatSupabaseError(error));
    return { error: "Nu am putut salva." };
  }

  const rsvpSlug = await getRsvpSlug(eventId);
  revalidateInvitationPages(eventId, rsvpSlug);

  return { success: true, updatedAt: data.updated_at };
}
