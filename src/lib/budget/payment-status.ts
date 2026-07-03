import { ro } from "@/lib/i18n/ro";
import type { BudgetPaymentStatus } from "@/types/budget";

export function isBudgetPaymentStatus(value: string | null | undefined): value is BudgetPaymentStatus {
  return value === "unpaid" || value === "deposit_paid" || value === "fully_paid";
}

export function derivePaymentStatus(
  total: number,
  paidAmount: number,
  avans: number | null | undefined,
  storedStatus?: string | null
): BudgetPaymentStatus {
  if (isBudgetPaymentStatus(storedStatus)) {
    return storedStatus;
  }
  if (total > 0 && paidAmount >= total) return "fully_paid";
  if (paidAmount > 0 || (avans != null && avans > 0)) return "deposit_paid";
  return "unpaid";
}

export function paymentStatusLabel(status: BudgetPaymentStatus): string {
  return ro.budgetModule.status[status];
}

export function paymentStatusBadgeClass(status: BudgetPaymentStatus): string {
  switch (status) {
    case "fully_paid":
      return "bg-emerald-50 text-emerald-700";
    case "deposit_paid":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-[var(--dash-warm-gray)]/80 text-[var(--dash-text-secondary)]";
  }
}

export function paymentRowClass(status: BudgetPaymentStatus): string {
  switch (status) {
    case "fully_paid":
      return "bg-green-50/40";
    case "deposit_paid":
      return "bg-amber-50/40";
    default:
      return "";
  }
}

export function paidPercent(paidAmount: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((paidAmount / total) * 100));
}

export function formatPaidWithPercent(paidAmount: number, total: number): string {
  const formatted = `${paidAmount.toLocaleString("ro-RO")} RON`;
  const percent = paidPercent(paidAmount, total);
  return percent != null ? `${formatted} · ${percent}%` : formatted;
}
