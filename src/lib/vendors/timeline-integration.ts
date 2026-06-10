import type { VendorPayment, VendorTimelineHookType } from "@/types/vendors";

/**
 * Future timeline integration — Phase 6.1 registers hooks only.
 * Implement processors in a later phase (e.g. cron or edge function).
 */

export type VendorTimelineHookPayload = {
  vendorId: string;
  vendorName?: string;
  offerId?: string;
  offerTitle?: string;
  paymentId?: string;
  paymentType?: VendorPayment["payment_type"];
  dueDate?: string | null;
  amount?: number | null;
  currency?: string;
};

export type VendorTimelineHookDescriptor = {
  hookType: VendorTimelineHookType;
  eventId: string;
  vendorId: string;
  payload: VendorTimelineHookPayload;
};

/** Describes a timeline task that would be created when integration is enabled. */
export type PlannedVendorTimelineTask = {
  title: string;
  dueDate: string | null;
  notes: string;
  sourceHook: VendorTimelineHookType;
};

export function describeTimelineTaskForHook(
  hook: VendorTimelineHookDescriptor
): PlannedVendorTimelineTask {
  const name = hook.payload.vendorName ?? "Furnizor";

  switch (hook.hookType) {
    case "vendor_selected":
      return {
        title: `Confirmă furnizor: ${name}`,
        dueDate: null,
        notes: hook.payload.offerTitle
          ? `Ofertă selectată: ${hook.payload.offerTitle}`
          : "Furnizor marcat ca selectat.",
        sourceHook: hook.hookType,
      };
    case "deposit_due":
      return {
        title: `Avans ${name}`,
        dueDate: hook.payload.dueDate ?? null,
        notes: `Plată planificată (${hook.payload.currency ?? "RON"}).`,
        sourceHook: hook.hookType,
      };
    case "final_payment_due":
      return {
        title: `Plată finală ${name}`,
        dueDate: hook.payload.dueDate ?? null,
        notes: `Sold final de achitat.`,
        sourceHook: hook.hookType,
      };
    case "contract_signed":
      return {
        title: `Contract semnat: ${name}`,
        dueDate: hook.payload.dueDate ?? null,
        notes: "Contract marcat ca semnat.",
        sourceHook: hook.hookType,
      };
    default:
      return {
        title: `Acțiune furnizor: ${name}`,
        dueDate: null,
        notes: "",
        sourceHook: hook.hookType,
      };
  }
}

/** Queue row shape for `vendor_timeline_hook_queue` (insert via server action). */
export function buildTimelineHookQueueRow(hook: VendorTimelineHookDescriptor) {
  return {
    event_id: hook.eventId,
    vendor_id: hook.vendorId,
    hook_type: hook.hookType,
    payload: hook.payload,
  };
}
