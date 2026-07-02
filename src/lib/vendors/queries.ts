import { createClient } from "@/lib/supabase/server";
import { isVendorFoundationSchemaMissing } from "@/lib/vendors/migration";
import type {
  EventVendor,
  EventVendorWithRelations,
  VendorCategoryRow,
  VendorContract,
  VendorFoundationSnapshot,
  VendorFoundationStats,
  VendorOffer,
  VendorPayment,
  EventVendorService,
  VendorServiceTemplate,
} from "@/types/vendors";

export async function checkVendorFoundationMigration(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_categories").select("slug").limit(1);
  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return false;
    console.error("checkVendorFoundationMigration:", error);
    return false;
  }
  return true;
}

export async function getEventVendorServices(eventId: string): Promise<EventVendorService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_vendor_services")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return [];
    console.error("getEventVendorServices:", error);
    return [];
  }

  return (data ?? []) as EventVendorService[];
}

export async function getEventActiveCategorySlugs(eventId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_vendor_categories")
    .select("category_slug")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return [];
    console.error("getEventActiveCategorySlugs:", error);
    return [];
  }

  return (data ?? []).map((r) => r.category_slug as string);
}

export async function getVendorServiceTemplates(
  categorySlug: string
): Promise<VendorServiceTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_service_templates")
    .select("*")
    .eq("category_slug", categorySlug)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return [];
    console.error("getVendorServiceTemplates:", error);
    return [];
  }

  return (data ?? []) as VendorServiceTemplate[];
}

export async function getVendorCategories(): Promise<VendorCategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isVendorFoundationSchemaMissing(error)) {
      console.error("getVendorCategories:", error);
    }
    return [];
  }

  return (data ?? []) as VendorCategoryRow[];
}

export async function getVendors(eventId: string): Promise<EventVendor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getVendors:", error);
    return [];
  }

  const vendors = (data ?? []) as EventVendor[];
  return enrichVendorsWithMarketplaceSlugs(vendors);
}

async function enrichVendorsWithMarketplaceSlugs(
  vendors: EventVendor[]
): Promise<EventVendor[]> {
  const marketplaceIds = [
    ...new Set(
      vendors.map((v) => v.marketplace_vendor_id).filter((id): id is string => Boolean(id))
    ),
  ];

  if (marketplaceIds.length === 0) return vendors;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_vendors")
    .select("id, slug")
    .in("id", marketplaceIds);

  if (error) {
    console.error("enrichVendorsWithMarketplaceSlugs:", error);
    return vendors;
  }

  const slugById = new Map((data ?? []).map((row) => [row.id as string, row.slug as string]));

  return vendors.map((vendor) => ({
    ...vendor,
    marketplace_slug: vendor.marketplace_vendor_id
      ? (slugById.get(vendor.marketplace_vendor_id) ?? null)
      : null,
  }));
}

async function getOffersByEvent(eventId: string): Promise<VendorOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_offers")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (!isVendorFoundationSchemaMissing(error)) {
      console.error("getOffersByEvent:", error);
    }
    return [];
  }

  return (data ?? []) as VendorOffer[];
}

async function getContractsByEvent(eventId: string): Promise<VendorContract[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_contracts")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    if (!isVendorFoundationSchemaMissing(error)) {
      console.error("getContractsByEvent:", error);
    }
    return [];
  }

  return (data ?? []) as VendorContract[];
}

async function getPaymentsByEvent(eventId: string): Promise<VendorPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_payments")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isVendorFoundationSchemaMissing(error)) {
      console.error("getPaymentsByEvent:", error);
    }
    return [];
  }

  return (data ?? []) as VendorPayment[];
}

function buildStats(
  vendors: EventVendorWithRelations[],
  offerCount: number
): VendorFoundationStats {
  const pendingPaymentCount = vendors.reduce((sum, v) => {
    return (
      sum +
      v.payments.filter((p) => Number(p.paid_amount) < Number(p.planned_amount)).length
    );
  }, 0);

  return {
    vendorCount: vendors.length,
    offerCount,
    selectedCount: vendors.filter((v) => v.selected_offer_id != null).length,
    contractSignedCount: vendors.filter((v) => v.contract?.contract_signed).length,
    pendingPaymentCount,
  };
}

export async function getVendorFoundationSnapshot(
  eventId: string
): Promise<VendorFoundationSnapshot> {
  const migrationReady = await checkVendorFoundationMigration();

  if (!migrationReady) {
    const legacyVendors = await getVendors(eventId);
    return {
      migrationReady: false,
      stats: {
        vendorCount: legacyVendors.length,
        offerCount: 0,
        selectedCount: 0,
        contractSignedCount: 0,
        pendingPaymentCount: 0,
      },
      categories: [],
      activeCategorySlugs: [],
      services: [],
      vendors: legacyVendors.map((v) => ({
        ...v,
        category_id: v.category_id ?? null,
        service_id: v.service_id ?? null,
        offers: [],
        contract: null,
        payments: [],
        offer_count: 0,
      })),
    };
  }

  const [categories, activeCategorySlugs, services, vendors, offers, contracts, payments] =
    await Promise.all([
      getVendorCategories(),
      getEventActiveCategorySlugs(eventId),
      getEventVendorServices(eventId),
      getVendors(eventId),
      getOffersByEvent(eventId),
      getContractsByEvent(eventId),
      getPaymentsByEvent(eventId),
    ]);

  const resolvedActiveSlugs =
    activeCategorySlugs.length > 0
      ? activeCategorySlugs
      : [
          ...new Set(
            vendors
              .map((v) => v.category_id ?? v.category)
              .filter((slug): slug is string => Boolean(slug))
          ),
        ];

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const offersByVendor = new Map<string, VendorOffer[]>();
  for (const o of offers) {
    const list = offersByVendor.get(o.vendor_id) ?? [];
    list.push(o);
    offersByVendor.set(o.vendor_id, list);
  }

  const contractByVendor = new Map(contracts.map((c) => [c.vendor_id, c]));
  const paymentsByVendor = new Map<string, VendorPayment[]>();
  for (const p of payments) {
    const list = paymentsByVendor.get(p.vendor_id) ?? [];
    list.push(p);
    paymentsByVendor.set(p.vendor_id, list);
  }

  const vendorsWithRelations: EventVendorWithRelations[] = vendors.map((v) => {
    const vendorOffers = offersByVendor.get(v.id) ?? [];
    return {
      ...v,
      categoryDetail: v.category_id ? categoryBySlug.get(v.category_id) ?? null : null,
      offers: vendorOffers.map((o) => ({
        ...o,
        is_selected: v.selected_offer_id === o.id,
      })),
      contract: contractByVendor.get(v.id) ?? null,
      payments: paymentsByVendor.get(v.id) ?? [],
      offer_count: vendorOffers.length,
    };
  });

  return {
    migrationReady: true,
    stats: buildStats(vendorsWithRelations, offers.length),
    categories,
    activeCategorySlugs: resolvedActiveSlugs,
    services,
    vendors: vendorsWithRelations,
  };
}
