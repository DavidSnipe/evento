import { requireEventPermission } from "@/lib/events/verify-event";
import { getBudgetSnapshot } from "@/lib/budget/queries";
import { getVendorFoundationSnapshot } from "@/lib/vendors/queries";
import { BudgetClient } from "@/components/budget/budget-client";
import { AnimatedPage } from "@/components/layout/animated-page";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Buget Eveniment | Evento",
};

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ event, access }, snapshot, vendorSnapshot] = await Promise.all([
    requireEventPermission(id, (p) => p.canEditBudget),
    getBudgetSnapshot(id),
    getVendorFoundationSnapshot(id),
  ]);

  return (
    <AnimatedPage className="space-y-6">
      <DashboardHeader
        title={ro.budgetModule.pageTitle}
        description={ro.budgetModule.pageSubtitle.replace("{title}", event.title)}
      />

      {!vendorSnapshot.migrationReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{ro.vendors.foundation.migrationRequired}</p>
          <p className="mt-1 text-amber-800">{ro.vendors.foundation.migrationHint}</p>
        </div>
      ) : null}

      <BudgetClient
        eventId={id}
        snapshot={snapshot}
        vendorCategories={vendorSnapshot.categories}
        activeCategorySlugs={vendorSnapshot.activeCategorySlugs}
        migrationReady={vendorSnapshot.migrationReady}
        canEdit={access.permissions.canEditBudget}
        canManage={access.permissions.canManageVendors}
      />
    </AnimatedPage>
  );
}
