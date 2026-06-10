"use client";



import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";



import { createVendorService } from "@/app/(dashboard)/dashboard/events/[id]/vendors/service-actions";

import { formatVendorPrice } from "@/lib/vendors/format";

import {

  findPriceExtremes,

  getSelectedOfferInService,

  type VendorCategoryGroup,

} from "@/lib/vendors/grouping";

import { ro } from "@/lib/i18n/ro";

import type { VendorInput, VendorOfferInput } from "@/types/vendors";

import { VendorServiceSection } from "./vendor-service-section";



type VendorCategoryWorkspaceProps = {

  eventId: string;

  group: VendorCategoryGroup;

  canEdit: boolean;

  canManage: boolean;

  removingCategory?: boolean;

  onSelectPackage: (vendorId: string, packageId: string, serviceId: string) => void;

  onAddVendor: (input: VendorInput) => Promise<{ error?: string; id?: string }>;

  onAddPackage: (input: VendorOfferInput) => Promise<{ error?: string }>;

  onUpdatePackage: (offerId: string, input: VendorOfferInput) => Promise<{ error?: string }>;

  onDeleteRow: (vendorId: string, packageId: string, serviceId: string) => Promise<void>;

  onRemoveCategory?: () => void;

  onServiceCreated: () => void;

};



type CategorySelection = {

  serviceId: string;

  serviceName: string;

  vendorName: string;

  packageName: string;

  price: number;

  currency: string;

  vendorId: string;

  offerId: string;

};



function getCategorySelections(group: VendorCategoryGroup): CategorySelection[] {

  const selections: CategorySelection[] = [];

  for (const sg of group.services) {

    const sel = getSelectedOfferInService(sg.service, sg.vendors);

    if (!sel) continue;

    selections.push({

      serviceId: sg.service.id,

      serviceName: sg.service.name,

      vendorName: sel.vendor.name,

      packageName: sel.offer.title,

      price: sel.offer.price != null ? Number(sel.offer.price) : 0,

      currency: sel.offer.currency,

      vendorId: sel.vendor.id,

      offerId: sel.offer.id,

    });

  }

  return selections;

}



function countAlternativeOffers(group: VendorCategoryGroup): number {

  let count = 0;

  for (const sg of group.services) {

    const selectedId = sg.service.selected_offer_id;

    for (const vendor of sg.vendors) {

      for (const offer of vendor.offers) {

        if (offer.id !== selectedId) count += 1;

      }

    }

  }

  return count;

}



function formatPriceRange(

  cheapest: ReturnType<typeof findPriceExtremes>["cheapest"],

  premium: ReturnType<typeof findPriceExtremes>["premium"]

): string | null {

  if (!cheapest && !premium) return null;

  const currency = cheapest?.currency ?? premium?.currency ?? "RON";

  const min = cheapest?.price ?? premium?.price;

  const max = premium?.price ?? cheapest?.price;

  if (min == null || max == null) return null;

  if (min === max) return formatVendorPrice(min, currency);

  const minStr = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(min);

  const maxStr = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(max);

  return `${minStr}–${maxStr} ${currency}`;

}



function ChoiceStripBlock({

  selection,

  group,

  showServiceName,

}: {

  selection: CategorySelection;

  group: VendorCategoryGroup;

  showServiceName: boolean;

}) {

  const { cheapest, premium } = findPriceExtremes(group.vendors);

  const range = formatPriceRange(cheapest, premium);

  const alternatives = countAlternativeOffers(group);



  return (

    <div

      className="vk-choice-strip"

      data-category-id={group.slug}

      data-service-id={selection.serviceId}

      data-vendor-id={selection.vendorId}

      data-offer-id={selection.offerId}

    >

      {showServiceName ? (

        <p className="vk-meta text-[var(--vk-text-secondary)]">{selection.serviceName}</p>

      ) : null}

      <p className="vk-choice-primary">

        <span className="vk-choice-label">{ro.vendors.workspace.choiceStripChosen}: </span>

        <strong>

          {selection.vendorName} · {selection.packageName} ·{" "}

          {formatVendorPrice(selection.price, selection.currency)}

        </strong>

      </p>

      {range ? (

        <p className="vk-choice-secondary">

          <span className="vk-choice-label">{ro.vendors.workspace.choiceStripRange}: </span>

          {range}

        </p>

      ) : null}

      {alternatives > 0 ? (

        <p className="vk-choice-secondary">

          <span className="vk-choice-label">{ro.vendors.workspace.choiceStripAlternative}: </span>

          {ro.vendors.workspace.choiceStripAlternativesAvailable.replace(

            "{count}",

            String(alternatives)

          )}

        </p>

      ) : null}

    </div>

  );

}



function UnselectedSummary({ group }: { group: VendorCategoryGroup }) {

  const serviceCount = group.services.length;

  const offerCount = group.aggregateSummary.offerCount;

  const { cheapest, premium } = findPriceExtremes(group.vendors);

  const range = formatPriceRange(cheapest, premium);



  const servicesLabel =

    serviceCount === 1

      ? `1 ${ro.vendors.workspace.serviceSingular}`

      : `${serviceCount} ${ro.vendors.workspace.servicePlural}`;

  const offersLabel =

    offerCount === 1

      ? `1 ${ro.vendors.workspace.offerSingular}`

      : `${offerCount} ${ro.vendors.workspace.offerPlural}`;



  return (

    <div className="vk-choice-strip">

      <p className="vk-choice-secondary">

        {ro.vendors.workspace.choiceStripNoSelectionSummary

          .replace("{services}", servicesLabel)

          .replace("{offers}", offersLabel)}

      </p>

      {range ? (

        <p className="vk-choice-secondary">

          <span className="vk-choice-label">{ro.vendors.workspace.choiceStripRange}: </span>

          {range}

        </p>

      ) : null}

      {offerCount === 0 ? (

        <p className="vk-body text-[var(--vk-text-muted)]">{ro.vendors.workspace.noOffersHint}</p>

      ) : null}

    </div>

  );

}



export function VendorCategoryWorkspace({

  eventId,

  group,

  canEdit,

  canManage,

  removingCategory = false,

  onSelectPackage,

  onAddVendor,

  onAddPackage,

  onUpdatePackage,

  onDeleteRow,

  onRemoveCategory,

  onServiceCreated,

}: VendorCategoryWorkspaceProps) {

  const [showNewService, setShowNewService] = useState(false);

  const [newServiceName, setNewServiceName] = useState("");

  const [creating, setCreating] = useState(false);

  const [createError, setCreateError] = useState("");



  const selections = getCategorySelections(group);

  const hasSelection = selections.length > 0;



  async function handleCreateService() {

    if (!newServiceName.trim()) return;

    setCreating(true);

    setCreateError("");

    const result = await createVendorService(eventId, group.slug, newServiceName);

    setCreating(false);

    if (result.error) {

      setCreateError(result.error);

      return;

    }

    setNewServiceName("");

    setShowNewService(false);

    onServiceCreated();

  }



  return (

    <div className="min-w-0 flex-1 space-y-[var(--dash-section-gap,3rem)]">

      <header className="space-y-6 pb-2">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div className="flex items-center gap-3">

            <span className="text-xl leading-none" aria-hidden>

              {group.icon}

            </span>

            <h2 className="vk-section-title">{group.label}</h2>

          </div>

          {canManage && onRemoveCategory ? (

            <button

              type="button"

              disabled={removingCategory}

              onClick={onRemoveCategory}

              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--vk-text-muted)] transition-colors hover:text-red-600 disabled:opacity-50"

            >

              <Trash2 className="h-3.5 w-3.5" />

              {ro.vendors.workspace.removeCategoryFromEvent}

            </button>

          ) : null}

        </div>



        {hasSelection ? (

          <div className="space-y-5">

            {selections.map((sel) => (

              <ChoiceStripBlock

                key={sel.offerId}

                selection={sel}

                group={group}

                showServiceName={selections.length > 1}

              />

            ))}

          </div>

        ) : (

          <UnselectedSummary group={group} />

        )}

      </header>



      {canEdit && (

        <div>

          {!showNewService ? (

            <button

              type="button"

              onClick={() => setShowNewService(true)}

              className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--vk-text-secondary)] transition-colors hover:text-[var(--vk-text)]"

            >

              <Plus className="h-4 w-4 text-[var(--vk-dusty-rose)]" />

              {ro.vendors.workspace.addService}

            </button>

          ) : (

            <div className="flex flex-wrap items-center gap-3">

              <input

                value={newServiceName}

                onChange={(e) => setNewServiceName(e.target.value)}

                placeholder={ro.vendors.workspace.serviceNamePlaceholder}

                autoFocus

                onKeyDown={(e) => {

                  if (e.key === "Enter") void handleCreateService();

                  if (e.key === "Escape") setShowNewService(false);

                }}

                className="h-10 w-full max-w-sm border-0 border-b border-[var(--vk-hairline)] bg-transparent px-0 text-[14px] outline-none transition-colors focus:border-[var(--vk-dusty-rose)]"

              />

              <button

                type="button"

                disabled={creating || newServiceName.trim().length < 2}

                onClick={() => void handleCreateService()}

                className="text-[13px] font-medium text-[var(--vk-text)] underline-offset-4 hover:underline disabled:opacity-40"

              >

                {creating ? ro.vendors.workspace.saving : ro.vendors.workspace.saveService}

              </button>

              {createError ? (

                <p className="w-full text-[13px] text-red-600">{createError}</p>

              ) : null}

            </div>

          )}

        </div>

      )}



      {group.services.length === 0 ? (

        <div className="py-16 text-center">

          <p className="text-[15px] font-medium text-[var(--vk-text)]">

            {ro.vendors.workspace.noServicesYet}

          </p>

        </div>

      ) : (

        <div className="space-y-14">

          {group.services.map((serviceGroup) => (

            <VendorServiceSection

              key={serviceGroup.service.id}

              eventId={eventId}

              categorySlug={group.slug}

              group={serviceGroup}

              canEdit={canEdit}

              onSelectPackage={onSelectPackage}

              onAddVendor={onAddVendor}

              onAddPackage={onAddPackage}

              onUpdatePackage={onUpdatePackage}

              onDeleteRow={onDeleteRow}

            />

          ))}

        </div>

      )}

    </div>

  );

}

