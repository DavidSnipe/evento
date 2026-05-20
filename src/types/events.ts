import type { EventType } from "@/types";

export type EventRow = {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType;
  event_date: string | null;
  venue: string | null;
  description: string | null;
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
