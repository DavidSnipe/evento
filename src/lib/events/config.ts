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

import { DIALOG_EVENT_TYPE_OPTIONS } from "@/lib/events/event-types";
import { getEventTypeLabel as getLabel } from "@/lib/events/event-types";
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

export const createEventTypeOptions: CreateEventTypeOption[] = DIALOG_EVENT_TYPE_OPTIONS;

export const eventTypeOptions: EventTypeOption[] = EVENT_TYPES.map((value) => {
  const icons: Record<EventType, LucideIcon> = {
    nunta: Heart,
    cununie_civila: FileText,
    botez: Sparkles,
    majorat: PartyPopper,
    zi_de_nastere: Cake,
    aniversare: Heart,
    corporate: Briefcase,
    eveniment_public: Globe,
  };
  return {
    value,
    label: getLabel(value),
    icon: icons[value],
  };
});

export function getEventTypeLabel(type: EventType | string): string {
  return getLabel(type);
}
