import Link from "next/link";
import { Users } from "lucide-react";

import { GuestList } from "@/components/guests/guest-list";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireEvent } from "@/lib/events/verify-event";
import { getGuestStats, getGuestsByEvent } from "@/lib/guests/queries";
import { getTablesByEvent } from "@/lib/seating/queries";
import { ro } from "@/lib/i18n/ro";
import type { RsvpStatus } from "@/types/guests";

type GuestsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
};

export default async function GuestsPage({ params, searchParams }: GuestsPageProps) {
  const { id } = await params;
  const { filter: filterParam } = await searchParams;
  const event = await requireEvent(id);

  const [guests, tables, stats] = await Promise.all([
    getGuestsByEvent(id),
    getTablesByEvent(id),
    getGuestStats(id),
  ]);

  const validFilters = ["all", "pending", "accepted", "declined", "maybe"] as const;
  const filter = validFilters.includes(filterParam as (typeof validFilters)[number])
    ? (filterParam as RsvpStatus | "all")
    : "all";

  return (
    <>
      <DashboardHeader
        title={ro.guests.title}
        description={`${event.title} · ${ro.guests.subtitle}`}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: ro.guests.stats.total, value: stats.total, icon: Users },
          { label: ro.guests.stats.accepted, value: stats.accepted },
          { label: ro.guests.stats.pending, value: stats.pending },
          { label: ro.guests.stats.seated, value: stats.seated },
        ].map((stat) => (
          <Card key={stat.label} className="glass-panel border-0">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-serif text-2xl font-semibold">{stat.value}</p>
              </div>
              {stat.icon ? <stat.icon className="h-5 w-5 text-primary/60" /> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 flex justify-end">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/events/${id}/seating`}>{ro.events.subNav.seating}</Link>
        </Button>
      </div>

      <GuestList eventId={id} guests={guests} tables={tables} initialFilter={filter} />
    </>
  );
}
