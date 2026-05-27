import Link from "next/link";
import { Plus } from "lucide-react";

import { EventCard } from "@/components/events/event-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AnimatedPage } from "@/components/layout/animated-page";
import { Button } from "@/components/ui/button";
import { getActiveEventId } from "@/lib/events/active-event";
import { getUserEvents } from "@/lib/events/queries";
import { ro } from "@/lib/i18n/ro";

export default async function EventsPage() {
  const [events, activeEventId] = await Promise.all([getUserEvents(), getActiveEventId()]);

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex-1">
          <DashboardHeader title={ro.events.title} description={ro.events.subtitle} />
        </div>
        <Button asChild className="shrink-0 -mt-2">
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4 mr-1" />
            {ro.events.newEvent}
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center bg-white px-6 py-16 text-center border-[rgba(210,170,185,0.22)] shadow-card rounded-[18px]">
          <h2 className="font-serif text-xl font-bold text-[#1A0E14]">{ro.events.emptyTitle}</h2>
          <p className="mt-1.5 max-w-sm text-xs text-text-secondary">{ro.events.emptyDesc}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/events/new">
              <Plus className="h-4 w-4 mr-1" />
              {ro.events.newEvent}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isActive={activeEventId === event.id}
            />
          ))}
        </div>
      )}
    </AnimatedPage>
  );
}
