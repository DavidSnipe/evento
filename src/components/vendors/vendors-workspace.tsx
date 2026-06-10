"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { removeVendorCategoryFromEvent } from "@/app/(dashboard)/dashboard/events/[id]/vendors/category-actions";
import { useVendorsOptimistic } from "@/hooks/vendors/use-vendors-optimistic";
import { buildCategorySidebarItems, groupVendorsByCategory } from "@/lib/vendors/grouping";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow, VendorFoundationSnapshot } from "@/types/vendors";
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
      <div
        className="flex gap-3 px-0 py-3 text-[14px] text-amber-900"
        role="alert"
      >
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[15px] font-medium text-[var(--vk-text)]">
            {ro.vendors.workspace.noActiveCategories}
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-4 text-[13px] font-medium text-[var(--vk-text-secondary)] underline-offset-4 hover:underline"
            >
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
    <>
      {confirmDialog}

      {!canEdit && (
        <p className="mb-8 text-center text-[13px] text-[var(--vk-text-secondary)]">
          {ro.vendors.foundation.readOnly}
        </p>
      )}

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
        <VendorCategorySidebar
          items={sidebarItems}
          activeSlug={selectedCategorySlug}
          canManage={canManage}
          onSelect={setSelectedCategorySlug}
          onAddCategory={() => setPickerOpen(true)}
        />

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
    </>
  );
}
