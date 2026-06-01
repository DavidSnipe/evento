import { requireEventPermission } from "@/lib/events/verify-event";
import { getVendors } from "@/lib/vendors/queries";
import { VendorsClient } from "@/components/vendors/vendors-client";
import { AnimatedPage } from "@/components/layout/animated-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Furnizori Eveniment | Evento",
};

export default async function VendorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event } = await requireEventPermission(id, (p) => p.canEditVendors);

  const vendors = await getVendors(id);

  return (
    <AnimatedPage className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Furnizori & Contacte
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestionează echipa de profesioniști pentru {event.title}.
        </p>
      </div>

      <VendorsClient eventId={id} initialItems={vendors} />
    </AnimatedPage>
  );
}
