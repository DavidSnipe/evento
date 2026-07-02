import { ro } from "@/lib/i18n/ro";

export type MarketplaceCategoryOption = {
  slug: string;
  label: string;
};

/** Category options for public marketplace (no DB — works for anon). */
export function getMarketplaceCategoryOptions(): MarketplaceCategoryOption[] {
  const labels = ro.vendors.categories as Record<string, string>;
  return Object.entries(labels).map(([slug, label]) => ({ slug, label }));
}
