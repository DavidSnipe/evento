"use client";

import { EmojiIcon } from "@/components/ui/emoji-icon";
import { getIconForVendorCategory } from "@/lib/icons/registry";
import { ro } from "@/lib/i18n/ro";
import type { BudgetLineItem, BudgetLineStatus } from "@/types/budget";
import { cn } from "@/lib/utils";

type BudgetSummaryExpenseTableProps = {
  items: BudgetLineItem[];
};

function formatLei(value: number) {
  return `${value.toLocaleString("ro-RO")} RON`;
}

function statusLabel(status: BudgetLineStatus) {
  switch (status) {
    case "vendor_locked":
      return ro.budgetModule.statusVendor;
    case "paid":
      return ro.budgetModule.statusPaid;
    case "partial":
      return ro.budgetModule.statusPartial;
    default:
      return ro.budgetModule.statusUnpaid;
  }
}

function statusClass(status: BudgetLineStatus) {
  switch (status) {
    case "vendor_locked":
      return "bg-[var(--dash-sage)]/15 text-[var(--dash-sage)]";
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "partial":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-[var(--dash-warm-gray)]/80 text-[var(--dash-text-secondary)]";
  }
}

const thClass =
  "px-4 py-3 text-left text-[9.5px] font-bold uppercase tracking-wider text-text-subtle border-r border-border-rose-18/20 last:border-r-0";

const tdClass = "px-4 py-2.5 align-middle text-xs border-r border-border-rose-18/20 last:border-r-0";

const rowClass =
  "border-b border-border-rose-18/20 transition-colors duration-200 hover:bg-[#FEF0F3]/12";

export function BudgetSummaryExpenseTable({ items }: BudgetSummaryExpenseTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-border-rose-18/40 bg-white/40 py-12 text-center">
        <p className="text-[13px] font-medium text-[var(--dash-text-secondary)]">{ro.budgetModule.noExpenses}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[18px] border border-border-rose-18 bg-white/70 shadow-card backdrop-blur-md">
      <table className="min-w-full w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-rose-18/60 bg-[#F3F3F5]/40">
            <th className={cn(thClass, "pl-4")}>{ro.budgetModule.categoryLabel}</th>
            <th className={thClass}>{ro.budgetModule.nameColumn}</th>
            <th className={cn(thClass, "text-right")}>{ro.budgetModule.estimated}</th>
            <th className={cn(thClass, "text-right")}>{ro.budgetModule.paid}</th>
            <th className={cn(thClass, "pr-4")}>{ro.budgetModule.statusColumn}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-rose-18/20">
          {items.map((item) => (
            <tr
              key={item.id}
              className={cn(rowClass, item.source === "vendor" && "bg-[var(--dash-sage)]/[0.04]")}
            >
              <td className={cn(tdClass, "pl-4")}>
                <div className="flex items-center gap-2">
                  <EmojiIcon
                    icon={getIconForVendorCategory(item.categorySlug)}
                    size="sm"
                    className="shrink-0"
                  />
                  <span className="truncate text-xs font-medium text-[var(--dash-text-secondary)]">
                    {item.category}
                  </span>
                </div>
              </td>
              <td className={tdClass}>
                <span className="text-xs font-semibold text-[#1A0E14]">{item.title}</span>
                {item.serviceName ? (
                  <p className="mt-0.5 truncate text-[11px] text-[var(--dash-text-muted)]">{item.serviceName}</p>
                ) : null}
              </td>
              <td className={cn(tdClass, "text-right tabular-nums text-text-secondary")}>
                {formatLei(item.estimated_cost)}
              </td>
              <td className={cn(tdClass, "text-right tabular-nums text-[var(--dash-sage)]")}>
                {formatLei(item.paid_amount)}
              </td>
              <td className={cn(tdClass, "pr-4")}>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    statusClass(item.status)
                  )}
                >
                  {statusLabel(item.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
