export type BudgetItem = {
  id: string;
  event_id: string;
  category: string;
  category_slug: string | null;
  title: string;
  estimated_cost: number;
  actual_cost: number;
  paid_amount: number;
  due_date: string | null;
  created_at: string;
};

export type BudgetItemSource = "manual" | "vendor";

export type BudgetLineStatus = "vendor_locked" | "unpaid" | "partial" | "paid";

export type BudgetLineItem = {
  id: string;
  source: BudgetItemSource;
  category: string;
  categorySlug: string;
  title: string;
  estimated_cost: number;
  actual_cost: number;
  paid_amount: number;
  due_date: string | null;
  created_at: string;
  status: BudgetLineStatus;
  vendorId?: string;
  offerId?: string;
  serviceId?: string;
  serviceName?: string;
};

export type BudgetCategorySummary = {
  slug: string;
  label: string;
  sortOrder: number;
  estimatedTotal: number;
  actualTotal: number;
  paidTotal: number;
  remainingTotal: number;
  sharePercent: number;
  items: BudgetLineItem[];
  hasVendorItems: boolean;
  hasManualItems: boolean;
};

export type BudgetSnapshot = {
  categories: BudgetCategorySummary[];
  allItems: BudgetLineItem[];
  budgetTarget: number | null;
  totals: {
    estimated: number;
    actual: number;
    paid: number;
    remaining: number;
    targetRemaining: number | null;
    targetUsedPercent: number | null;
  };
  vendorSnapshotReady: boolean;
};
