import Link from "next/link";
import { Plus } from "lucide-react";

import { EventCard } from "@/components/events/event-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { getActiveEventId } from "@/lib/events/active-event";
import { getUserEvents } from "@/lib/events/queries";
import { ro } from "@/lib/i18n/ro";

export default async function EventsPage() {
  const [events, activeEventId] = await Promise.all([getUserEvents(), getActiveEventId()]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <DashboardHeader title={ro.events.title} description={ro.events.subtitle} />
        </div>
        <Button asChild className="shrink-0">
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4" />
            {ro.events.newEvent}
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center px-6 py-16 text-center">
          <h2 className="font-serif text-2xl font-semibold">{ro.events.emptyTitle}</h2>
          <p className="mt-2 max-w-md text-muted-foreground">{ro.events.emptyDesc}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/events/new">
              <Plus className="h-4 w-4" />
              {ro.events.newEvent}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isActive={activeEventId === event.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
