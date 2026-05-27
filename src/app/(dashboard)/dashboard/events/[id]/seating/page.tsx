import { SeatingPlanner } from "@/components/seating/seating-planner";
import { AnimatedPage } from "@/components/layout/animated-page";
import { requireEvent } from "@/lib/events/verify-event";
import { getSeatingPlan } from "@/lib/seating/queries";

type SeatingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SeatingPage({ params }: SeatingPageProps) {
  const { id } = await params;
  await requireEvent(id);
  const { tables, unassigned, allGuests } = await getSeatingPlan(id);

  return (
    <AnimatedPage className="flex min-h-0 flex-1 flex-col">
      <SeatingPlanner
        eventId={id}
        tables={tables}
        unassigned={unassigned}
        allGuests={allGuests}
      />
    </AnimatedPage>
  );
}
