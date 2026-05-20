import Link from "next/link";

import { SeatingPlanner } from "@/components/seating/seating-planner";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { requireEvent } from "@/lib/events/verify-event";
import { getSeatingPlan } from "@/lib/seating/queries";
import { ro } from "@/lib/i18n/ro";

type SeatingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SeatingPage({ params }: SeatingPageProps) {
  const { id } = await params;
  const event = await requireEvent(id);
  const { tables, unassigned, allGuests } = await getSeatingPlan(id);

  return (
    <>
      <DashboardHeader
        title={ro.seating.title}
        description={`${event.title} · ${ro.seating.subtitle}`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/events/${id}/guests`}>{ro.seating.goToGuests}</Link>
        </Button>
      </div>

      <SeatingPlanner
        eventId={id}
        tables={tables}
        unassigned={unassigned}
        allGuests={allGuests}
      />
    </>
  );
}
