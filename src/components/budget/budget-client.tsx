"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, PiggyBank } from "lucide-react";

import { Card } from "@/components/ui/card";
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
      accent: "text-[#1A0E14]",
      onClick: onEditTarget,
      hint: budgetTarget == null ? ro.budgetModule.setTarget : ro.budgetModule.editTarget,
    },
    { label: ro.budgetModule.statsEstimated, value: formatLei(totals.estimated), accent: "text-[#1A0E14]" },
    { label: ro.budgetModule.statsActual, value: formatLei(totals.actual), accent: "text-[#B8516B]" },
    {
      label: ro.budgetModule.statsRemaining,
      value:
        totals.targetRemaining != null ? formatLei(Math.max(0, totals.targetRemaining)) : formatLei(totals.remaining),
      accent: "text-[var(--dash-sage)]",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", alignedLayout && "lg:contents")}>
      {items.map((item) => (
        <Card
          key={item.label}
          className={cn(
            "glass-panel rounded-[18px] border bg-white p-4 shadow-card",
            alignedLayout && "lg:col-span-1",
            item.onClick && "cursor-pointer transition-shadow hover:shadow-md"
          )}
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
        >
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">{item.label}</p>
          <p className={cn("mt-1.5 font-sans text-2xl font-bold", item.accent)}>{item.value}</p>
          {item.hint ? (
            <p className="mt-1 text-[11px] font-medium text-[var(--dash-accent-text)]">{item.hint}</p>
          ) : null}
        </Card>
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
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-[rgba(210,170,185,0.22)] bg-white py-20 text-center shadow-card">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-rose-18 bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] text-[#B8516B] shadow-sm">
            <PiggyBank className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A0E14]">
            {needsVendorSetup ? ro.budgetModule.vendorSetupEmpty : ro.budgetModule.noCategories}
          </h3>
          {canManage && migrationReady && vendorCategories.length > 0 && !needsVendorSetup ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-5 py-2.5 text-xs font-bold text-white shadow-primary-btn"
            >
              {ro.budgetModule.addCategory}
            </button>
          ) : (
            <Link
              href={`/dashboard/events/${eventId}/vendors`}
              className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-5 py-2.5 text-xs font-bold text-white shadow-primary-btn"
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
        <p className="rounded-[14px] border border-border-rose-18/30 bg-[var(--dash-warm-gray)]/50 px-4 py-3 text-center text-[13px] text-[var(--dash-text-secondary)]">
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
