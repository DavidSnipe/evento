import { notFound } from "next/navigation";

import { getEventById } from "@/lib/events/queries";
import type { EventRow } from "@/types/events";

/** Load event owned by current user; 404 if missing. */
export async function requireEvent(eventId: string): Promise<EventRow> {
  const event = await getEventById(eventId);
  if (!event) notFound();
  return event;
}
