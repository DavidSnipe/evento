import { createClient } from "@/lib/supabase/server";
import { getVendorFoundationSnapshot } from "@/lib/vendors/queries";
import {
  categoryLabel,
  groupVendorsByCategory,
  getSelectedOfferInService,
} from "@/lib/vendors/grouping";
import type {
  BudgetItem,
  BudgetLineItem,
  BudgetLineStatus,
  BudgetSnapshot,
  BudgetCategorySummary,
} from "@/types/budget";
import type { VendorCategoryRow, VendorFoundationSnapshot } from "@/types/vendors";

function lineStatus(line: Omit<BudgetLineItem, "status">): BudgetLineStatus {
  if (line.source === "vendor") return "vendor_locked";
  if (line.actual_cost <= 0 && line.paid_amount <= 0) return "unpaid";
  if (line.actual_cost > 0 && line.paid_amount >= line.actual_cost) return "paid";
  if (line.paid_amount > 0) return "partial";
  return "unpaid";
}

function sumPaid(vendor: { payments: { paid_amount: number | string }[] }): number {
  return vendor.payments.reduce((acc, p) => acc + Number(p.paid_amount ?? 0), 0);
}

function resolveManualCategorySlug(
  item: BudgetItem,
  categories: VendorCategoryRow[],
  activeSlugs: string[]
): string {
  const activeSet = new Set(activeSlugs);

  if (item.category_slug && activeSet.has(item.category_slug)) {
    return item.category_slug;
  }

  const normalized = item.category.trim().toLowerCase();
  for (const cat of categories) {
    if (activeSet.has(cat.slug) && categoryLabel(cat.slug, categories).toLowerCase() === normalized) {
      return cat.slug;
    }
  }

  if (item.category_slug && activeSet.has(item.category_slug)) {
    return item.category_slug;
  }

  if (activeSet.has("other")) return "other";
  return activeSlugs[0] ?? "other";
}

function buildVendorLineItems(snapshot: VendorFoundationSnapshot): BudgetLineItem[] {
  if (!snapshot.migrationReady) return [];
  const groups = groupVendorsByCategory(
    snapshot.vendors,
    snapshot.categories as VendorCategoryRow[],
    snapshot.activeCategorySlugs,
    snapshot.services
  );
  const lines: BudgetLineItem[] = [];
  for (const group of groups) {
    for (const sg of group.services) {
      const selected = getSelectedOfferInService(sg.service, sg.vendors);
      if (!selected) continue;
      const { vendor, offer } = selected;
      const offerPrice = offer.price != null ? Number(offer.price) : 0;
      const contractValue =
        vendor.contract?.contract_value != null ? Number(vendor.contract.contract_value) : null;
      const base = {
        id: `vendor:${sg.service.id}:${offer.id}`,
        source: "vendor" as const,
        category: group.label,
        categorySlug: group.slug,
        title: vendor.name,
        estimated_cost: offerPrice,
        actual_cost: contractValue ?? offerPrice,
        paid_amount: sumPaid(vendor),
        due_date: null,
        created_at: sg.service.created_at,
        vendorId: vendor.id,
        offerId: offer.id,
        serviceId: sg.service.id,
        serviceName: offer.title !== vendor.name ? offer.title : sg.service.name,
      };
      lines.push({ ...base, status: lineStatus(base) });
    }
  }
  return lines;
}

function buildManualLineItems(
  items: BudgetItem[],
  snapshot: VendorFoundationSnapshot
): BudgetLineItem[] {
  if (!snapshot.migrationReady) return [];
  const categories = snapshot.categories as VendorCategoryRow[];
  const lines: BudgetLineItem[] = [];
  for (const item of items) {
    const slug = resolveManualCategorySlug(item, categories, snapshot.activeCategorySlugs);
    if (!snapshot.activeCategorySlugs.includes(slug)) continue;
    const base = {
      id: item.id,
      source: "manual" as const,
      category: categoryLabel(slug, categories),
      categorySlug: slug,
      title: item.title,
      estimated_cost: Number(item.estimated_cost),
      actual_cost: Number(item.actual_cost),
      paid_amount: Number(item.paid_amount),
      due_date: item.due_date,
      created_at: item.created_at,
    };
    lines.push({ ...base, status: lineStatus(base) });
  }
  return lines;
}

function buildCategorySummaries(
  vendorSnapshot: VendorFoundationSnapshot,
  vendorLines: BudgetLineItem[],
  manualLines: BudgetLineItem[]
): BudgetCategorySummary[] {
  if (!vendorSnapshot.migrationReady) return [];

  const groups = groupVendorsByCategory(
    vendorSnapshot.vendors,
    vendorSnapshot.categories as VendorCategoryRow[],
    vendorSnapshot.activeCategorySlugs,
    vendorSnapshot.services
  );
  const categories = vendorSnapshot.categories as VendorCategoryRow[];
  const allLines = [...vendorLines, ...manualLines];
  const grandActual = allLines.reduce((sum, line) => sum + line.actual_cost, 0);

  return groups.map((group) => {
    const catRow = categories.find((c) => c.slug === group.slug);
    const items = allLines
      .filter((line) => line.categorySlug === group.slug)
      .sort((a, b) => {
        if (a.source !== b.source) return a.source === "vendor" ? -1 : 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    const estimatedTotal = items.reduce((sum, item) => sum + item.estimated_cost, 0);
    const actualTotal = items.reduce((sum, item) => sum + item.actual_cost, 0);
    const paidTotal = items.reduce((sum, item) => sum + item.paid_amount, 0);

    return {
      slug: group.slug,
      label: group.label,
      sortOrder: catRow?.sort_order ?? 999,
      estimatedTotal,
      actualTotal,
      paidTotal,
      remainingTotal: actualTotal - paidTotal,
      sharePercent: grandActual > 0 ? Math.round((actualTotal / grandActual) * 100) : 0,
      items,
      hasVendorItems: items.some((item) => item.source === "vendor"),
      hasManualItems: items.some((item) => item.source === "manual"),
    };
  });
}

function buildBudgetSnapshot(
  manualItems: BudgetItem[],
  vendorSnapshot: VendorFoundationSnapshot,
  budgetTarget: number | null
): BudgetSnapshot {
  const vendorLines = buildVendorLineItems(vendorSnapshot);
  const manualLines = buildManualLineItems(manualItems, vendorSnapshot);
  const allItems = [...vendorLines, ...manualLines];

  const totals = allItems.reduce(
    (acc, item) => ({
      estimated: acc.estimated + item.estimated_cost,
      actual: acc.actual + item.actual_cost,
      paid: acc.paid + item.paid_amount,
      remaining: acc.remaining + (item.actual_cost - item.paid_amount),
    }),
    { estimated: 0, actual: 0, paid: 0, remaining: 0 }
  );

  const targetRemaining =
    budgetTarget != null && budgetTarget > 0 ? budgetTarget - totals.actual : null;
  const targetUsedPercent =
    budgetTarget != null && budgetTarget > 0
      ? Math.min(100, Math.round((totals.actual / budgetTarget) * 100))
      : null;

  return {
    categories: buildCategorySummaries(vendorSnapshot, vendorLines, manualLines),
    allItems,
    budgetTarget,
    totals: {
      ...totals,
      targetRemaining,
      targetUsedPercent,
    },
    vendorSnapshotReady: vendorSnapshot.migrationReady,
  };
}

export async function getBudgetItems(eventId: string): Promise<BudgetItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching budget items:", error);
    return [];
  }

  return data ?? [];
}

async function getEventBudgetTarget(eventId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("budget_target")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching budget target:", error);
    return null;
  }

  return data?.budget_target != null ? Number(data.budget_target) : null;
}

export async function getBudgetSnapshot(eventId: string): Promise<BudgetSnapshot> {
  const [manualItems, vendorSnapshot, budgetTarget] = await Promise.all([
    getBudgetItems(eventId),
    getVendorFoundationSnapshot(eventId),
    getEventBudgetTarget(eventId),
  ]);

  return buildBudgetSnapshot(manualItems, vendorSnapshot, budgetTarget);
}
