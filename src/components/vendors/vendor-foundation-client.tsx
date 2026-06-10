"use client";

import type { ComponentType } from "react";
import {
  Building2,
  CheckCircle2,
  FileText,
  Layers,
  AlertTriangle,
  Wallet,
} from "lucide-react";

import { ro } from "@/lib/i18n/ro";
import type { VendorFoundationSnapshot } from "@/types/vendors";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel flex flex-col gap-2 rounded-2xl p-6", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-serif text-3xl font-bold">{value}</span>
    </div>
  );
}

export function VendorFoundationClient({
  snapshot,
  canEdit,
}: {
  snapshot: VendorFoundationSnapshot;
  canEdit: boolean;
}) {
  const { migrationReady, stats, categories, vendors } = snapshot;

  return (
    <div className="space-y-8">
      {!migrationReady && (
        <div
          className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">{ro.vendors.foundation.migrationRequired}</p>
            <p className="mt-1 text-amber-800/90">{ro.vendors.foundation.migrationHint}</p>
          </div>
        </div>
      )}

      {migrationReady && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {ro.vendors.foundation.migrationReady}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={ro.vendors.foundation.vendorCount}
          value={stats.vendorCount}
          icon={Building2}
        />
        <StatCard
          label={ro.vendors.foundation.offerCount}
          value={stats.offerCount}
          icon={Layers}
          className="bg-[#FEF0F3]/40"
        />
        <StatCard
          label={ro.vendors.foundation.selectedCount}
          value={stats.selectedCount}
          icon={CheckCircle2}
          className="bg-emerald-50/80 border-emerald-100"
        />
        <StatCard
          label={ro.vendors.foundation.pendingPayments}
          value={stats.pendingPaymentCount}
          icon={Wallet}
        />
      </div>

      <div className="glass-panel space-y-4 rounded-2xl p-6">
        <h2 className="font-serif text-xl font-semibold">{ro.vendors.foundation.architecture}</h2>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
            {ro.vendors.foundation.featureOffers}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            {ro.vendors.foundation.featureSelection}
          </li>
          <li className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
            {ro.vendors.foundation.featureContracts}
          </li>
          <li className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 shrink-0 text-primary" />
            {ro.vendors.foundation.featurePayments}
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">{ro.vendors.foundation.comingSoon}</p>
      </div>

      {migrationReady && categories.length > 0 && (
        <div className="glass-panel space-y-3 rounded-2xl p-6">
          <h2 className="font-serif text-lg font-semibold">
            {ro.vendors.foundation.categoriesTitle} ({categories.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.slug}
                className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs"
              >
                {ro.vendors.categories[c.slug as keyof typeof ro.vendors.categories] ??
                  c.slug}
              </span>
            ))}
          </div>
        </div>
      )}

      {vendors.length > 0 && (
        <div className="glass-panel space-y-3 rounded-2xl p-6">
          <h2 className="font-serif text-lg font-semibold">{ro.vendors.foundation.vendorList}</h2>
          <ul className="divide-y divide-border/50">
            {vendors.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{v.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {v.category_id
                      ? ro.vendors.categories[
                          v.category_id as keyof typeof ro.vendors.categories
                        ] ?? v.category_id
                      : v.category}{" "}
                    · {ro.vendors.status[v.status as keyof typeof ro.vendors.status] ?? v.status}
                  </p>
                </div>
                <div className="text-muted-foreground text-xs">
                  {ro.vendors.foundation.offersLabel}: {v.offer_count}
                  {v.selected_offer_id && (
                    <span className="ml-2 text-emerald-600">
                      · {ro.vendors.foundation.selectedLabel}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!canEdit && (
        <p className="text-center text-sm text-muted-foreground">{ro.vendors.foundation.readOnly}</p>
      )}
    </div>
  );
}
