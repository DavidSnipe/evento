import {
  Briefcase,
  Cake,
  FileText,
  Globe,
  Heart,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { ro } from "@/lib/i18n/ro";
import type { EventType } from "@/types";
import { EVENT_TYPES } from "@/types/events";

export type EventTypeOption = {
  value: EventType;
  label: string;
  icon: LucideIcon;
};

export type CreateEventTypeOption = {
  value: EventType;
  label: string;
  emoji: string;
};

export const createEventTypeOptions: CreateEventTypeOption[] = [
  { value: "wedding", label: ro.events.types.wedding, emoji: "💍" },
  { value: "civil_wedding", label: ro.events.types.civil_wedding, emoji: "📋" },
  { value: "baptism", label: ro.events.types.baptism, emoji: "🕊️" },
  { value: "major", label: ro.events.types.major, emoji: "🎉" },
  { value: "birthday", label: ro.events.types.birthday, emoji: "🎂" },
  { value: "corporate", label: ro.events.types.corporate, emoji: "💼" },
  { value: "public_event", label: ro.events.types.public_event, emoji: "🌐" },
];

export const eventTypeOptions: EventTypeOption[] = EVENT_TYPES.map((value) => {
  const icons: Record<EventType, LucideIcon> = {
    wedding: Heart,
    civil_wedding: FileText,
    baptism: Sparkles,
    birthday: Cake,
    anniversary: Heart,
    major: PartyPopper,
    private: Globe,
    corporate: Briefcase,
    public_event: Globe,
  };
  return {
    value,
    label: ro.events.types[value],
    icon: icons[value],
  };
});

export function getEventTypeLabel(type: EventType): string {
  return ro.events.types[type] ?? type;
}
