import { SeatingPlannerDynamic } from "@/components/seating/seating-planner-dynamic";
import { AnimatedPage } from "@/components/layout/animated-page";
import { getSeatingPlan } from "@/lib/seating/queries";

export const dynamic = "force-dynamic";

type SeatingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SeatingPage({ params }: SeatingPageProps) {
  const { id } = await params;
  const { tables, unassigned, allGuests } = await getSeatingPlan(id);

  return (
    <AnimatedPage className="flex min-h-0 flex-1 flex-col">
      <SeatingPlannerDynamic
        eventId={id}
        tables={tables}
        unassigned={unassigned}
        allGuests={allGuests}
      />
    </AnimatedPage>
  );
}
