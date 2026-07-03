import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AnimatedPage } from "@/components/layout/animated-page";
import { EventsPageClient } from "@/components/dashboard/events-page-client";
import { reconcileActiveEventAccess } from "@/lib/events/active-event-access";
import { getEventListStats, getUserEvents } from "@/lib/events/queries";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const [events, activeEventId] = await Promise.all([
    getUserEvents(),
    reconcileActiveEventAccess(),
  ]);
  const stats = await getEventListStats(events.map((event) => event.id));

  return (
    <AnimatedPage>
      <div className="mb-2">
        <DashboardHeader title={ro.events.title} description={ro.events.subtitle} />
      </div>

      <EventsPageClient events={events} stats={stats} activeEventId={activeEventId} />
    </AnimatedPage>
  );
}
