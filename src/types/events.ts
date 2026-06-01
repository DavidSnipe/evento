import type { EventType } from "@/types";

export type EventRow = {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType;
  event_date: string | null;
  venue: string | null;
  description: string | null;
  /** Public RSVP URL slug — one link per event (MVP) */
  rsvp_slug: string | null;
  /** Secret token for live ICS calendar subscription (after migration 017) */
  calendar_subscription_token?: string | null;
  created_at: string;
  updated_at: string;
};

export const EVENT_TYPES: EventType[] = [
  "wedding",
  "baptism",
  "birthday",
  "anniversary",
  "major",
  "private",
];
