"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, PiggyBank } from "lucide-react";

import { StatsCard } from "@/components/nuntiki/stats-card";
import { ro } from "@/lib/i18n/ro";
import type { BudgetSnapshot } from "@/types/budget";
import type { VendorCategoryRow } from "@/types/vendors";
import { cn } from "@/lib/utils";
import { VendorCategoryPicker } from "@/components/vendors/vendor-category-picker";

import { BudgetTargetDialog } from "./add-budget-dialog";
import { BUDGET_OVERVIEW_SLUG, BudgetCategorySidebar } from "./budget-category-sidebar";
import { BudgetCategoryWorkspace, BudgetOverviewWorkspace } from "./budget-category-workspace";
import { BudgetSummaryExpenseTable } from "./budget-summary-expense-table";

function formatLei(value: number) {
  return `${value.toLocaleString("ro-RO")} RON`;
}

function BudgetStatsRow({
  snapshot,
  onEditTarget,
  alignedLayout = false,
}: {
  snapshot: BudgetSnapshot;
  onEditTarget: () => void;
  alignedLayout?: boolean;
}) {
  const { totals, budgetTarget } = snapshot;
  const items = [
    {
      label: ro.budgetModule.statsTotal,
      value: budgetTarget != null ? formatLei(budgetTarget) : "—",
      accent: "default" as const,
      onClick: onEditTarget,
      hint: budgetTarget == null ? ro.budgetModule.setTarget : ro.budgetModule.editTarget,
    },
    { label: ro.budgetModule.statsEstimated, value: formatLei(totals.estimated), accent: "default" as const },
    { label: ro.budgetModule.statsActual, value: formatLei(totals.actual), accent: "primary" as const },
    {
      label: ro.budgetModule.statsRemaining,
      value:
        totals.targetRemaining != null ? formatLei(Math.max(0, totals.targetRemaining)) : formatLei(totals.remaining),
      accent: "success" as const,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", alignedLayout && "lg:contents")}>
      {items.map((item) => (
        <StatsCard
          key={item.label}
          label={item.label}
          value={item.value}
          accent={item.accent}
          footer={item.hint ? <p className="text-[11px] font-medium text-[var(--dash-accent-text)]">{item.hint}</p> : undefined}
          className={cn(alignedLayout && "lg:col-span-1", item.onClick && "cursor-pointer transition-shadow hover:shadow-[var(--dash-shadow-card-hover)]")}
          onClick={item.onClick}
          role={item.onClick ? "button" : undefined}
          tabIndex={item.onClick ? 0 : undefined}
          onKeyDown={
            item.onClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    item.onClick?.();
                  }
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

type BudgetClientProps = {
  eventId: string;
  snapshot: BudgetSnapshot;
  vendorCategories: VendorCategoryRow[];
  activeCategorySlugs: string[];
  migrationReady: boolean;
  canEdit: boolean;
  canManage: boolean;
};

export function BudgetClient({
  eventId,
  snapshot,
  vendorCategories,
  activeCategorySlugs,
  migrationReady,
  canEdit,
  canManage,
}: BudgetClientProps) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState(BUDGET_OVERVIEW_SLUG);
  const [showTarget, setShowTarget] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isOverview = selectedSlug === BUDGET_OVERVIEW_SLUG;

  const activeCategory = useMemo(() => {
    if (isOverview) return null;
    return snapshot.categories.find((c) => c.slug === selectedSlug) ?? null;
  }, [snapshot.categories, selectedSlug, isOverview]);

  const sortedAllItems = useMemo(
    () =>
      [...snapshot.allItems].sort((a, b) => {
        const cat = a.category.localeCompare(b.category, "ro");
        if (cat !== 0) return cat;
        return a.title.localeCompare(b.title, "ro");
      }),
    [snapshot.allItems]
  );

  const showAddCategory = useMemo(() => {
    if (!canManage || !migrationReady) return false;
    const activeSet = new Set(activeCategorySlugs);
    return vendorCategories.some((c) => !activeSet.has(c.slug));
  }, [canManage, migrationReady, activeCategorySlugs, vendorCategories]);

  useEffect(() => {
    if (selectedSlug === BUDGET_OVERVIEW_SLUG) return;
    if (selectedSlug && !snapshot.categories.some((c) => c.slug === selectedSlug)) {
      setSelectedSlug(BUDGET_OVERVIEW_SLUG);
    }
  }, [snapshot.categories, selectedSlug]);

  const needsVendorSetup =
    snapshot.categories.length === 0 && activeCategorySlugs.length === 0;

  if (snapshot.categories.length === 0) {
    return (
      <div className="space-y-4">
        <BudgetStatsRow snapshot={snapshot} onEditTarget={() => setShowTarget(true)} />
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] py-20 text-center shadow-[var(--dash-shadow-card)]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--dash-hairline)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-sm">
            <PiggyBank className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--dash-text)]">
            {needsVendorSetup ? ro.budgetModule.vendorSetupEmpty : ro.budgetModule.noCategories}
          </h3>
          {canManage && migrationReady && vendorCategories.length > 0 && !needsVendorSetup ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--dash-accent)] px-5 py-2.5 text-xs font-bold text-white shadow-[var(--dash-shadow-sm)]"
            >
              {ro.budgetModule.addCategory}
            </button>
          ) : (
            <Link
              href={`/dashboard/events/${eventId}/vendors`}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--dash-accent)] px-5 py-2.5 text-xs font-bold text-white shadow-[var(--dash-shadow-sm)]"
            >
              {needsVendorSetup ? ro.budgetModule.vendorSetupCta : ro.budgetModule.noCategoriesCta}
              {!needsVendorSetup ? <ExternalLink className="h-3.5 w-3.5" /> : null}
            </Link>
          )}
        </div>
        <BudgetTargetDialog
          eventId={eventId}
          open={showTarget}
          onClose={() => setShowTarget(false)}
          currentTarget={snapshot.budgetTarget}
        />
        {canManage && migrationReady ? (
          <VendorCategoryPicker
            eventId={eventId}
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            categories={vendorCategories}
            activeSlugs={activeCategorySlugs}
            onActivated={() => router.refresh()}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canEdit ? (
        <p className="rounded-[14px] border border-[var(--dash-hairline)] bg-[var(--dash-ivory)] px-4 py-3 text-center text-[13px] text-[var(--dash-text-secondary)]">
          {ro.vendors.foundation.readOnly}
        </p>
      ) : null}

      <div className="vendors-category-layout grid grid-cols-1 gap-3 lg:grid-cols-4">
        <BudgetStatsRow snapshot={snapshot} onEditTarget={() => setShowTarget(true)} alignedLayout />

        <div className="vendors-category-sidebar-slot hide-scrollbar lg:col-span-1 lg:row-start-2">
          <BudgetCategorySidebar
            categories={snapshot.categories}
            activeSlug={selectedSlug}
            canManage={showAddCategory}
            onSelect={setSelectedSlug}
            onAddCategory={() => setPickerOpen(true)}
          />
        </div>

        <div className="vendors-category-workspace-slot hide-scrollbar lg:col-span-3 lg:col-start-2 lg:row-start-2">
          {isOverview ? (
            <BudgetOverviewWorkspace snapshot={snapshot} allItems={sortedAllItems} />
          ) : activeCategory ? (
            <BudgetCategoryWorkspace eventId={eventId} category={activeCategory} canEdit={canEdit} />
          ) : null}
        </div>
      </div>

      {!isOverview ? (
        <section className="space-y-3 pt-2">
          <h3 className="text-[13px] font-semibold text-[var(--dash-text)]">{ro.budgetModule.allExpenses}</h3>
          <BudgetSummaryExpenseTable items={sortedAllItems} />
        </section>
      ) : null}

      <BudgetTargetDialog
        eventId={eventId}
        open={showTarget}
        onClose={() => setShowTarget(false)}
        currentTarget={snapshot.budgetTarget}
      />

      {canManage && migrationReady ? (
        <VendorCategoryPicker
          eventId={eventId}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          categories={vendorCategories}
          activeSlugs={activeCategorySlugs}
          onActivated={(slug) => {
            setSelectedSlug(slug);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
