"use client";

import { EventCard } from "@/components/dashboard/event-card";
import type { EventListStats } from "@/lib/events/queries";
import type { EventRow } from "@/types/events";

type EventCardsGridProps = {
  events: EventRow[];
  stats: Record<string, EventListStats>;
  activeEventId: string | null;
  onEdit: (event: EventRow) => void;
};

export function EventCardsGrid({ events, stats, activeEventId, onEdit }: EventCardsGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          stats={stats[event.id]}
          isActive={activeEventId === event.id}
          index={index}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
