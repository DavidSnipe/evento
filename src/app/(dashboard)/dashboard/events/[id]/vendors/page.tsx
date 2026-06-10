import { getEventAccessContext } from "@/lib/events/verify-event";
import { getVendorFoundationSnapshot } from "@/lib/vendors/queries";
import { VendorsWorkspace } from "@/components/vendors/vendors-workspace";
import { VendorsPageShell } from "@/components/vendors/vendors-page-shell";
import { AnimatedPage } from "@/components/layout/animated-page";
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
    <AnimatedPage className="mx-auto max-w-[1200px]">
      <VendorsPageShell className="space-y-[var(--dash-section-gap,3rem)] pb-8">
        <header className="space-y-3 pb-6">
          <h1 className="vk-page-title">{ro.vendors.workspace.pageTitle}</h1>
          <p className="vk-page-desc">
            {ro.vendors.workspace.pageSubtitle.replace("{title}", event.title)}
          </p>
        </header>

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
