"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { updateVendorPackages } from "@/app/(vendor)/vendor/actions";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import type { MarketplaceVendorPackageInput } from "@/lib/admin/marketplace-vendor-input";
import type { MarketplaceVendorPackage } from "@/types/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow } from "@/types/vendors";

type VendorPackagesEditorProps = {
  packages: MarketplaceVendorPackage[];
  categories: VendorCategoryRow[];
};

function emptyPackage(index: number): MarketplaceVendorPackageInput {
  return {
    category_slug: null,
    name: "",
    description: null,
    price_from: null,
    price_to: null,
    price_currency: "RON",
    price_label: null,
    price_is_visible: true,
    sort_order: index,
  };
}

function toInput(pkg: MarketplaceVendorPackage, index: number): MarketplaceVendorPackageInput {
  return {
    id: pkg.id,
    category_slug: pkg.category_slug,
    name: pkg.name,
    description: pkg.description,
    price_from: pkg.price_from,
    price_to: pkg.price_to,
    price_currency: pkg.price_currency,
    price_label: pkg.price_label,
    price_is_visible: pkg.price_is_visible,
    sort_order: index,
  };
}

export function VendorPackagesEditor({ packages, categories }: VendorPackagesEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MarketplaceVendorPackageInput[]>(
    packages.length ? packages.map(toInput) : [emptyPackage(0)]
  );

  const move = (index: number, direction: -1 | 1) => {
    setRows((items) => {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return items;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => {
    if (!window.confirm(ro.vendor.packages.deleteConfirm)) return;
    setRows((items) => items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setError(null);
    startTransition(() => {
      void updateVendorPackages(rows).then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Eroare la salvare.");
          return;
        }
        router.refresh();
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRows((p) => [...p, emptyPackage(p.length)])}
        >
          <Plus className="mr-1 h-4 w-4" />
          {ro.vendor.packages.add}
        </Button>
      </div>

      <div className="space-y-4">
        {rows.map((pkg, index) => (
          <div key={index} className="rounded-[14px] border border-[var(--dash-hairline)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder={ro.admin.vendors.form.packageName}
                value={pkg.name}
                onChange={(e) =>
                  setRows((p) =>
                    p.map((row, i) => (i === index ? { ...row, name: e.target.value } : row))
                  )
                }
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={pkg.category_slug ?? ""}
                onChange={(e) =>
                  setRows((p) =>
                    p.map((row, i) =>
                      i === index ? { ...row, category_slug: e.target.value || null } : row
                    )
                  )
                }
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {getMarketplaceCategoryLabel(c.slug)}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
                placeholder={ro.admin.vendors.form.packageDescription}
                value={pkg.description ?? ""}
                onChange={(e) =>
                  setRows((p) =>
                    p.map((row, i) =>
                      i === index ? { ...row, description: e.target.value || null } : row
                    )
                  )
                }
              />
              <Input
                type="number"
                placeholder={ro.admin.vendors.form.priceFrom}
                value={pkg.price_from ?? ""}
                onChange={(e) =>
                  setRows((p) =>
                    p.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            price_from: e.target.value ? Number(e.target.value) : null,
                          }
                        : row
                    )
                  )
                }
              />
              <Input
                type="number"
                placeholder={ro.admin.vendors.form.priceTo}
                value={pkg.price_to ?? ""}
                onChange={(e) =>
                  setRows((p) =>
                    p.map((row, i) =>
                      i === index
                        ? { ...row, price_to: e.target.value ? Number(e.target.value) : null }
                        : row
                    )
                  )
                }
              />
              <Input
                placeholder="Etichetă preț (ex: de la)"
                value={pkg.price_label ?? ""}
                onChange={(e) =>
                  setRows((p) =>
                    p.map((row, i) =>
                      i === index ? { ...row, price_label: e.target.value || null } : row
                    )
                  )
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pkg.price_is_visible}
                  onChange={(e) =>
                    setRows((p) =>
                      p.map((row, i) =>
                        i === index ? { ...row, price_is_visible: e.target.checked } : row
                      )
                    )
                  }
                />
                {ro.admin.vendors.form.showPrice}
              </label>
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={pending} onClick={handleSave}>
        {pending ? ro.vendor.profile.saving : ro.vendor.packages.save}
      </Button>
    </div>
  );
}
