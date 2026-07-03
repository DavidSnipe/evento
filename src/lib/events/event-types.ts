import type { EventType } from "@/types";
import { ro } from "@/lib/i18n/ro";

/** Legacy English slugs → canonical Romanian slugs */
const LEGACY_EVENT_TYPE_MAP: Record<string, EventType> = {
  wedding: "nunta",
  civil_wedding: "cununie_civila",
  baptism: "botez",
  major: "majorat",
  birthday: "zi_de_nastere",
  anniversary: "aniversare",
  corporate: "corporate",
  public_event: "eveniment_public",
  private: "eveniment_public",
  NUNTA: "nunta",
  CUNUNIE_CIVILA: "cununie_civila",
  BOTEZ: "botez",
  MAJORAT: "majorat",
  ZI_DE_NASTERE: "zi_de_nastere",
  EVENIMENT_PUBLIC: "eveniment_public",
};

export const EVENT_TYPE_COVER_IMAGES: Record<EventType | "default", string> = {
  nunta: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
  cununie_civila: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&q=80",
  botez: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=600&q=80",
  majorat: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
  zi_de_nastere: "https://images.unsplash.com/photo-1464349095431-e9a21285b19f?w=600&q=80",
  aniversare: "https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca?w=600&q=80",
  corporate: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80",
  eveniment_public: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80",
  default: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
};

export type EventTypeCardOption = {
  value: EventType;
  label: string;
  emoji: string;
  iconFile: string;
};

/** Fluent Emoji 3D SVG filenames in /public/icons/emoji/ */
export const EVENT_TYPE_ICON_FILES: Record<EventType, string> = {
  nunta: "ring.svg",
  cununie_civila: "handshake.svg",
  botez: "cherry-blossom.svg",
  majorat: "sparkles.svg",
  zi_de_nastere: "birthday-cake.svg",
  aniversare: "family.svg",
  corporate: "microphone.svg",
  eveniment_public: "star.svg",
};

export const DIALOG_EVENT_TYPE_OPTIONS: EventTypeCardOption[] = [
  { value: "nunta", label: ro.events.types.nunta, emoji: "💍", iconFile: EVENT_TYPE_ICON_FILES.nunta },
  {
    value: "cununie_civila",
    label: ro.events.types.cununie_civila,
    emoji: "📋",
    iconFile: EVENT_TYPE_ICON_FILES.cununie_civila,
  },
  { value: "botez", label: ro.events.types.botez, emoji: "🕊️", iconFile: EVENT_TYPE_ICON_FILES.botez },
  { value: "majorat", label: ro.events.types.majorat, emoji: "🎉", iconFile: EVENT_TYPE_ICON_FILES.majorat },
  {
    value: "zi_de_nastere",
    label: ro.events.types.zi_de_nastere,
    emoji: "🎂",
    iconFile: EVENT_TYPE_ICON_FILES.zi_de_nastere,
  },
  {
    value: "aniversare",
    label: ro.events.types.aniversare,
    emoji: "💑",
    iconFile: EVENT_TYPE_ICON_FILES.aniversare,
  },
  {
    value: "corporate",
    label: ro.events.types.corporate,
    emoji: "💼",
    iconFile: EVENT_TYPE_ICON_FILES.corporate,
  },
  {
    value: "eveniment_public",
    label: ro.events.types.eveniment_public,
    emoji: "🌐",
    iconFile: EVENT_TYPE_ICON_FILES.eveniment_public,
  },
];

export function getEventTypeIconFile(eventType: string): string {
  const normalized = normalizeEventType(eventType);
  if (normalized && EVENT_TYPE_ICON_FILES[normalized]) {
    return EVENT_TYPE_ICON_FILES[normalized];
  }
  return "star.svg";
}

export function normalizeEventType(value: string | null | undefined): EventType | null {
  if (!value) return null;
  if (value in LEGACY_EVENT_TYPE_MAP) {
    return LEGACY_EVENT_TYPE_MAP[value];
  }
  if (DIALOG_EVENT_TYPE_OPTIONS.some((o) => o.value === value)) {
    return value as EventType;
  }
  return null;
}

export function getEventCoverImage(
  eventType: string,
  customCoverUrl?: string | null
): string {
  if (customCoverUrl) return customCoverUrl;
  const normalized = normalizeEventType(eventType);
  if (normalized && EVENT_TYPE_COVER_IMAGES[normalized]) {
    return EVENT_TYPE_COVER_IMAGES[normalized];
  }
  return EVENT_TYPE_COVER_IMAGES.default;
}

export function getEventTypeEmoji(eventType: string): string {
  const normalized = normalizeEventType(eventType);
  const match = DIALOG_EVENT_TYPE_OPTIONS.find((o) => o.value === normalized);
  return match?.emoji ?? "📅";
}

export function getEventTypeLabel(eventType: string): string {
  const normalized = normalizeEventType(eventType);
  if (!normalized) return eventType;
  return ro.events.types[normalized] ?? eventType;
}

export function isWeddingType(type: EventType): boolean {
  return type === "nunta" || type === "cununie_civila";
}

export function isBaptismType(type: EventType): boolean {
  return type === "botez";
}

export function isMajoratType(type: EventType): boolean {
  return type === "majorat";
}

export function usesManualTitle(type: EventType): boolean {
  return (
    type === "zi_de_nastere" ||
    type === "aniversare" ||
    type === "corporate" ||
    type === "eveniment_public"
  );
}

export function usesGodparentsSection(type: EventType): boolean {
  return isWeddingType(type) || isBaptismType(type);
}

export function usesSmartNameFields(type: EventType): boolean {
  return isWeddingType(type) || isBaptismType(type) || isMajoratType(type);
}
