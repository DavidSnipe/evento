import { ro } from "@/lib/i18n/ro";
import { resolveCategoryLabel } from "@/lib/vendors/category-display";
import type {
  EventVendorWithRelations,
  VendorCategoryRow,
  VendorOfferWithSelection,
  EventVendorService,
} from "@/types/vendors";

export type CategoryProgress =
  | "none"
  | "researching"
  | "offer_received"
  | "selected"
  | "contract_signed";

export type VendorStatusFilter =
  | "all"
  | "researching"
  | "contacted"
  | "offer_received"
  | "selected"
  | "contract_signed";

export type VendorDashboardStats = {
  categoriesCompleted: number;
  packagesReceived: number;
  selectedVendors: number;
  estimatedContractedValue: number;
};

/** One row per vendor — category-level comparison (not per-package). */
export type VendorPackageTableRow = {
  rowKey: string;
  vendorId: string;
  packageId: string | null;
  vendorName: string;
  packageName: string;
  price: number | null;
  currency: string;
  contact: string;
  status: string;
  isHighlighted: boolean;
  isMuted: boolean;
};

export type CategoryPriceExtreme = {
  vendorName: string;
  packageName: string;
  price: number;
  currency: string;
};

export type CategoryWorkspaceSummary = {
  selectedVendor: EventVendorWithRelations | null;
  selectedPackage: VendorOfferWithSelection | null;
  cheapest: CategoryPriceExtreme | null;
  premium: CategoryPriceExtreme | null;
  packageCount: number;
};

export type CategorySidebarItem = {
  slug: string;
  label: string;
  icon: string;
  packageCount: number;
  selectionLabel: string;
  isChosen: boolean;
  isSystem: boolean;
};

export type CategoryAggregateSummary = {
  serviceCount: number;
  offerCount: number;
  selectedServiceCount: number;
  totalSelectedValue: number;
};

export type VendorServiceGroup = {
  service: EventVendorService;
  vendors: EventVendorWithRelations[];
  summary: CategoryWorkspaceSummary;
};

export type VendorCategoryGroup = {
  slug: string;
  label: string;
  icon: string;
  progress: CategoryProgress;
  vendors: EventVendorWithRelations[];
  services: VendorServiceGroup[];
  comparisonRows: VendorComparisonRow[];
  aggregateSummary: CategoryAggregateSummary;
};

const CATEGORY_ICONS: Record<string, string> = {
  venue: "📍",
  photographer: "📷",
  videographer: "🎬",
  dj: "🎧",
  band: "🎵",
  decorations: "✨",
  florist: "💐",
  catering: "🍽️",
  cake: "🎂",
  candy_bar: "🍬",
  photo_booth: "📸",
  transportation: "🚗",
  accommodation: "🏨",
  invitations: "💌",
  makeup: "💄",
  hair: "💇",
  wedding_planner: "📋",
  other: "📦",
};

export function vendorCategoryId(vendor: EventVendorWithRelations): string {
  return vendor.category_id ?? vendor.category ?? "other";
}

export function categoryLabel(slug: string, categories?: VendorCategoryRow[]): string {
  if (categories) return resolveCategoryLabel(slug, categories);
  return ro.vendors.categories[slug as keyof typeof ro.vendors.categories] ?? slug;
}

export function categoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] ?? "📦";
}

/** Selected package (DB: vendor_offers via selected_offer_id). */
export function getSelectedPackage(
  vendor: EventVendorWithRelations
): VendorOfferWithSelection | null {
  return (
    vendor.offers.find((o) => o.is_selected || o.id === vendor.selected_offer_id) ?? null
  );
}

/** @deprecated Alias for getSelectedPackage */
export const getSelectedOffer = getSelectedPackage;

export function minPackagePrice(vendor: EventVendorWithRelations): {
  price: number | null;
  currency: string;
} {
  let min: number | null = null;
  let currency = "RON";
  for (const pkg of vendor.offers) {
    if (pkg.price == null) continue;
    const p = Number(pkg.price);
    if (min === null || p < min) {
      min = p;
      currency = pkg.currency;
    }
  }
  return { price: min, currency };
}

export function computeCategoryProgress(
  vendors: EventVendorWithRelations[]
): CategoryProgress {
  if (vendors.length === 0) return "none";

  if (
    vendors.some(
      (v) => v.contract?.contract_signed || v.status === "contract_signed"
    )
  ) {
    return "contract_signed";
  }

  if (vendors.some((v) => v.selected_offer_id)) {
    return "selected";
  }

  if (
    vendors.some(
      (v) =>
        v.offer_count > 0 ||
        v.status === "offer_received" ||
        v.status === "negotiating"
    )
  ) {
    return "offer_received";
  }

  return "researching";
}

export function computeDashboardStats(
  vendors: EventVendorWithRelations[],
  categories: VendorCategoryRow[]
): VendorDashboardStats {
  const packagesReceived = vendors.reduce((sum, v) => sum + v.offer_count, 0);
  const selectedVendors = vendors.filter((v) => v.selected_offer_id).length;

  let estimatedContractedValue = 0;
  for (const v of vendors) {
    const selected = getSelectedPackage(v);
    if (selected?.price != null) {
      estimatedContractedValue += Number(selected.price);
    }
  }

  let categoriesCompleted = 0;
  for (const cat of categories) {
    const inCategory = vendors.filter((v) => vendorCategoryId(v) === cat.slug);
    const progress = computeCategoryProgress(inCategory);
    if (progress === "selected" || progress === "contract_signed") {
      categoriesCompleted += 1;
    }
  }

  return {
    categoriesCompleted,
    packagesReceived,
    selectedVendors,
    estimatedContractedValue,
  };
}

export function getSelectedVendorInCategory(
  vendors: EventVendorWithRelations[]
): EventVendorWithRelations | null {
  return vendors.find((v) => v.selected_offer_id) ?? null;
}

export function countCategoryPackages(vendors: EventVendorWithRelations[]): number {
  return vendors.reduce((sum, v) => sum + v.offer_count, 0);
}

export function buildCategorySidebarItems(
  groups: VendorCategoryGroup[],
  categories: VendorCategoryRow[]
): CategorySidebarItem[] {
  return groups.map((g) => {
    const row = categories.find((c) => c.slug === g.slug);
    const selected =
      g.services.some((s) => s.service.selected_offer_id) ||
      getSelectedVendorInCategory(g.vendors);
    const packageCount = g.aggregateSummary.offerCount;
    return {
      slug: g.slug,
      label: categoryLabel(g.slug, categories),
      icon: g.icon,
      packageCount,
      selectionLabel: selected
        ? ro.vendors.workspace.sidebarChosen
        : ro.vendors.workspace.sidebarAnalyzing,
      isChosen: Boolean(selected),
      isSystem: row?.is_system ?? true,
    };
  });
}

export function findPriceExtremes(
  vendors: EventVendorWithRelations[]
): { cheapest: CategoryPriceExtreme | null; premium: CategoryPriceExtreme | null } {
  let cheapest: CategoryPriceExtreme | null = null;
  let premium: CategoryPriceExtreme | null = null;

  for (const vendor of vendors) {
    for (const pkg of vendor.offers) {
      if (pkg.price == null) continue;
      const price = Number(pkg.price);
      const entry: CategoryPriceExtreme = {
        vendorName: vendor.name,
        packageName: pkg.title,
        price,
        currency: pkg.currency,
      };
      if (!cheapest || price < cheapest.price) cheapest = entry;
      if (!premium || price > premium.price) premium = entry;
    }
  }

  return { cheapest, premium };
}

export function getSelectedOfferInService(
  service: EventVendorService,
  vendors: EventVendorWithRelations[]
): {
  vendor: EventVendorWithRelations;
  offer: VendorOfferWithSelection;
} | null {
  if (!service.selected_offer_id) return null;
  for (const vendor of vendors) {
    const offer = vendor.offers.find((o) => o.id === service.selected_offer_id);
    if (offer) return { vendor, offer };
  }
  return null;
}

export function buildServiceWorkspaceSummary(
  service: EventVendorService,
  vendors: EventVendorWithRelations[]
): CategoryWorkspaceSummary {
  const selected = getSelectedOfferInService(service, vendors);
  const { cheapest, premium } = findPriceExtremes(vendors);

  return {
    selectedVendor: selected?.vendor ?? null,
    selectedPackage: selected?.offer ?? null,
    cheapest,
    premium,
    packageCount: countCategoryPackages(vendors),
  };
}

export function buildCategoryAggregateSummary(
  services: VendorServiceGroup[]
): CategoryAggregateSummary {
  let selectedServiceCount = 0;
  let totalSelectedValue = 0;
  let offerCount = 0;

  for (const group of services) {
    offerCount += countCategoryPackages(group.vendors);
    if (group.service.selected_offer_id) {
      selectedServiceCount += 1;
      const selected = getSelectedOfferInService(group.service, group.vendors);
      if (selected?.offer.price != null) {
        totalSelectedValue += Number(selected.offer.price);
      }
    }
  }

  return {
    serviceCount: services.length,
    offerCount,
    selectedServiceCount,
    totalSelectedValue,
  };
}

export function buildCategoryWorkspaceSummary(
  vendors: EventVendorWithRelations[]
): CategoryWorkspaceSummary {
  const selectedVendor = getSelectedVendorInCategory(vendors);
  const selectedPackage = selectedVendor ? getSelectedPackage(selectedVendor) : null;
  const { cheapest, premium } = findPriceExtremes(vendors);

  return {
    selectedVendor,
    selectedPackage,
    cheapest,
    premium,
    packageCount: countCategoryPackages(vendors),
  };
}

export function buildVendorPackageTableRows(
  vendors: EventVendorWithRelations[]
): VendorPackageTableRow[] {
  const selectedVendorId = getSelectedVendorInCategory(vendors)?.id ?? null;
  const rows: VendorPackageTableRow[] = [];

  for (const vendor of vendors) {
    const contact =
      [vendor.contact_person, vendor.phone].filter(Boolean).join(" · ") || "—";

    if (vendor.offers.length === 0) {
      rows.push({
        rowKey: `${vendor.id}-empty`,
        vendorId: vendor.id,
        packageId: null,
        vendorName: vendor.name,
        packageName: "—",
        price: null,
        currency: "RON",
        contact,
        status: vendor.status,
        isHighlighted: false,
        isMuted: Boolean(selectedVendorId && selectedVendorId !== vendor.id),
      });
      continue;
    }

    for (const pkg of vendor.offers) {
      const isSelectedPackage = vendor.selected_offer_id === pkg.id;
      const isHighlighted =
        Boolean(selectedVendorId && vendor.id === selectedVendorId && isSelectedPackage);
      const isMuted =
        Boolean(selectedVendorId) &&
        (!isHighlighted ||
          (vendor.id === selectedVendorId && !isSelectedPackage));

      rows.push({
        rowKey: `${vendor.id}-${pkg.id}`,
        vendorId: vendor.id,
        packageId: pkg.id,
        vendorName: vendor.name,
        packageName: pkg.title,
        price: pkg.price != null ? Number(pkg.price) : null,
        currency: pkg.currency,
        contact,
        status: vendor.status,
        isHighlighted,
        isMuted,
      });
    }
  }

  return rows.sort((a, b) => {
    const pa = a.price ?? Infinity;
    const pb = b.price ?? Infinity;
    return pa - pb;
  });
}

/** @deprecated Use buildVendorPackageTableRows */
export function buildVendorComparisonRows(
  vendors: EventVendorWithRelations[]
): VendorComparisonRow[] {
  return vendors.map((vendor) => {
    const selected = getSelectedPackage(vendor);
    const { price: fromPrice, currency } = minPackagePrice(vendor);
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      contactPerson: vendor.contact_person,
      phone: vendor.phone,
      packageCount: vendor.offer_count,
      fromPrice,
      currency,
      selectedPackageTitle: selected?.title ?? null,
      selectedPackagePrice: selected?.price != null ? Number(selected.price) : null,
      isSelected: Boolean(vendor.selected_offer_id),
    };
  });
}

export type VendorComparisonRow = {
  vendorId: string;
  vendorName: string;
  contactPerson: string | null;
  phone: string | null;
  packageCount: number;
  fromPrice: number | null;
  currency: string;
  selectedPackageTitle: string | null;
  selectedPackagePrice: number | null;
  isSelected: boolean;
};

export function filterVendors(
  vendors: EventVendorWithRelations[],
  search: string,
  statusFilter: VendorStatusFilter,
  categories: VendorCategoryRow[] = []
): EventVendorWithRelations[] {
  const q = search.trim().toLowerCase();

  return vendors.filter((v) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;

    if (!q) return true;

    const cat = categoryLabel(vendorCategoryId(v), categories).toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      cat.includes(q) ||
      (v.contact_person?.toLowerCase().includes(q) ?? false)
    );
  });
}

/** Active categories for this event (empty slugs = show none until activated). */
export function groupVendorsByCategory(
  vendors: EventVendorWithRelations[],
  categories: VendorCategoryRow[],
  activeSlugs: string[],
  services: EventVendorService[] = []
): VendorCategoryGroup[] {
  const activeSet = new Set(activeSlugs);
  const sorted = [...categories]
    .filter((cat) => activeSet.has(cat.slug))
    .sort((a, b) => a.sort_order - b.sort_order);

  return sorted.map((cat) => {
    const inCategory = vendors.filter((v) => vendorCategoryId(v) === cat.slug);
    const categoryServices = services
      .filter((s) => s.category_slug === cat.slug)
      .sort((a, b) => a.sort_order - b.sort_order);

    const serviceGroups: VendorServiceGroup[] = categoryServices.map((service) => {
      const inService = inCategory.filter((v) => v.service_id === service.id);
      return {
        service,
        vendors: inService,
        summary: buildServiceWorkspaceSummary(service, inService),
      };
    });

    const assignedIds = new Set(
      serviceGroups.flatMap((g) => g.vendors.map((v) => v.id))
    );
    const orphans = inCategory.filter((v) => !assignedIds.has(v.id));
    if (orphans.length > 0 && serviceGroups[0]) {
      serviceGroups[0] = {
        ...serviceGroups[0],
        vendors: [...serviceGroups[0].vendors, ...orphans],
        summary: buildServiceWorkspaceSummary(serviceGroups[0].service, [
          ...serviceGroups[0].vendors,
          ...orphans,
        ]),
      };
    }

    return {
      slug: cat.slug,
      label: categoryLabel(cat.slug, categories),
      icon: categoryIcon(cat.slug),
      progress: computeCategoryProgress(inCategory),
      vendors: inCategory,
      services: serviceGroups,
      comparisonRows: buildVendorComparisonRows(inCategory),
      aggregateSummary: buildCategoryAggregateSummary(serviceGroups),
    };
  });
}

export function categoryMatchesSearch(slug: string, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return categoryLabel(slug).toLowerCase().includes(q);
}

export function progressLabel(progress: CategoryProgress): string {
  return ro.vendors.workspace.progress[progress];
}

export function statusLabel(status: string): string {
  return ro.vendors.status[status as keyof typeof ro.vendors.status] ?? status;
}
