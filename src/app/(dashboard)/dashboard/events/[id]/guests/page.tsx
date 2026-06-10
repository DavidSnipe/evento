import { GuestDatabaseDynamic } from "@/components/guests/guest-database-dynamic";
import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { getEventAccessContext } from "@/lib/events/verify-event";
import { getGuestStats, getGuestsByEvent } from "@/lib/guests/queries";
import { getTablesByEvent } from "@/lib/seating/queries";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

type GuestsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GuestsPage({ params }: GuestsPageProps) {
  const { id } = await params;
  const [{ event }, guests, tables, stats] = await Promise.all([
    getEventAccessContext(id),
    getGuestsByEvent(id),
    getTablesByEvent(id),
    getGuestStats(id),
  ]);

  return (
    <AnimatedPage className="space-y-6">
      <DashboardHeader
        title={ro.guests.title}
        description={`${event.title} · ${ro.guests.subtitle}`}
      />

      <GuestDatabaseDynamic
        eventId={id}
        guests={guests}
        tables={tables}
        stats={stats}
      />
    </AnimatedPage>
  );
}
