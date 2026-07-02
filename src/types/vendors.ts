/** System catalog row — extensible via DB inserts. */
export type VendorCategoryRow = {
  slug: string;
  label_key: string;
  sort_order: number;
  is_system: boolean;
  created_at: string;
};

/** Predefined service template inside a vendor category (global catalog). */
export type VendorServiceTemplate = {
  id: string;
  category_slug: string;
  label_key: string;
  icon_key: string | null;
  sort_order: number;
  created_at: string;
};

/** Scoped service inside a category (e.g. Buchet mireasă). */
export type EventVendorService = {
  id: string;
  event_id: string;
  category_slug: string;
  name: string;
  selected_offer_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at?: string;
};

export const VENDOR_STATUSES = [
  "researching",
  "contacted",
  "offer_received",
  "negotiating",
  "selected",
  "rejected",
  "contract_signed",
] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const VENDOR_PAYMENT_TYPES = [
  "deposit",
  "intermediate",
  "final_payment",
] as const;

export type VendorPaymentType = (typeof VENDOR_PAYMENT_TYPES)[number];

export const VENDOR_TIMELINE_HOOK_TYPES = [
  "vendor_selected",
  "deposit_due",
  "final_payment_due",
  "contract_signed",
] as const;

export type VendorTimelineHookType = (typeof VENDOR_TIMELINE_HOOK_TYPES)[number];

/** Event-level vendor (extends legacy `vendors` table). */
export type EventVendor = {
  id: string;
  event_id: string;
  /** @deprecated Legacy free-text; prefer category_id */
  category: string;
  category_id: string | null;
  service_id: string | null;
  marketplace_vendor_id: string | null;
  /** Populated when joined from marketplace_vendors */
  marketplace_slug?: string | null;
  name: string;
  website: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  status: VendorStatus | string;
  notes: string | null;
  selected_offer_id: string | null;
  created_at: string;
  updated_at?: string;
};

export type VendorOffer = {
  id: string;
  vendor_id: string;
  event_id: string;
  title: string;
  price: number | null;
  currency: string;
  description: string | null;
  included_services: string | null;
  offer_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type VendorContract = {
  id: string;
  vendor_id: string;
  event_id: string;
  contract_value: number | null;
  contract_currency: string;
  contract_date: string | null;
  contract_signed: boolean;
  attachment_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VendorPayment = {
  id: string;
  vendor_id: string;
  event_id: string;
  offer_id: string | null;
  payment_type: VendorPaymentType;
  planned_amount: number;
  paid_amount: number;
  currency: string;
  due_date: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type VendorOfferWithSelection = VendorOffer & {
  is_selected: boolean;
};

/** Vendor with relations for future list/compare UIs. */
export type EventVendorWithRelations = EventVendor & {
  categoryDetail?: VendorCategoryRow | null;
  offers: VendorOfferWithSelection[];
  contract: VendorContract | null;
  payments: VendorPayment[];
  offer_count: number;
};

export type VendorFoundationStats = {
  vendorCount: number;
  offerCount: number;
  selectedCount: number;
  contractSignedCount: number;
  pendingPaymentCount: number;
};

export type VendorFoundationSnapshot = {
  migrationReady: boolean;
  stats: VendorFoundationStats;
  categories: VendorCategoryRow[];
  /** Category slugs activated for this event (empty = legacy fallback in UI). */
  activeCategorySlugs: string[];
  services: EventVendorService[];
  vendors: EventVendorWithRelations[];
};

/** @deprecated Use EventVendor */
export type Vendor = EventVendor;

export type VendorInput = {
  categoryId: string;
  serviceId?: string | null;
  name: string;
  website?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: VendorStatus;
  notes?: string | null;
};

export type VendorOfferInput = {
  vendorId: string;
  title: string;
  price?: number | null;
  currency?: string;
  description?: string | null;
  includedServices?: string | null;
  offerDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
};

export type VendorContractInput = {
  vendorId: string;
  contractValue?: number | null;
  contractCurrency?: string;
  contractDate?: string | null;
  contractSigned?: boolean;
  attachmentUrl?: string | null;
  notes?: string | null;
};

export type VendorPaymentInput = {
  vendorId: string;
  offerId?: string | null;
  paymentType: VendorPaymentType;
  plannedAmount: number;
  paidAmount?: number;
  currency?: string;
  dueDate?: string | null;
  notes?: string | null;
};
