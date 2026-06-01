import type { PublicScheduleItem } from "@/lib/rsvp/invitation-content";

/** Built-in template slugs — extend registry in lib/invitation/templates/registry.ts */
export type InvitationTemplateSlug =
  | "elegant"
  | "minimal"
  | "luxury"
  | "floral"
  | "modern";

export type InvitationFontPreset = "serif" | "sans" | "script";

export type InvitationColorPreset =
  | "rose"
  | "sage"
  | "gold"
  | "slate"
  | "blush";

export type InvitationTheme = {
  fontPreset: InvitationFontPreset;
  colorPreset: InvitationColorPreset;
};

export type ScheduleItemKind = "civil" | "religious" | "party" | "other";

export type InvitationScheduleItem = PublicScheduleItem & {
  kind?: ScheduleItemKind;
};

export type InvitationContentDraft = {
  coupleNames: string | null;
  parentsLine: string | null;
  godparentsLine: string | null;
  invitationText: string | null;
  closingMessage: string | null;
  eventTitle: string | null;
  dateIso: string | null;
  venue: string | null;
  dressCode: string | null;
  accommodationInfo: string | null;
  transportInfo: string | null;
  additionalNotes: string | null;
  schedule: InvitationScheduleItem[];
};

export type InvitationSections = {
  invitationText: boolean;
  coupleNames: boolean;
  parents: boolean;
  godparents: boolean;
  date: boolean;
  schedule: boolean;
  venue: boolean;
  civilCeremony: boolean;
  religiousCeremony: boolean;
  party: boolean;
  dressCode: boolean;
  accommodation: boolean;
  transport: boolean;
  additionalNotes: boolean;
  gallery: boolean;
  closingMessage: boolean;
  rsvpCta: boolean;
};

export type EventInvitationRow = {
  event_id: string;
  template_slug: InvitationTemplateSlug;
  content: Partial<InvitationContentDraft>;
  sections: Partial<InvitationSections>;
  theme: Partial<InvitationTheme>;
  cover_image_url: string | null;
  gallery_image_urls: string[];
  updated_at: string;
};

export type InvitationBuilderState = {
  templateSlug: InvitationTemplateSlug;
  content: InvitationContentDraft;
  sections: InvitationSections;
  theme: InvitationTheme;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
};
