import { useCallback, useEffect, useRef, useState } from "react";

import {
  createVendor,
  createVendorOffer,
  deleteVendor,
  deleteVendorOffer,
  selectVendorOffer,
  updateVendorOffer,
} from "@/app/(dashboard)/dashboard/events/[id]/vendors/actions";
import type {
  EventVendorService,
  EventVendorWithRelations,
  VendorInput,
  VendorOfferInput,
  VendorOfferWithSelection,
} from "@/types/vendors";
import { vendorCategoryId } from "@/lib/vendors/grouping";

type PendingVendorUpdate = {
  fields: Partial<EventVendorWithRelations>;
};

function mapOffersWithSelection(
  offers: VendorOfferWithSelection[],
  selectedId: string | null
): VendorOfferWithSelection[] {
  return offers.map((o) => ({ ...o, is_selected: o.id === selectedId }));
}

export function useVendorsOptimistic(
  eventId: string,
  initialVendors: EventVendorWithRelations[],
  initialServices: EventVendorService[] = []
) {
  const [localVendors, setLocalVendors] = useState(initialVendors);
  const [localServices, setLocalServices] = useState(initialServices);
  const [syncingIds, setSyncingIds] = useState<Record<string, number>>({});

  const pendingUpdates = useRef<Map<string, PendingVendorUpdate>>(new Map());

  useEffect(() => {
    setLocalVendors(() =>
      initialVendors.map((serverVendor) => {
        const pending = pendingUpdates.current.get(serverVendor.id);
        if (!pending) return serverVendor;

        const caughtUp = Object.keys(pending.fields).every(
          (key) =>
            serverVendor[key as keyof EventVendorWithRelations] ===
            pending.fields[key as keyof EventVendorWithRelations]
        );

        if (caughtUp) {
          pendingUpdates.current.delete(serverVendor.id);
          return serverVendor;
        }

        return { ...serverVendor, ...pending.fields };
      })
    );
  }, [initialVendors]);

  useEffect(() => {
    setLocalServices(initialServices);
  }, [initialServices]);

  const bumpSync = useCallback((id: string, delta: number) => {
    setSyncingIds((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const patchVendor = useCallback(
    (vendorId: string, updater: (v: EventVendorWithRelations) => EventVendorWithRelations) => {
      setLocalVendors((prev) => prev.map((v) => (v.id === vendorId ? updater(v) : v)));
    },
    []
  );

  const addVendorOptimistic = useCallback(
    async (input: VendorInput) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: EventVendorWithRelations = {
        id: tempId,
        event_id: eventId,
        category: input.categoryId,
        category_id: input.categoryId,
        service_id: input.serviceId ?? null,
        marketplace_vendor_id: null,
        marketplace_slug: null,
        name: input.name,
        website: input.website ?? null,
        contact_person: input.contactPerson ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        status: input.status ?? "researching",
        notes: input.notes ?? null,
        selected_offer_id: null,
        created_at: new Date().toISOString(),
        offers: [],
        contract: null,
        payments: [],
        offer_count: 0,
      };

      setLocalVendors((prev) => [...prev, optimistic]);
      bumpSync(tempId, 1);

      const formData = new FormData();
      formData.set("category_id", input.categoryId);
      formData.set("name", input.name);
      if (input.serviceId) formData.set("service_id", input.serviceId);
      if (input.contactPerson) formData.set("contact_person", input.contactPerson);
      if (input.website) formData.set("website", input.website);
      if (input.phone) formData.set("phone", input.phone);
      if (input.email) formData.set("email", input.email);
      if (input.notes) formData.set("notes", input.notes);

      const result = await createVendor(eventId, formData);
      bumpSync(tempId, -1);

      if (result.error) {
        setLocalVendors((prev) => prev.filter((v) => v.id !== tempId));
        return result;
      }

      setLocalVendors((prev) =>
        prev.map((v) => (v.id === tempId ? { ...v, id: result.id ?? tempId } : v))
      );
      return result;
    },
    [eventId, bumpSync]
  );

  const deleteVendorOptimistic = useCallback(
    async (vendorId: string) => {
      const previous = localVendors;
      setLocalVendors((prev) => prev.filter((v) => v.id !== vendorId));
      bumpSync(vendorId, 1);
      const result = await deleteVendor(eventId, vendorId);
      bumpSync(vendorId, -1);
      if (result.error) setLocalVendors(previous);
      return result;
    },
    [eventId, localVendors, bumpSync]
  );

  const addOfferOptimistic = useCallback(
    async (input: VendorOfferInput) => {
      const tempId = `temp-offer-${crypto.randomUUID()}`;
      const optimisticOffer: VendorOfferWithSelection = {
        id: tempId,
        vendor_id: input.vendorId,
        event_id: eventId,
        title: input.title,
        price: input.price ?? null,
        currency: input.currency ?? "RON",
        description: input.description ?? null,
        included_services: input.includedServices ?? null,
        offer_date: input.offerDate ?? null,
        expiry_date: input.expiryDate ?? null,
        notes: input.notes ?? null,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_selected: false,
      };

      patchVendor(input.vendorId, (v) => ({
        ...v,
        offer_count: v.offer_count + 1,
        status:
          v.status === "researching" || v.status === "contacted"
            ? "offer_received"
            : v.status,
        offers: [...v.offers, optimisticOffer],
      }));
      bumpSync(tempId, 1);

      const result = await createVendorOffer(eventId, input);
      bumpSync(tempId, -1);

      if (result.error) {
        patchVendor(input.vendorId, (v) => ({
          ...v,
          offer_count: Math.max(0, v.offer_count - 1),
          offers: v.offers.filter((o) => o.id !== tempId),
        }));
        return result;
      }

      patchVendor(input.vendorId, (v) => ({
        ...v,
        offers: v.offers.map((o) => (o.id === tempId ? { ...o, id: result.id ?? tempId } : o)),
      }));
      return result;
    },
    [eventId, bumpSync, patchVendor]
  );

  const updateOfferOptimistic = useCallback(
    async (offerId: string, input: VendorOfferInput) => {
      patchVendor(input.vendorId, (v) => ({
        ...v,
        offers: v.offers.map((o) =>
          o.id === offerId
            ? {
                ...o,
                title: input.title,
                price: input.price ?? null,
                currency: input.currency ?? "RON",
                description: input.description ?? null,
                included_services: input.includedServices ?? null,
                offer_date: input.offerDate ?? null,
                expiry_date: input.expiryDate ?? null,
                notes: input.notes ?? null,
              }
            : o
        ),
      }));
      bumpSync(offerId, 1);
      const result = await updateVendorOffer(eventId, offerId, input);
      bumpSync(offerId, -1);
      return result;
    },
    [eventId, bumpSync, patchVendor]
  );

  const deleteOfferOptimistic = useCallback(
    async (vendorId: string, offerId: string, serviceId?: string | null) => {
      const previousVendors = localVendors;
      const previousServices = localServices;

      patchVendor(vendorId, (v) => {
        const wasSelected = v.selected_offer_id === offerId;
        return {
          ...v,
          offers: v.offers.filter((o) => o.id !== offerId),
          offer_count: Math.max(0, v.offer_count - 1),
          selected_offer_id: wasSelected ? null : v.selected_offer_id,
          status: wasSelected ? "negotiating" : v.status,
        };
      });

      if (serviceId) {
        setLocalServices((prev) =>
          prev.map((s) =>
            s.id === serviceId && s.selected_offer_id === offerId
              ? { ...s, selected_offer_id: null }
              : s
          )
        );
      }

      bumpSync(offerId, 1);
      const result = await deleteVendorOffer(eventId, offerId);
      bumpSync(offerId, -1);
      if (result.error) {
        setLocalVendors(previousVendors);
        setLocalServices(previousServices);
      }
      return result;
    },
    [eventId, localVendors, localServices, bumpSync, patchVendor]
  );

  const selectOfferOptimistic = useCallback(
    async (vendorId: string, offerId: string | null, serviceId?: string | null) => {
      setLocalVendors((prev) => {
        const target = prev.find((v) => v.id === vendorId);
        const categoryId = target ? vendorCategoryId(target) : null;
        const svcId = serviceId ?? target?.service_id ?? null;

        return prev.map((v) => {
          const sameService = svcId != null && v.service_id === svcId;
          const sameCategory =
            !svcId && categoryId != null && vendorCategoryId(v) === categoryId;

          if (v.id === vendorId) {
            return {
              ...v,
              selected_offer_id: offerId,
              status: offerId ? "selected" : "negotiating",
              offers: mapOffersWithSelection(v.offers, offerId),
            };
          }

          if ((sameService || sameCategory) && offerId && v.selected_offer_id) {
            const nextStatus =
              v.status === "contract_signed"
                ? "contract_signed"
                : v.offer_count > 0
                  ? "offer_received"
                  : v.status;
            return {
              ...v,
              selected_offer_id: null,
              status: nextStatus,
              offers: mapOffersWithSelection(v.offers, null),
            };
          }

          return v;
        });
      });

      if (serviceId) {
        setLocalServices((prev) =>
          prev.map((s) =>
            s.id === serviceId ? { ...s, selected_offer_id: offerId } : s
          )
        );
      }

      bumpSync(vendorId, 1);
      const result = await selectVendorOffer(eventId, vendorId, offerId);
      bumpSync(vendorId, -1);
      if (result.error) pendingUpdates.current.delete(vendorId);
      return result;
    },
    [eventId, bumpSync]
  );

  return {
    vendors: localVendors,
    services: localServices,
    syncingIds,
    addVendorOptimistic,
    deleteVendorOptimistic,
    addOfferOptimistic,
    updateOfferOptimistic,
    deleteOfferOptimistic,
    selectOfferOptimistic,
  };
}
