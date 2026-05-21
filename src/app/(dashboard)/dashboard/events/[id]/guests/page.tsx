import { GuestDatabase } from "@/components/guests/guest-database";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { requireEvent } from "@/lib/events/verify-event";
import { getGuestStats, getGuestsByEvent } from "@/lib/guests/queries";
import { getTablesByEvent } from "@/lib/seating/queries";
import { ro } from "@/lib/i18n/ro";

type GuestsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GuestsPage({ params }: GuestsPageProps) {
  const { id } = await params;
  const event = await requireEvent(id);

  const [guests, tables, stats] = await Promise.all([
    getGuestsByEvent(id),
    getTablesByEvent(id),
    getGuestStats(id),
  ]);

  return (
    <>
      <DashboardHeader
        title={ro.guests.title}
        description={`${event.title} · ${ro.guests.subtitle}`}
      />

      <GuestDatabase
        eventId={id}
        guests={guests}
        tables={tables}
        stats={stats}
      />
    </>
  );
}
