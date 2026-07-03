import type { EventType } from "@/types";
import {
  DIALOG_EVENT_TYPE_OPTIONS,
  isBaptismType,
  isMajoratType,
  isWeddingType,
  usesGodparentsSection,
  usesManualTitle,
  usesSmartNameFields,
} from "@/lib/events/event-types";

export type EventRow = {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType;
  event_date: string | null;
  venue: string | null;
  description: string | null;
  /** Optional hero/cover image for event cards */
  cover_image_url?: string | null;
  /** Public RSVP URL slug — one link per event (MVP) */
  rsvp_slug: string | null;
  /** Secret token for live ICS calendar subscription (after migration 017) */
  calendar_subscription_token?: string | null;
  /** Seating planner room width in meters (migration 025) */
  seating_room_width_m?: number | null;
  /** Seating planner room height in meters (migration 025) */
  seating_room_height_m?: number | null;
  groom_first_name?: string | null;
  groom_last_name?: string | null;
  bride_first_name?: string | null;
  bride_last_name?: string | null;
  parent1_first_name?: string | null;
  parent1_last_name?: string | null;
  parent2_first_name?: string | null;
  parent2_last_name?: string | null;
  child_first_name?: string | null;
  godparent1_name?: string | null;
  godparent2_name?: string | null;
  created_at: string;
  updated_at: string;
};

export const EVENT_TYPES: EventType[] = DIALOG_EVENT_TYPE_OPTIONS.map((o) => o.value);

export const CREATE_EVENT_TYPES: EventType[] = [...EVENT_TYPES];

export {
  isBaptismType,
  isMajoratType,
  isWeddingType,
  usesManualTitle,
  usesSmartNameFields,
};

export function usesGodparentsAtCreate(type: EventType): boolean {
  return usesGodparentsSection(type);
}
