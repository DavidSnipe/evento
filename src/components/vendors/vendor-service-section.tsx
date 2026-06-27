"use client";

import type { VendorServiceGroup } from "@/lib/vendors/grouping";
import type { VendorInput, VendorOfferInput } from "@/types/vendors";
import { VendorServicesTable } from "./vendor-services-table";

type VendorServiceSectionProps = {
  eventId: string;
  categorySlug: string;
  group: VendorServiceGroup;
  canEdit: boolean;
  onSelectPackage: (vendorId: string, packageId: string, serviceId: string) => void;
  onAddVendor: (input: VendorInput) => Promise<{ error?: string; id?: string }>;
  onAddPackage: (input: VendorOfferInput) => Promise<{ error?: string }>;
  onUpdatePackage: (offerId: string, input: VendorOfferInput) => Promise<{ error?: string }>;
  onDeleteRow: (vendorId: string, packageId: string, serviceId: string) => Promise<void>;
};

export function VendorServiceSection({
  eventId,
  categorySlug,
  group,
  canEdit,
  onSelectPackage,
  onAddVendor,
  onAddPackage,
  onUpdatePackage,
  onDeleteRow,
}: VendorServiceSectionProps) {
  const { service, vendors } = group;

  return (
    <section className="overflow-hidden rounded-[18px] border border-border-rose-18 bg-white/70 shadow-card backdrop-blur-md">
      <div className="border-b border-border-rose-18/30 bg-[#F3F3F5]/40 px-4 py-3">
        <h3 className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
          {service.name}
        </h3>
      </div>
      <VendorServicesTable
        eventId={eventId}
        categorySlug={categorySlug}
        serviceId={service.id}
        selectedOfferId={service.selected_offer_id}
        vendors={vendors}
        canEdit={canEdit}
        onSelectPackage={onSelectPackage}
        onAddVendor={onAddVendor}
        onAddPackage={onAddPackage}
        onUpdatePackage={onUpdatePackage}
        onDeleteRow={onDeleteRow}
      />
    </section>
  );
}
