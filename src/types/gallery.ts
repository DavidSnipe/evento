export type MediaUpload = {
  id: string;
  event_id: string;
  file_url: string;
  file_type: "image" | "video";
  mime_type: string | null;
  size: number | null;
  uploaded_by: string | null;
  approved: boolean;
  is_favorite: boolean;
  created_at: string;
};

/** Public gallery — approved photos only, minimal guest-facing fields */
export type PublicGalleryPhoto = {
  id: string;
  url: string;
  thumbnail_url: string | null;
  file_type: "image" | "video";
  created_at: string;
  uploader_name: string | null;
};
