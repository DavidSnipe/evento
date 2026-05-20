import { createEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { EventForm } from "@/components/events/event-form";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ro } from "@/lib/i18n/ro";

export default function NewEventPage() {
  return (
    <>
      <DashboardHeader
        title={ro.events.createTitle}
        description={ro.events.createSubtitle}
      />
      <div className="mx-auto max-w-2xl">
        <EventForm mode="create" action={createEvent} />
      </div>
    </>
  );
}
