"use server";

import { revalidatePath } from "next/cache";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { isVendorFoundationSchemaMissing } from "@/lib/vendors/migration";
import {
  buildTimelineHookQueueRow,
  type VendorTimelineHookDescriptor,
} from "@/lib/vendors/timeline-integration";
import {
  parseCategorySlug,
  parseOptionalDate,
  parseOptionalEmail,
  parseOptionalMoney,
  parseOptionalUrl,
  parseRequiredMoney,
  parseVendorPaymentType,
  parseVendorStatus,
  requireVendorName,
  validateOfferInput,
  validatePaymentInput,
  validateVendorInput,
  type VendorActionResult,
} from "@/lib/vendors/validation";
import { createClient } from "@/lib/supabase/server";
import type {
  VendorContractInput,
  VendorInput,
  VendorOfferInput,
  VendorPaymentInput,
  VendorStatus,
} from "@/types/vendors";

const MIGRATION_HINT =
  "Rulează migrarea 018_vendor_foundation.sql în Supabase (SQL Editor).";

function revalidateVendors(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/vendors`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

async function requireVendorEdit(eventId: string) {
  return denyUnlessEventPermission(eventId, (p) => p.canEditVendors, "canEditVendors");
}

async function requireVendorManage(eventId: string) {
  return denyUnlessEventPermission(eventId, (p) => p.canManageVendors, "canManageVendors");
}

async function queueTimelineHook(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hook: VendorTimelineHookDescriptor
) {
  const row = buildTimelineHookQueueRow(hook);
  const { error } = await supabase.from("vendor_timeline_hook_queue").insert(row);
  if (error && !isVendorFoundationSchemaMissing(error)) {
    console.error("queueTimelineHook:", error);
  }
}

/* ─── Vendors ─── */

export async function createVendor(
  eventId: string,
  formData: FormData
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const input: VendorInput = {
    categoryId: String(formData.get("category_id") ?? formData.get("category") ?? ""),
    serviceId: String(formData.get("service_id") ?? "") || null,
    name: String(formData.get("name") ?? ""),
    website: String(formData.get("website") ?? "") || null,
    contactPerson: String(formData.get("contact_person") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    status: (parseVendorStatus(String(formData.get("status") ?? "researching")) ??
      "researching") as VendorStatus,
    notes: String(formData.get("notes") ?? "") || null,
  };

  const validationError = validateVendorInput(input);
  if (validationError) return validationError;

  const supabase = await createClient();
  const categoryId = parseCategorySlug(input.categoryId)!;
  const name = requireVendorName(input.name)!;

  const row: Record<string, unknown> = {
    event_id: eventId,
    name,
    category: categoryId,
    category_id: categoryId,
    service_id: input.serviceId?.trim() || null,
    website: parseOptionalUrl(input.website ?? undefined),
    contact_person: input.contactPerson?.trim() || null,
    phone: input.phone?.trim() || null,
    email: parseOptionalEmail(input.email ?? undefined),
    status: input.status ?? "researching",
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase.from("vendors").insert(row).select("id").single();

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) {
      delete row.category_id;
      delete row.website;
      const legacy = await supabase
        .from("vendors")
        .insert({
          event_id: eventId,
          category: categoryId,
          name,
          contact_person: row.contact_person,
          phone: row.phone,
          email: row.email,
          status: "contactat",
          notes: row.notes,
        })
        .select("id")
        .single();
      if (legacy.error) {
        console.error("createVendor legacy:", legacy.error);
        return { error: "A apărut o eroare la adăugarea furnizorului." };
      }
      revalidateVendors(eventId);
      return { success: true, id: legacy.data.id as string };
    }
    console.error("createVendor:", error);
    return { error: "A apărut o eroare la adăugarea furnizorului." };
  }

  revalidateVendors(eventId);
  return { success: true, id: data.id as string };
}

export async function updateVendor(
  eventId: string,
  vendorId: string,
  input: VendorInput
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const validationError = validateVendorInput(input);
  if (validationError) return validationError;

  const supabase = await createClient();
  const categoryId = parseCategorySlug(input.categoryId)!;

  const { error } = await supabase
    .from("vendors")
    .update({
      name: requireVendorName(input.name)!,
      category: categoryId,
      category_id: categoryId,
      website: parseOptionalUrl(input.website ?? undefined),
      contact_person: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: parseOptionalEmail(input.email ?? undefined),
      status: input.status ?? "researching",
      notes: input.notes?.trim() || null,
    })
    .eq("id", vendorId)
    .eq("event_id", eventId);

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("updateVendor:", error);
    return { error: "Nu am putut actualiza furnizorul." };
  }

  revalidateVendors(eventId);
  return { success: true };
}

export async function deleteVendor(
  eventId: string,
  vendorId: string
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorManage(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", vendorId)
    .eq("event_id", eventId);

  if (error) {
    console.error("deleteVendor:", error);
    return { error: "Nu am putut șterge acest furnizor." };
  }

  revalidateVendors(eventId);
  return { success: true };
}

/* ─── Offers ─── */

export async function createVendorOffer(
  eventId: string,
  input: VendorOfferInput
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const validationError = validateOfferInput(input);
  if (validationError) return validationError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_offers")
    .insert({
      vendor_id: input.vendorId,
      event_id: eventId,
      title: requireVendorName(input.title)!,
      price: parseOptionalMoney(input.price ?? undefined),
      currency: input.currency?.trim() || "RON",
      description: input.description?.trim() || null,
      included_services: input.includedServices?.trim() || null,
      offer_date: parseOptionalDate(input.offerDate ?? undefined),
      expiry_date: parseOptionalDate(input.expiryDate ?? undefined),
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("createVendorOffer:", error);
    return { error: "Nu am putut crea oferta." };
  }

  await supabase
    .from("vendors")
    .update({ status: "offer_received" })
    .eq("id", input.vendorId)
    .eq("event_id", eventId)
    .in("status", ["researching", "contacted"]);

  revalidateVendors(eventId);
  return { success: true, id: data.id as string };
}

export async function updateVendorOffer(
  eventId: string,
  offerId: string,
  input: VendorOfferInput
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const validationError = validateOfferInput(input);
  if (validationError) return validationError;

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_offers")
    .update({
      title: requireVendorName(input.title)!,
      price: parseOptionalMoney(input.price ?? undefined),
      currency: input.currency?.trim() || "RON",
      description: input.description?.trim() || null,
      included_services: input.includedServices?.trim() || null,
      offer_date: parseOptionalDate(input.offerDate ?? undefined),
      expiry_date: parseOptionalDate(input.expiryDate ?? undefined),
      notes: input.notes?.trim() || null,
    })
    .eq("id", offerId)
    .eq("event_id", eventId);

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("updateVendorOffer:", error);
    return { error: "Nu am putut actualiza oferta." };
  }

  revalidateVendors(eventId);
  return { success: true };
}

export async function deleteVendorOffer(
  eventId: string,
  offerId: string
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorManage(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();

  await supabase
    .from("vendors")
    .update({ selected_offer_id: null })
    .eq("event_id", eventId)
    .eq("selected_offer_id", offerId);

  const { error } = await supabase
    .from("vendor_offers")
    .delete()
    .eq("id", offerId)
    .eq("event_id", eventId);

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("deleteVendorOffer:", error);
    return { error: "Nu am putut șterge oferta." };
  }

  revalidateVendors(eventId);
  return { success: true };
}

/* ─── Selection (one vendor per category) ─── */

async function clearOtherSelectionsInService(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  serviceId: string,
  exceptVendorId: string
) {
  const { data: others, error } = await supabase
    .from("vendors")
    .select("id, offer_count, status")
    .eq("event_id", eventId)
    .eq("service_id", serviceId)
    .neq("id", exceptVendorId)
    .not("selected_offer_id", "is", null);

  if (error || !others?.length) return;

  for (const row of others) {
    const nextStatus =
      row.status === "contract_signed"
        ? "contract_signed"
        : Number(row.offer_count) > 0
          ? "offer_received"
          : "researching";

    await supabase
      .from("vendors")
      .update({ selected_offer_id: null, status: nextStatus })
      .eq("id", row.id)
      .eq("event_id", eventId);
  }
}

async function clearOtherSelectionsInCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  categoryId: string,
  exceptVendorId: string
) {
  const { data: others, error } = await supabase
    .from("vendors")
    .select("id, offer_count, status")
    .eq("event_id", eventId)
    .eq("category_id", categoryId)
    .neq("id", exceptVendorId)
    .not("selected_offer_id", "is", null);

  if (error || !others?.length) return;

  for (const row of others) {
    const nextStatus =
      row.status === "contract_signed"
        ? "contract_signed"
        : Number(row.offer_count) > 0
          ? "offer_received"
          : "researching";

    await supabase
      .from("vendors")
      .update({ selected_offer_id: null, status: nextStatus })
      .eq("id", row.id)
      .eq("event_id", eventId);
  }
}

export async function selectVendorOffer(
  eventId: string,
  vendorId: string,
  offerId: string | null
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();

  const { data: targetVendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, name, category_id, service_id")
    .eq("id", vendorId)
    .eq("event_id", eventId)
    .single();

  if (vendorError || !targetVendor) {
    return { error: "Furnizorul nu a fost găsit." };
  }

  const categoryId = (targetVendor.category_id as string) ?? "other";

  if (offerId) {
    const { data: offer, error: offerError } = await supabase
      .from("vendor_offers")
      .select("id, vendor_id, title")
      .eq("id", offerId)
      .eq("event_id", eventId)
      .single();

    if (offerError || !offer || offer.vendor_id !== vendorId) {
      return { error: "Pachetul nu aparține acestui furnizor." };
    }

    const serviceId = targetVendor.service_id as string | null;

    if (serviceId) {
      await clearOtherSelectionsInService(supabase, eventId, serviceId, vendorId);
      await supabase
        .from("event_vendor_services")
        .update({ selected_offer_id: offerId, updated_at: new Date().toISOString() })
        .eq("id", serviceId)
        .eq("event_id", eventId);
    } else {
      await clearOtherSelectionsInCategory(supabase, eventId, categoryId, vendorId);
    }

    const { error } = await supabase
      .from("vendors")
      .update({
        selected_offer_id: offerId,
        status: "selected",
      })
      .eq("id", vendorId)
      .eq("event_id", eventId);

    if (error) {
      if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
      return { error: "Nu am putut selecta pachetul." };
    }

    await queueTimelineHook(supabase, {
      hookType: "vendor_selected",
      eventId,
      vendorId,
      payload: {
        vendorId,
        vendorName: targetVendor.name as string,
        offerId,
        offerTitle: offer.title as string,
      },
    });
  } else {
    const { error } = await supabase
      .from("vendors")
      .update({ selected_offer_id: null, status: "negotiating" })
      .eq("id", vendorId)
      .eq("event_id", eventId);

    if (error) {
      if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
      return { error: "Nu am putut deselecta pachetul." };
    }
  }

  revalidateVendors(eventId);
  return { success: true };
}

/* ─── Contract foundation ─── */

export async function upsertVendorContract(
  eventId: string,
  input: VendorContractInput
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const row = {
    vendor_id: input.vendorId,
    event_id: eventId,
    contract_value: parseOptionalMoney(input.contractValue ?? undefined),
    contract_currency: input.contractCurrency?.trim() || "RON",
    contract_date: parseOptionalDate(input.contractDate ?? undefined),
    contract_signed: input.contractSigned ?? false,
    attachment_url: input.attachmentUrl?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("vendor_contracts")
    .upsert(row, { onConflict: "vendor_id" })
    .select("id")
    .single();

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("upsertVendorContract:", error);
    return { error: "Nu am putut salva contractul." };
  }

  if (row.contract_signed) {
    await supabase
      .from("vendors")
      .update({ status: "contract_signed" })
      .eq("id", input.vendorId)
      .eq("event_id", eventId);

    const { data: vendor } = await supabase
      .from("vendors")
      .select("name")
      .eq("id", input.vendorId)
      .single();

    await queueTimelineHook(supabase, {
      hookType: "contract_signed",
      eventId,
      vendorId: input.vendorId,
      payload: {
        vendorId: input.vendorId,
        vendorName: vendor?.name as string | undefined,
        dueDate: row.contract_date,
      },
    });
  }

  revalidateVendors(eventId);
  return { success: true, id: data.id as string };
}

/* ─── Payment foundation ─── */

export async function createVendorPayment(
  eventId: string,
  input: VendorPaymentInput
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const validationError = validatePaymentInput(input);
  if (validationError) return validationError;

  const paymentType = parseVendorPaymentType(input.paymentType)!;
  const planned = parseRequiredMoney(input.plannedAmount)!;
  const paid = parseOptionalMoney(input.paidAmount ?? 0) ?? 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_payments")
    .insert({
      vendor_id: input.vendorId,
      event_id: eventId,
      offer_id: input.offerId ?? null,
      payment_type: paymentType,
      planned_amount: planned,
      paid_amount: paid,
      currency: input.currency?.trim() || "RON",
      due_date: parseOptionalDate(input.dueDate ?? undefined),
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("createVendorPayment:", error);
    return { error: "Nu am putut crea plata." };
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("name")
    .eq("id", input.vendorId)
    .single();

  const hookType =
    paymentType === "deposit"
      ? "deposit_due"
      : paymentType === "final_payment"
        ? "final_payment_due"
        : null;

  if (hookType && input.dueDate) {
    await queueTimelineHook(supabase, {
      hookType,
      eventId,
      vendorId: input.vendorId,
      payload: {
        vendorId: input.vendorId,
        vendorName: vendor?.name as string | undefined,
        paymentId: data.id as string,
        paymentType,
        dueDate: input.dueDate,
        amount: planned,
        currency: input.currency ?? "RON",
      },
    });
  }

  revalidateVendors(eventId);
  return { success: true, id: data.id as string };
}

export async function updateVendorPayment(
  eventId: string,
  paymentId: string,
  input: VendorPaymentInput
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const validationError = validatePaymentInput(input);
  if (validationError) return validationError;

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_payments")
    .update({
      offer_id: input.offerId ?? null,
      payment_type: parseVendorPaymentType(input.paymentType)!,
      planned_amount: parseRequiredMoney(input.plannedAmount)!,
      paid_amount: parseOptionalMoney(input.paidAmount ?? 0) ?? 0,
      currency: input.currency?.trim() || "RON",
      due_date: parseOptionalDate(input.dueDate ?? undefined),
      notes: input.notes?.trim() || null,
    })
    .eq("id", paymentId)
    .eq("event_id", eventId);

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("updateVendorPayment:", error);
    return { error: "Nu am putut actualiza plata." };
  }

  revalidateVendors(eventId);
  return { success: true };
}

export async function deleteVendorPayment(
  eventId: string,
  paymentId: string
): Promise<VendorActionResult> {
  const accessDenied = await requireVendorEdit(eventId);
  if (accessDenied) return accessDenied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_payments")
    .delete()
    .eq("id", paymentId)
    .eq("event_id", eventId);

  if (error) {
    if (isVendorFoundationSchemaMissing(error)) return { error: MIGRATION_HINT };
    console.error("deleteVendorPayment:", error);
    return { error: "Nu am putut șterge plata." };
  }

  revalidateVendors(eventId);
  return { success: true };
}
