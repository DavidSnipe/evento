"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Store } from "lucide-react";

import { removeVendorCategoryFromEvent } from "@/app/(dashboard)/dashboard/events/[id]/vendors/category-actions";
import { useVendorsOptimistic } from "@/hooks/vendors/use-vendors-optimistic";
import { buildCategorySidebarItems, groupVendorsByCategory } from "@/lib/vendors/grouping";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow, VendorFoundationSnapshot } from "@/types/vendors";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { VendorCategoryPicker } from "./vendor-category-picker";
import { VendorCategorySidebar } from "./vendor-category-sidebar";
import { VendorCategoryWorkspace } from "./vendor-category-workspace";
import { useVendorsConfirm } from "./vendors-confirm";

type VendorsWorkspaceProps = {
  eventId: string;
  snapshot: VendorFoundationSnapshot;
  canEdit: boolean;
  canManage: boolean;
};

function VendorsStatsRow({
  categoryCount,
  serviceCount,
  offerCount,
  selectedCount,
}: {
  categoryCount: number;
  serviceCount: number;
  offerCount: number;
  selectedCount: number;
}) {
  const items = [
    { label: ro.vendors.workspace.statsCategories, value: categoryCount, accent: "default" as const },
    { label: ro.vendors.workspace.statsServices, value: serviceCount, accent: "default" as const },
    { label: ro.vendors.workspace.statsOffers, value: offerCount, accent: "primary" as const },
    { label: ro.vendors.workspace.statsSelected, value: selectedCount, accent: "success" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:contents">
      {items.map((item) => (
        <StatsCard
          key={item.label}
          label={item.label}
          value={item.value}
          accent={item.accent}
          className="lg:col-span-1"
        />
      ))}
    </div>
  );
}

export function VendorsWorkspace({
  eventId,
  snapshot,
  canEdit,
  canManage,
}: VendorsWorkspaceProps) {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useVendorsConfirm();
  const { migrationReady, categories, activeCategorySlugs, services: initialServices } =
    snapshot;

  const {
    vendors,
    services,
    addVendorOptimistic,
    deleteVendorOptimistic,
    addOfferOptimistic,
    updateOfferOptimistic,
    deleteOfferOptimistic,
    selectOfferOptimistic,
  } = useVendorsOptimistic(eventId, snapshot.vendors, initialServices);

  const groups = useMemo(
    () =>
      groupVendorsByCategory(
        vendors,
        categories as VendorCategoryRow[],
        activeCategorySlugs,
        services
      ),
    [vendors, categories, activeCategorySlugs, services]
  );

  const sidebarItems = useMemo(
    () => buildCategorySidebarItems(groups, categories as VendorCategoryRow[]),
    [groups, categories]
  );

  const [selectedCategorySlug, setSelectedCategorySlug] = useState(
    () => activeCategorySlugs[0] ?? groups[0]?.slug ?? ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removingCategory, setRemovingCategory] = useState(false);

  useEffect(() => {
    if (!selectedCategorySlug && groups[0]) {
      setSelectedCategorySlug(groups[0].slug);
      return;
    }
    if (
      selectedCategorySlug &&
      !groups.some((g) => g.slug === selectedCategorySlug) &&
      groups[0]
    ) {
      setSelectedCategorySlug(groups[0].slug);
    }
  }, [groups, selectedCategorySlug]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.slug === selectedCategorySlug) ?? groups[0],
    [groups, selectedCategorySlug]
  );

  const pageStats = useMemo(
    () => ({
      categoryCount: groups.length,
      serviceCount: groups.reduce((sum, g) => sum + g.services.length, 0),
      offerCount: groups.reduce((sum, g) => sum + g.aggregateSummary.offerCount, 0),
      selectedCount: groups.reduce(
        (sum, g) => sum + g.services.filter((s) => s.service.selected_offer_id).length,
        0
      ),
    }),
    [groups]
  );

  async function handleRemoveCategory() {
    if (!activeGroup || !canManage) return;

    const confirmed = await confirm({
      title: ro.vendors.workspace.removeCategoryFromEvent,
      description: ro.vendors.workspace.removeCategoryConfirm,
      confirmLabel: ro.vendors.workspace.removeCategoryFromEvent,
      cancelLabel: ro.vendors.workspace.cancel,
      variant: "destructive",
    });
    if (!confirmed) return;

    setRemovingCategory(true);
    const result = await removeVendorCategoryFromEvent(eventId, activeGroup.slug);
    setRemovingCategory(false);

    if (result.error) {
      alert(result.error);
      return;
    }
    const nextSlug = groups.find((g) => g.slug !== activeGroup.slug)?.slug ?? "";
    setSelectedCategorySlug(nextSlug);
    router.refresh();
  }

  async function handleDeleteRow(vendorId: string, packageId: string, serviceId: string) {
    const vendor = vendors.find((v) => v.id === vendorId);
    const offerCount = vendor?.offers.length ?? 0;
    await deleteOfferOptimistic(vendorId, packageId, serviceId);
    if (offerCount <= 1) {
      await deleteVendorOptimistic(vendorId);
    }
  }

  if (!migrationReady) {
    return (
      <div className="flex gap-3 px-0 py-3 text-[14px] text-amber-900" role="alert">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">{ro.vendors.foundation.migrationRequired}</p>
          <p className="mt-1 text-[13px]">{ro.vendors.foundation.migrationHint}</p>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <>
        {confirmDialog}
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] py-20 text-center shadow-[var(--dash-shadow-card)]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--dash-hairline)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-sm">
            <Store className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold tracking-[-0.012em] text-[var(--dash-text)]">
            {ro.vendors.workspace.noActiveCategories}
          </h3>
          {canManage ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-6 flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--dash-accent)] px-5 py-2.5 text-xs font-bold text-white shadow-[var(--dash-shadow-sm)] transition-all hover:opacity-95"
            >
              <Plus className="h-3.5 w-3.5" />
              {ro.vendors.workspace.addCategory}
            </button>
          ) : null}
        </div>
        <VendorCategoryPicker
          eventId={eventId}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          categories={categories as VendorCategoryRow[]}
          activeSlugs={activeCategorySlugs}
          onActivated={(slug) => {
            setSelectedCategorySlug(slug);
            router.refresh();
          }}
        />
      </>
    );
  }

  if (!activeGroup) {
    return null;
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      {!canEdit && (
        <p className="rounded-[14px] border border-[var(--dash-hairline)] bg-[var(--dash-ivory)] px-4 py-3 text-center text-[13px] text-[var(--dash-text-secondary)]">
          {ro.vendors.foundation.readOnly}
        </p>
      )}

      <div className="vendors-category-layout grid grid-cols-1 gap-3 lg:grid-cols-4">
        <VendorsStatsRow
          categoryCount={pageStats.categoryCount}
          serviceCount={pageStats.serviceCount}
          offerCount={pageStats.offerCount}
          selectedCount={pageStats.selectedCount}
        />

        <div className="vendors-category-sidebar-slot hide-scrollbar lg:col-span-1 lg:row-start-2">
          <VendorCategorySidebar
            items={sidebarItems}
            activeSlug={selectedCategorySlug}
            canManage={canManage}
            onSelect={setSelectedCategorySlug}
            onAddCategory={() => setPickerOpen(true)}
          />
        </div>

        <div className="vendors-category-workspace-slot hide-scrollbar lg:col-span-3 lg:col-start-2 lg:row-start-2">
          <VendorCategoryWorkspace
            eventId={eventId}
            group={activeGroup}
            canEdit={canEdit}
            canManage={canManage}
            removingCategory={removingCategory}
            onSelectPackage={(vendorId, packageId, serviceId) =>
              void selectOfferOptimistic(vendorId, packageId, serviceId)
            }
            onAddVendor={addVendorOptimistic}
            onAddPackage={addOfferOptimistic}
            onUpdatePackage={updateOfferOptimistic}
            onDeleteRow={handleDeleteRow}
            onRemoveCategory={canManage ? handleRemoveCategory : undefined}
            onServiceCreated={() => router.refresh()}
          />
        </div>
      </div>

      {canManage && (
        <VendorCategoryPicker
          eventId={eventId}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          categories={categories as VendorCategoryRow[]}
          activeSlugs={activeCategorySlugs}
          onActivated={(slug) => {
            setSelectedCategorySlug(slug);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
