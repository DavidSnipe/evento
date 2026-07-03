import { createEvent } from "@/app/(dashboard)/dashboard/events/actions";
import { CreateEventForm } from "@/components/dashboard/create-event-form";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AnimatedPage } from "@/components/layout/animated-page";
import { ro } from "@/lib/i18n/ro";

export default function NewEventPage() {
  return (
    <AnimatedPage>
      <DashboardHeader
        title={ro.events.createTitle}
        description={ro.events.createSubtitle}
      />
      <div className="mx-auto max-w-2xl">
        <CreateEventForm action={createEvent} />
      </div>
    </AnimatedPage>
  );
}
