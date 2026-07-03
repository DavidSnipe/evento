"use client";

import { Check, Lock } from "lucide-react";

import { EmojiIcon } from "@/components/ui/emoji-icon";
import { getIconForVendorCategory } from "@/lib/icons/registry";
import {
  formatPaidWithPercent,
  paymentRowClass,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from "@/lib/budget/payment-status";
import { ro } from "@/lib/i18n/ro";
import type { BudgetLineItem } from "@/types/budget";
import { cn } from "@/lib/utils";

type BudgetSummaryExpenseTableProps = {
  items: BudgetLineItem[];
};

function formatLei(value: number) {
  return `${value.toLocaleString("ro-RO")} RON`;
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
            <th className={cn(thClass, "text-right")}>{ro.budgetModule.totalColumn}</th>
            <th className={cn(thClass, "text-right")}>{ro.budgetModule.avansColumn}</th>
            <th className={cn(thClass, "text-right")}>{ro.budgetModule.paid}</th>
            <th className={cn(thClass, "pr-4")}>{ro.budgetModule.statusColumn}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-rose-18/20">
          {items.map((item) => {
            const muted = item.status === "fully_paid";
            return (
              <tr
                key={item.id}
                className={cn(
                  rowClass,
                  item.source === "vendor" && "bg-[var(--dash-sage)]/[0.04]",
                  paymentRowClass(item.status)
                )}
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
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A0E14]">
                    {item.source === "vendor" ? (
                      <Lock className="h-3 w-3 shrink-0 text-[var(--dash-sage)]" aria-hidden />
                    ) : item.status === "fully_paid" ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    ) : null}
                    <span className={cn(muted && "text-muted-foreground")}>{item.title}</span>
                  </span>
                  {item.serviceName ? (
                    <p className="mt-0.5 truncate text-[11px] text-[var(--dash-text-muted)]">{item.serviceName}</p>
                  ) : null}
                </td>
                <td
                  className={cn(
                    tdClass,
                    "text-right tabular-nums",
                    muted ? "text-muted-foreground" : "text-text-secondary"
                  )}
                >
                  {formatLei(item.actual_cost)}
                </td>
                <td
                  className={cn(
                    tdClass,
                    "text-right tabular-nums",
                    item.status === "deposit_paid" && "line-through",
                    muted ? "text-muted-foreground" : "text-text-secondary"
                  )}
                >
                  {item.avans != null && item.avans > 0 ? formatLei(item.avans) : "—"}
                </td>
                <td
                  className={cn(
                    tdClass,
                    "text-right tabular-nums text-xs",
                    muted ? "text-muted-foreground" : "text-[var(--dash-sage)]"
                  )}
                >
                  {formatPaidWithPercent(item.paid_amount, item.actual_cost)}
                </td>
                <td className={cn(tdClass, "pr-4")}>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      paymentStatusBadgeClass(item.status)
                    )}
                  >
                    {paymentStatusLabel(item.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
