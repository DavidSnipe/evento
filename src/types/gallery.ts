export type MediaUpload = {
  id: string;
  event_id: string;
  file_url: string;
  file_type: "image" | "video";
  mime_type: string | null;
  size: number | null;
  uploaded_by: string | null;
  approved: boolean;
  created_at: string;
};
