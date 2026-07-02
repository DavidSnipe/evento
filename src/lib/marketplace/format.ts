import { ro } from "@/lib/i18n/ro";
import type { MarketplaceVendorPackage } from "@/types/marketplace";

export function formatPackagePrice(pkg: MarketplaceVendorPackage): string {
  if (!pkg.price_is_visible) return ro.marketplace.priceOnRequest;

  if (pkg.price_label?.trim()) return pkg.price_label.trim();

  const currency = pkg.price_currency || "RON";
  if (pkg.price_from != null && pkg.price_to != null) {
    return `${pkg.price_from} – ${pkg.price_to} ${currency}`;
  }
  if (pkg.price_from != null) return `${ro.marketplace.fromPrice} ${pkg.price_from} ${currency}`;
  if (pkg.price_to != null) return `${ro.marketplace.upToPrice} ${pkg.price_to} ${currency}`;

  return ro.marketplace.priceOnRequest;
}

export function formatLocation(city: string | null, county: string | null): string | null {
  const parts = [city?.trim(), county?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
