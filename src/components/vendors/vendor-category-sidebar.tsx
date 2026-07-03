"use client";

import { Plus } from "lucide-react";

import { ro } from "@/lib/i18n/ro";
import type { CategorySidebarItem } from "@/lib/vendors/grouping";
import { getIconForVendorCategory } from "@/lib/icons/registry";
import { cn } from "@/lib/utils";
import { EmojiIcon } from "@/components/ui/emoji-icon";

type VendorCategorySidebarProps = {
  items: CategorySidebarItem[];
  activeSlug: string;
  canManage: boolean;
  onSelect: (slug: string) => void;
  onAddCategory: () => void;
};

function formatSidebarMeta(item: CategorySidebarItem): string {
  const countLabel =
    item.packageCount === 1
      ? `1 ${ro.vendors.workspace.offerSingular}`
      : `${item.packageCount} ${ro.vendors.workspace.offerPlural}`;
  return `${countLabel} · ${item.selectionLabel}`;
}

function AddCategoryLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-rose-18/40 px-3 py-2.5 text-xs font-semibold text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-blush)]/25"
    >
      <Plus className="h-3.5 w-3.5 shrink-0" />
      {ro.vendors.workspace.addCategory}
    </button>
  );
}

export function VendorCategorySidebar({
  items,
  activeSlug,
  canManage,
  onSelect,
  onAddCategory,
}: VendorCategorySidebarProps) {
  return (
    <aside className="flex w-full min-w-0 flex-col">
      <div className="evento-card rounded-[16px] p-3">
        {canManage ? <AddCategoryLink onClick={onAddCategory} /> : null}

        <nav
          className="flex flex-col gap-1 overflow-x-auto lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto"
          aria-label={ro.vendors.workspace.categoriesNav}
        >
          {items.map((item) => {
            const isActive = item.slug === activeSlug;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => onSelect(item.slug)}
                className={cn(
                  "relative w-full min-w-[200px] rounded-[12px] border px-2.5 py-2.5 text-left transition-all lg:min-w-0",
                  isActive
                    ? "border-border-rose-18/40 bg-[var(--dash-blush)]/35 shadow-[inset_2px_0_0_var(--dash-dusty-rose)] shadow-card"
                    : "border-transparent hover:border-border-rose-18/20 hover:bg-[var(--dash-warm-gray)]/60"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <EmojiIcon
                    icon={getIconForVendorCategory(item.slug)}
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
                      {item.label}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[var(--dash-text-muted)]">
                      {formatSidebarMeta(item)}
                    </p>
                  </div>
                  {item.isChosen ? (
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dash-sage)]"
                      title={ro.vendors.workspace.sidebarChosen}
                      aria-hidden
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
