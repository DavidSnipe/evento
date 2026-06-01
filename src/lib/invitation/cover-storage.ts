const EVENT_MEDIA_BUCKET = "event_media";
const INVITATION_COVER_FOLDER = "invitation-covers";
const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_COVER_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export { EVENT_MEDIA_BUCKET, MAX_COVER_BYTES };

/** Build storage path: `{eventId}/invitation-covers/{uuid}.{ext}` */
export function buildInvitationCoverStoragePath(
  eventId: string,
  fileName: string,
  mimeType: string
): string {
  const ext = resolveCoverExtension(fileName, mimeType);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${eventId}/${INVITATION_COVER_FOLDER}/${id}.${ext}`;
}

export function resolveCoverExtension(fileName: string, mimeType: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}

export function validateCoverFile(file: File): string | null {
  if (!file.size) return "Fișierul este gol.";
  if (file.size > MAX_COVER_BYTES) return "Imaginea depășește 8 MB.";
  if (!file.type.startsWith("image/")) return "Doar imagini sunt permise.";
  if (!ALLOWED_COVER_MIME.has(file.type)) {
    return "Format neacceptat. Folosește JPG, PNG sau WebP.";
  }
  return null;
}

/** Extract object path from Supabase public/signed URL. */
export function extractEventMediaPath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  try {
    const url = new URL(publicUrl);
    const publicMarker = `/storage/v1/object/public/${EVENT_MEDIA_BUCKET}/`;
    const signedMarker = `/storage/v1/object/sign/${EVENT_MEDIA_BUCKET}/`;
    const authMarker = `/storage/v1/object/authenticated/${EVENT_MEDIA_BUCKET}/`;

    for (const marker of [publicMarker, signedMarker, authMarker]) {
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(
          url.pathname.slice(idx + marker.length).split("?")[0]
        );
      }
    }

    const legacyMarker = `${EVENT_MEDIA_BUCKET}/`;
    const legacyIdx = publicUrl.indexOf(legacyMarker);
    if (legacyIdx !== -1) {
      return decodeURIComponent(
        publicUrl.slice(legacyIdx + legacyMarker.length).split("?")[0]
      );
    }
  } catch {
    return null;
  }
  return null;
}

export function isInvitationCoverPath(path: string): boolean {
  return (
    path.includes(`/${INVITATION_COVER_FOLDER}/`) ||
    path.includes("/invitation_cover_")
  );
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export function getPublicUrlForStoragePath(
  supabase: StorageClient,
  path: string
): string {
  const { data } = supabase.storage.from(EVENT_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
