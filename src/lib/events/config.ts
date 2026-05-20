import { Cake, Gem, Heart, Lock, PartyPopper, Sparkles, type LucideIcon } from "lucide-react";

import { ro } from "@/lib/i18n/ro";
import type { EventType } from "@/types";

export type EventTypeOption = {
  value: EventType;
  label: string;
  icon: LucideIcon;
};

export const eventTypeOptions: EventTypeOption[] = [
  { value: "wedding", label: ro.events.types.wedding, icon: Heart },
  { value: "baptism", label: ro.events.types.baptism, icon: Sparkles },
  { value: "birthday", label: ro.events.types.birthday, icon: Cake },
  { value: "anniversary", label: ro.events.types.anniversary, icon: Gem },
  { value: "major", label: ro.events.types.major, icon: PartyPopper },
  { value: "private", label: ro.events.types.private, icon: Lock },
];

export function getEventTypeLabel(type: EventType): string {
  return ro.events.types[type];
}
