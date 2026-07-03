"use client";

import { Plus } from "lucide-react";

import { EventCardsGrid } from "@/components/dashboard/event-cards-grid";
import { useEventFormDialog } from "@/components/dashboard/use-event-form-dialog";
import { Button } from "@/components/ui/button";
import type { EventListStats } from "@/lib/events/queries";
import { ro } from "@/lib/i18n/ro";
import type { EventRow } from "@/types/events";

type EventsPageClientProps = {
  events: EventRow[];
  stats: Record<string, EventListStats>;
  activeEventId: string | null;
};

export function EventsPageClient({ events, stats, activeEventId }: EventsPageClientProps) {
  const { openCreateDialog, openEditDialog, dialog } = useEventFormDialog();

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex-1" />
        <Button type="button" className="shrink-0 -mt-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          {ro.events.newEvent}
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center bg-white px-6 py-16 text-center border-[rgba(210,170,185,0.22)] shadow-card rounded-[18px]">
          <h2 className="font-serif text-xl font-bold text-[#1A0E14]">{ro.events.emptyTitle}</h2>
          <p className="mt-1.5 max-w-sm text-xs text-text-secondary">{ro.events.emptyDesc}</p>
          <Button type="button" className="mt-6" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            {ro.events.newEvent}
          </Button>
        </div>
      ) : (
        <EventCardsGrid
          events={events}
          stats={stats}
          activeEventId={activeEventId}
          onEdit={openEditDialog}
        />
      )}

      {dialog}
    </>
  );
}
