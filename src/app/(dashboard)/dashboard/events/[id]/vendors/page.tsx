import { getEventAccessContext } from "@/lib/events/verify-event";
import { getVendorFoundationSnapshot } from "@/lib/vendors/queries";
import { VendorsWorkspace } from "@/components/vendors/vendors-workspace";
import { VendorsPageShell } from "@/components/vendors/vendors-page-shell";
import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ro } from "@/lib/i18n/ro";

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
  const [{ event, access }, snapshot] = await Promise.all([
    getEventAccessContext(id),
    getVendorFoundationSnapshot(id),
  ]);

  return (
    <AnimatedPage className="space-y-6">
      <DashboardHeader
        title={ro.vendors.workspace.pageTitle}
        description={ro.vendors.workspace.pageSubtitle.replace("{title}", event.title)}
      />

      <VendorsPageShell>
        <VendorsWorkspace
          eventId={id}
          snapshot={snapshot}
          canEdit={access.permissions.canEditVendors}
          canManage={access.permissions.canManageVendors}
        />
      </VendorsPageShell>
    </AnimatedPage>
  );
}
