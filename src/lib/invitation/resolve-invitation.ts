import { formatEventDate } from "@/lib/events/utils";
import {
  DEFAULT_INVITATION_SECTIONS,
  mergeContentDraft,
  mergeSections,
  mergeTheme,
} from "@/lib/invitation/defaults";
import {
  getColorPreset,
  getFontPreset,
  getInvitationTemplate,
  parseInvitationTemplateSlug,
} from "@/lib/invitation/templates/registry";
import {
  buildPublicInvitationContent,
  type PublicInvitationContent,
  type PublicScheduleItem,
} from "@/lib/rsvp/invitation-content";
import { defaultsToDraftFromEvent } from "@/lib/invitation/seed-content";
import type {
  EventInvitationRow,
  InvitationBuilderState,
  InvitationScheduleItem,
  InvitationSections,
  InvitationTemplateSlug,
  InvitationTheme,
} from "@/types/invitation";
import type { EventType } from "@/types";

type GuestSnippet = {
  id: string;
  first_name: string;
  last_name: string | null;
  parent_id: string | null;
  relationship_type: string | null;
  tags: string[] | null;
};

/** Resolved view model for public page + preview */
export type PublicInvitationView = PublicInvitationContent & {
  templateSlug: InvitationTemplateSlug;
  theme: InvitationTheme;
  sections: InvitationSections;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  closingMessage: string | null;
  accommodationInfo: string | null;
  transportInfo: string | null;
  additionalNotes: string | null;
  /** Filtered schedule after section toggles */
  visibleSchedule: PublicScheduleItem[];
  showCeremonyToggles: boolean;
};

function filterScheduleBySections(
  schedule: InvitationScheduleItem[],
  sections: InvitationSections
): PublicScheduleItem[] {
  if (!sections.schedule) return [];

  return schedule.filter((item) => {
    if (item.kind === "civil") return sections.civilCeremony;
    if (item.kind === "religious") return sections.religiousCeremony;
    if (item.kind === "party") return sections.party;
    return true;
  });
}

export function resolvePublicInvitationView(
  event: {
    id: string;
    title: string;
    event_type: EventType;
    event_date: string | null;
    venue: string | null;
    description: string | null;
  },
  guests: GuestSnippet[],
  invitationRow: EventInvitationRow | null
): PublicInvitationView {
  const base = buildPublicInvitationContent(event, guests);
  const defaultDraft = defaultsToDraftFromEvent(base, event.title);

  const sections = invitationRow
    ? mergeSections(invitationRow.sections)
    : DEFAULT_INVITATION_SECTIONS;
  const theme = invitationRow ? mergeTheme(invitationRow.theme) : mergeTheme(null);
  const templateSlug = invitationRow
    ? parseInvitationTemplateSlug(invitationRow.template_slug)
    : "elegant";

  const content = invitationRow
    ? mergeContentDraft(defaultDraft, invitationRow.content)
    : defaultDraft;

  const visibleSchedule = filterScheduleBySections(content.schedule, sections);

  const showCeremonyToggles =
    base.eventType === "wedding" &&
    (sections.civilCeremony || sections.religiousCeremony || sections.party);

  return {
    eventId: base.eventId,
    eventType: base.eventType,
    title: content.eventTitle ?? base.title,
    coupleNames: sections.coupleNames ? content.coupleNames : null,
    invitationText: sections.invitationText ? content.invitationText : null,
    dateFormatted: sections.date
      ? formatEventDate(content.dateIso ?? base.dateIso)
      : null,
    dateIso: sections.date ? (content.dateIso ?? base.dateIso) : null,
    venue: sections.venue ? (content.venue ?? base.venue) : null,
    schedule: visibleSchedule,
    dressCode: sections.dressCode ? content.dressCode : null,
    parentsLine: sections.parents ? content.parentsLine : null,
    godparentsLine: sections.godparents ? content.godparentsLine : null,
    showCeremonyToggles,
    templateSlug,
    theme,
    sections,
    coverImageUrl: invitationRow?.cover_image_url ?? null,
    galleryImageUrls:
      sections.gallery && invitationRow?.gallery_image_urls
        ? invitationRow.gallery_image_urls
        : [],
    closingMessage: sections.closingMessage ? content.closingMessage : null,
    accommodationInfo: sections.accommodation ? content.accommodationInfo : null,
    transportInfo: sections.transport ? content.transportInfo : null,
    additionalNotes: sections.additionalNotes ? content.additionalNotes : null,
    visibleSchedule,
  };
}

export function getInvitationThemeVars(theme: InvitationTheme) {
  const colors = getColorPreset(theme.colorPreset);
  const fonts = getFontPreset(theme.fontPreset);
  return { colors, fonts };
}

export function getInvitationTemplateMeta(slug: InvitationTemplateSlug) {
  return getInvitationTemplate(slug);
}

/** Client-side live preview from builder state (no DB round-trip). */
export function previewInvitationView(
  state: InvitationBuilderState,
  eventMeta: { eventId: string; eventType: EventType; fallbackTitle: string }
): PublicInvitationView {
  const sections = mergeSections(state.sections);
  const visibleSchedule = filterScheduleBySections(state.content.schedule, sections);
  const showCeremonyToggles =
    eventMeta.eventType === "wedding" &&
    (sections.civilCeremony || sections.religiousCeremony || sections.party);

  return {
    eventId: eventMeta.eventId,
    eventType: eventMeta.eventType,
    title: state.content.eventTitle ?? eventMeta.fallbackTitle,
    coupleNames: sections.coupleNames ? state.content.coupleNames : null,
    invitationText: sections.invitationText ? state.content.invitationText : null,
    dateFormatted: sections.date ? formatEventDate(state.content.dateIso) : null,
    dateIso: sections.date ? state.content.dateIso : null,
    venue: sections.venue ? state.content.venue : null,
    schedule: visibleSchedule,
    dressCode: sections.dressCode ? state.content.dressCode : null,
    parentsLine: sections.parents ? state.content.parentsLine : null,
    godparentsLine: sections.godparents ? state.content.godparentsLine : null,
    showCeremonyToggles,
    templateSlug: state.templateSlug,
    theme: mergeTheme(state.theme),
    sections,
    coverImageUrl: state.coverImageUrl,
    galleryImageUrls: sections.gallery ? state.galleryImageUrls : [],
    closingMessage: sections.closingMessage ? state.content.closingMessage : null,
    accommodationInfo: sections.accommodation ? state.content.accommodationInfo : null,
    transportInfo: sections.transport ? state.content.transportInfo : null,
    additionalNotes: sections.additionalNotes ? state.content.additionalNotes : null,
    visibleSchedule,
  };
}
