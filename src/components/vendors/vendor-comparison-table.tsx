"use client";

import { Check } from "lucide-react";

import { formatVendorPrice } from "@/lib/vendors/format";
import type { VendorComparisonRow } from "@/lib/vendors/grouping";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type VendorComparisonTableProps = {
  rows: VendorComparisonRow[];
  canEdit: boolean;
  onFocusVendor: (vendorId: string) => void;
};

export function VendorComparisonTable({
  rows,
  canEdit,
  onFocusVendor,
}: VendorComparisonTableProps) {
  if (rows.length < 2) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">{ro.vendors.workspace.compareVendors}</h4>

      <div className="hidden overflow-hidden rounded-xl border border-border/60 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">{ro.vendors.workspace.colVendor}</th>
              <th className="px-4 py-3 font-medium">{ro.vendors.workspace.colPackages}</th>
              <th className="px-4 py-3 font-medium">{ro.vendors.workspace.colFromPrice}</th>
              <th className="px-4 py-3 font-medium">{ro.vendors.workspace.colSelectedPackage}</th>
              {canEdit && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.vendorId}
                className={cn(
                  "border-b border-border/40 last:border-0",
                  row.isSelected && "bg-emerald-50/60"
                )}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{row.vendorName}</p>
                  {row.contactPerson && (
                    <p className="text-xs text-muted-foreground">{row.contactPerson}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.packageCount}</td>
                <td className="px-4 py-3 font-serif font-semibold">
                  {formatVendorPrice(row.fromPrice, row.currency)}
                </td>
                <td className="px-4 py-3">
                  {row.isSelected && row.selectedPackageTitle ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {row.selectedPackageTitle}
                        {row.selectedPackagePrice != null && (
                          <span className="ml-1 font-serif font-semibold">
                            · {formatVendorPrice(row.selectedPackagePrice, row.currency)}
                          </span>
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onFocusVendor(row.vendorId)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {row.isSelected
                        ? ro.vendors.workspace.viewPackages
                        : ro.vendors.workspace.choosePackage}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div
            key={row.vendorId}
            className={cn(
              "rounded-xl border border-border/60 p-4 space-y-2",
              row.isSelected && "border-emerald-200 bg-emerald-50/50"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.vendorName}</p>
                {row.contactPerson && (
                  <p className="text-xs text-muted-foreground">{row.contactPerson}</p>
                )}
              </div>
              {row.isSelected && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  {ro.vendors.workspace.selectedShort}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {row.packageCount}{" "}
              {row.packageCount === 1
                ? ro.vendors.workspace.packageSingular
                : ro.vendors.workspace.packagePlural}{" "}
              · {ro.vendors.workspace.colFromPrice}{" "}
              <span className="font-serif font-semibold text-foreground">
                {formatVendorPrice(row.fromPrice, row.currency)}
              </span>
            </p>
            {row.isSelected && row.selectedPackageTitle && (
              <p className="text-sm text-emerald-800">
                {ro.vendors.workspace.selectedPackage}: {row.selectedPackageTitle}
              </p>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => onFocusVendor(row.vendorId)}
                className="text-sm font-medium text-primary"
              >
                {row.isSelected
                  ? ro.vendors.workspace.viewPackages
                  : ro.vendors.workspace.choosePackage}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
