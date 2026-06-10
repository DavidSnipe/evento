"use client";



import { Plus } from "lucide-react";



import { ro } from "@/lib/i18n/ro";

import type { CategorySidebarItem } from "@/lib/vendors/grouping";

import { cn } from "@/lib/utils";



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

      className="flex w-full items-center gap-2 py-2 text-[13px] font-medium text-[var(--vk-text-secondary)] transition-colors hover:text-[var(--vk-text)]"

    >

      <Plus className="h-4 w-4 shrink-0 text-[var(--vk-dusty-rose)]" />

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

    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[220px]">

      {canManage ? <AddCategoryLink onClick={onAddCategory} /> : null}



      <nav

        className="flex flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-240px)]"

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

                "relative w-full min-w-[200px] py-3 pr-2 text-left transition-colors lg:min-w-0",

                !isActive && "hover:opacity-80"

              )}

            >

              {isActive ? (

                <span

                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--vk-dusty-rose)]"

                  aria-hidden

                />

              ) : null}

              <div className="flex items-start gap-2.5 pl-3">

                <span className="text-base leading-none mt-0.5" aria-hidden>

                  {item.icon}

                </span>

                <div className="min-w-0 flex-1">

                  <p

                    className={cn(

                      "truncate text-[14px] leading-tight",

                      isActive ? "font-semibold text-[var(--vk-text)]" : "font-medium text-[var(--vk-text)]"

                    )}

                  >

                    {item.label}

                  </p>

                  <p className="vk-meta mt-1">{formatSidebarMeta(item)}</p>

                </div>

              </div>

            </button>

          );

        })}

      </nav>

    </aside>

  );

}

