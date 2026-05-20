import { requireEvent } from "@/lib/events/verify-event";
import { EventSubNav } from "@/components/events/event-sub-nav";

type EventLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { id } = await params;
  await requireEvent(id);

  return (
    <>
      <EventSubNav eventId={id} />
      {children}
    </>
  );
}
