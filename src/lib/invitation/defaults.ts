import type {
  InvitationContentDraft,
  InvitationSections,
  InvitationTheme,
} from "@/types/invitation";
import {
  parseColorPreset,
  parseFontPreset,
  parseInvitationTemplateSlug,
} from "@/lib/invitation/templates/registry";
import type { EventInvitationRow } from "@/types/invitation";

export const DEFAULT_INVITATION_SECTIONS: InvitationSections = {
  invitationText: true,
  coupleNames: true,
  parents: true,
  godparents: true,
  date: true,
  schedule: true,
  venue: true,
  civilCeremony: true,
  religiousCeremony: true,
  party: true,
  dressCode: true,
  accommodation: false,
  transport: false,
  additionalNotes: false,
  gallery: false,
  closingMessage: true,
  rsvpCta: true,
};

export const DEFAULT_INVITATION_THEME: InvitationTheme = {
  fontPreset: "serif",
  colorPreset: "rose",
};

export function emptyInvitationContent(): InvitationContentDraft {
  return {
    coupleNames: null,
    parentsLine: null,
    godparentsLine: null,
    invitationText: null,
    closingMessage: null,
    eventTitle: null,
    dateIso: null,
    venue: null,
    dressCode: null,
    accommodationInfo: null,
    transportInfo: null,
    additionalNotes: null,
    schedule: [],
  };
}

export function mergeSections(
  partial?: Partial<InvitationSections> | null
): InvitationSections {
  return { ...DEFAULT_INVITATION_SECTIONS, ...(partial ?? {}) };
}

export function mergeTheme(partial?: Partial<InvitationTheme> | null): InvitationTheme {
  return {
    fontPreset: parseFontPreset(partial?.fontPreset),
    colorPreset: parseColorPreset(partial?.colorPreset),
  };
}

export function mergeContentDraft(
  defaults: InvitationContentDraft,
  overrides?: Partial<InvitationContentDraft> | null
): InvitationContentDraft {
  if (!overrides) return defaults;

  const merged: InvitationContentDraft = { ...defaults };

  const scalarKeys: (keyof Omit<InvitationContentDraft, "schedule">)[] = [
    "coupleNames",
    "parentsLine",
    "godparentsLine",
    "invitationText",
    "closingMessage",
    "eventTitle",
    "dateIso",
    "venue",
    "dressCode",
    "accommodationInfo",
    "transportInfo",
    "additionalNotes",
  ];

  for (const key of scalarKeys) {
    const value = overrides[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      merged[key] = value;
    }
  }

  if (overrides.schedule && overrides.schedule.length > 0) {
    merged.schedule = overrides.schedule;
  }

  return merged;
}

export function rowToBuilderState(
  row: EventInvitationRow | null,
  defaults: InvitationContentDraft
): {
  templateSlug: ReturnType<typeof parseInvitationTemplateSlug>;
  content: InvitationContentDraft;
  sections: InvitationSections;
  theme: InvitationTheme;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
} {
  if (!row) {
    return {
      templateSlug: "elegant",
      content: defaults,
      sections: DEFAULT_INVITATION_SECTIONS,
      theme: DEFAULT_INVITATION_THEME,
      coverImageUrl: null,
      galleryImageUrls: [],
    };
  }

  return {
    templateSlug: parseInvitationTemplateSlug(row.template_slug),
    content: mergeContentDraft(defaults, row.content),
    sections: mergeSections(row.sections),
    theme: mergeTheme(row.theme),
    coverImageUrl: row.cover_image_url,
    galleryImageUrls: row.gallery_image_urls ?? [],
  };
}
