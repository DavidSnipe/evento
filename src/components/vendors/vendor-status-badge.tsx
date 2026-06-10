"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { VendorStatus } from "@/types/vendors";
import { statusLabel } from "@/lib/vendors/grouping";

const STATUS_STYLES: Record<string, string> = {
  researching: "bg-slate-100 text-slate-700 border-slate-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-100",
  offer_received: "bg-amber-50 text-amber-800 border-amber-100",
  negotiating: "bg-orange-50 text-orange-800 border-orange-100",
  selected: "bg-emerald-50 text-emerald-800 border-emerald-100",
  rejected: "bg-red-50 text-red-700 border-red-100",
  contract_signed: "bg-primary/10 text-primary border-primary/20",
};

export function VendorStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.researching
      )}
    >
      {statusLabel(status as VendorStatus)}
    </span>
  );
}

export function SelectedPackageBadge({
  compact,
  packageName,
}: {
  compact?: boolean;
  packageName?: string;
}) {
  const label = compact
    ? packageName
      ? `${ro.vendors.workspace.selectedShort}: ${packageName}`
      : ro.vendors.workspace.selectedShort
    : packageName
      ? `${ro.vendors.workspace.selectedPackage}: ${packageName}`
      : ro.vendors.workspace.selectedPackage;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-medium text-white max-w-[200px] truncate">
      <Check className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** @deprecated Use SelectedPackageBadge */
export const SelectedOfferBadge = SelectedPackageBadge;

export function CategoryProgressBadge({ progress }: { progress: string }) {
  const styles: Record<string, string> = {
    none: "bg-muted text-muted-foreground",
    researching: "bg-slate-100 text-slate-600",
    offer_received: "bg-amber-50 text-amber-800",
    selected: "bg-emerald-50 text-emerald-800",
    contract_signed: "bg-primary/10 text-primary",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[progress] ?? styles.none
      )}
    >
      {ro.vendors.workspace.progress[progress as keyof typeof ro.vendors.workspace.progress] ??
        progress}
    </span>
  );
}
