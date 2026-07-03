"use client";

import { Plus } from "lucide-react";

import { EmojiIcon } from "@/components/ui/emoji-icon";
import { getIconForVendorCategory, type IconKey } from "@/lib/icons/registry";
import { ro } from "@/lib/i18n/ro";
import type { BudgetCategorySummary } from "@/types/budget";
import { cn } from "@/lib/utils";

export const BUDGET_OVERVIEW_SLUG = "overview";

const OVERVIEW_ICON: IconKey = "other";

type BudgetCategorySidebarProps = {
  categories: BudgetCategorySummary[];
  activeSlug: string;
  canManage: boolean;
  onSelect: (slug: string) => void;
  onAddCategory: () => void;
};

function formatOverviewMeta(categories: BudgetCategorySummary[]): string {
  const total = categories.reduce((sum, cat) => sum + cat.actualTotal, 0);
  return `${total.toLocaleString("ro-RO")} RON`;
}

function formatSidebarMeta(cat: BudgetCategorySummary): string {
  const count = cat.items.length;
  const total = cat.actualTotal.toLocaleString("ro-RO");
  if (count === 1) {
    return ro.budgetModule.expenseCountOne.replace("{total}", total);
  }
  return ro.budgetModule.expenseCountSummary
    .replace("{count}", String(count))
    .replace("{total}", total);
}

const navItemClass = (isActive: boolean) =>
  cn(
    "relative w-full min-w-[200px] rounded-[12px] border px-2.5 py-2.5 text-left transition-all lg:min-w-0",
    isActive
      ? "border-border-rose-18/40 bg-[var(--dash-blush)]/35 shadow-[inset_2px_0_0_var(--dash-dusty-rose)] shadow-card"
      : "border-transparent hover:border-border-rose-18/20 hover:bg-[var(--dash-warm-gray)]/60"
  );

function AddCategoryLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-rose-18/40 px-3 py-2.5 text-xs font-semibold text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-blush)]/25"
    >
      <Plus className="h-3.5 w-3.5 shrink-0" />
      {ro.budgetModule.addCategory}
    </button>
  );
}

export function BudgetCategorySidebar({
  categories,
  activeSlug,
  canManage,
  onSelect,
  onAddCategory,
}: BudgetCategorySidebarProps) {
  const isOverviewActive = activeSlug === BUDGET_OVERVIEW_SLUG;

  return (
    <aside className="flex w-full min-w-0 flex-col">
      <div className="evento-card rounded-[16px] p-3">
        {canManage ? <AddCategoryLink onClick={onAddCategory} /> : null}

        <nav
          className="flex flex-col gap-1 overflow-x-auto lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto"
          aria-label={ro.budgetModule.categoriesNav}
        >
          <button
            type="button"
            onClick={() => onSelect(BUDGET_OVERVIEW_SLUG)}
            className={navItemClass(isOverviewActive)}
          >
            <div className="flex items-start gap-2.5">
              <EmojiIcon icon={OVERVIEW_ICON} size="md" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-[0.8125rem] leading-tight",
                    isOverviewActive
                      ? "font-semibold text-[var(--dash-accent-text)]"
                      : "font-medium text-[var(--dash-text)]"
                  )}
                >
                  {ro.budgetModule.allExpenses}
                </p>
                <p className="mt-1 text-[10px] font-medium text-[var(--dash-text-muted)]">
                  {formatOverviewMeta(categories)}
                </p>
              </div>
            </div>
          </button>

          <div className="my-1.5 border-t border-border-rose-18/25" role="separator" />

          {categories.map((cat) => {
            const isActive = cat.slug === activeSlug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => onSelect(cat.slug)}
                className={navItemClass(isActive)}
              >
                <div className="flex items-start gap-2.5">
                  <EmojiIcon
                    icon={getIconForVendorCategory(cat.slug)}
                    size="md"
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-[0.8125rem] leading-tight",
                        isActive
                          ? "font-semibold text-[var(--dash-accent-text)]"
                          : "font-medium text-[var(--dash-text)]"
                      )}
                    >
                      {cat.label}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[var(--dash-text-muted)]">
                      {formatSidebarMeta(cat)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
