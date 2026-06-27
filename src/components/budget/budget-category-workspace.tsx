"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { EmojiIcon } from "@/components/ui/emoji-icon";
import { getIconForVendorCategory } from "@/lib/icons/registry";
import { ro } from "@/lib/i18n/ro";
import type { BudgetCategorySummary, BudgetLineItem, BudgetSnapshot } from "@/types/budget";

import { BudgetInlineExpenseTable } from "./budget-inline-expense-table";
import { BudgetDistributionChart, BudgetTargetProgress } from "./budget-overview-visuals";
import { BudgetSummaryExpenseTable } from "./budget-summary-expense-table";

type BudgetCategoryWorkspaceProps = {
  eventId: string;
  category: BudgetCategorySummary;
  canEdit: boolean;
};

function formatHeaderSummary(category: BudgetCategorySummary): string {
  const count = category.items.length;
  const total = category.actualTotal.toLocaleString("ro-RO");
  if (count === 1) {
    return ro.budgetModule.expenseCountOne.replace("{total}", total);
  }
  return ro.budgetModule.expenseCountSummary
    .replace("{count}", String(count))
    .replace("{total}", total);
}

export function BudgetCategoryWorkspace({
  eventId,
  category,
  canEdit,
}: BudgetCategoryWorkspaceProps) {
  return (
    <div className="glass-panel rounded-[18px] border bg-white/70 p-5 shadow-card backdrop-blur-md">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <EmojiIcon icon={getIconForVendorCategory(category.slug)} size="lg" className="shrink-0" />
          <div className="min-w-0">
            <h2 className="text-[1.125rem] font-semibold tracking-[-0.012em] text-[var(--dash-text)]">
              {category.label}
            </h2>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--dash-text-muted)]">
              {formatHeaderSummary(category)}
            </p>
          </div>
        </div>
        {category.hasVendorItems ? (
          <Link
            href={`/dashboard/events/${eventId}/vendors`}
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--dash-accent-text)] hover:underline"
          >
            {ro.budgetModule.manageInVendors}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : null}
      </header>

      <BudgetInlineExpenseTable
        eventId={eventId}
        categorySlug={category.slug}
        items={category.items}
        canEdit={canEdit}
      />
    </div>
  );
}

function formatOverviewHeaderTotal(categories: BudgetCategorySummary[]): string {
  const total = categories.reduce((sum, cat) => sum + cat.actualTotal, 0);
  return `${total.toLocaleString("ro-RO")} RON`;
}

type BudgetOverviewWorkspaceProps = {
  snapshot: BudgetSnapshot;
  allItems: BudgetLineItem[];
};

export function BudgetOverviewWorkspace({ snapshot, allItems }: BudgetOverviewWorkspaceProps) {
  return (
    <div className="glass-panel rounded-[18px] border bg-white/70 p-5 shadow-card backdrop-blur-md">
      <header className="mb-5 flex min-w-0 items-start gap-3">
        <EmojiIcon icon="other" size="lg" className="shrink-0" />
        <div className="min-w-0">
          <h2 className="text-[1.125rem] font-semibold tracking-[-0.012em] text-[var(--dash-text)]">
            {ro.budgetModule.allExpenses}
          </h2>
          <p className="mt-0.5 text-[12px] font-medium text-[var(--dash-text-muted)]">
            {formatOverviewHeaderTotal(snapshot.categories)}
          </p>
        </div>
      </header>

      <div className="space-y-6">
        <BudgetTargetProgress snapshot={snapshot} />
        <div className="border-t border-border-rose-18/30 pt-6">
          <BudgetDistributionChart categories={snapshot.categories} />
        </div>
        <div className="border-t border-border-rose-18/30 pt-6">
          <BudgetSummaryExpenseTable items={allItems} />
        </div>
      </div>
    </div>
  );
}
