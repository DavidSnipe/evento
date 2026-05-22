import { notFound } from "next/navigation";

import { updateEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { EventForm } from "@/components/events/event-form";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AnimatedPage } from "@/components/layout/animated-page";
import { getEventById } from "@/lib/events/queries";
import { ro } from "@/lib/i18n/ro";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) notFound();

  const updateEventWithId = updateEvent.bind(null, id);

  return (
    <AnimatedPage>
      <DashboardHeader
        title={ro.events.editTitle}
        description={ro.events.editSubtitle}
      />
      <div className="mx-auto max-w-2xl">
        <EventForm mode="edit" event={event} action={updateEventWithId} />
      </div>
    </AnimatedPage>
  );
}
