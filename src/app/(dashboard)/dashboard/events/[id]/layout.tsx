import { requireEvent } from "@/lib/events/verify-event";

type EventLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { id } = await params;
  await requireEvent(id);

  return <>{children}</>;
}
