import { requireEventAccess } from "@/lib/events/verify-event";

export const dynamic = "force-dynamic";

type EventLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { id } = await params;
  await requireEventAccess(id);

  return <>{children}</>;
}
