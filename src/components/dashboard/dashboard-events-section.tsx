"use client";

import { EventCardsGrid } from "@/components/dashboard/event-cards-grid";
import { useEventFormDialog } from "@/components/dashboard/use-event-form-dialog";
import type { EventListStats } from "@/lib/events/queries";
import type { EventRow } from "@/types/events";

type DashboardEventsSectionProps = {
  events: EventRow[];
  stats: Record<string, EventListStats>;
  activeEventId: string | null;
};

export function DashboardEventsSection({
  events,
  stats,
  activeEventId,
}: DashboardEventsSectionProps) {
  const { openEditDialog, dialog } = useEventFormDialog();

  return (
    <>
      <EventCardsGrid
        events={events}
        stats={stats}
        activeEventId={activeEventId}
        onEdit={openEditDialog}
      />
      {dialog}
    </>
  );
}
