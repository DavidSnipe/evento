"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import {
  createVendorService,
  fetchServiceTemplates,
} from "@/app/(dashboard)/dashboard/events/[id]/vendors/service-actions";
import { formatVendorPrice } from "@/lib/vendors/format";
import {
  findPriceExtremes,
  getSelectedOfferInService,
  type VendorCategoryGroup,
} from "@/lib/vendors/grouping";
import { ro } from "@/lib/i18n/ro";
import type { VendorInput, VendorOfferInput } from "@/types/vendors";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import {
  getIconForVendorCategory,
  ICON_REGISTRY,
  type IconKey,
} from "@/lib/icons/registry";
import type { VendorServiceTemplate } from "@/types/vendors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VendorServiceSection } from "./vendor-service-section";

const ALL_ICON_KEYS = Object.keys(ICON_REGISTRY) as IconKey[];

const SERVICE_CARD_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-3 py-2 text-xs font-medium text-[var(--dash-text)] transition hover:border-[var(--dash-accent-text)]/30 disabled:opacity-50";

const CUSTOM_SERVICE_CARD_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-dashed border-[var(--dash-hairline)] bg-[var(--dash-ivory)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition hover:border-[var(--dash-accent-text)]/30 disabled:opacity-50";

const FIELD_CLASS =
  "h-11 min-w-0 flex-1 rounded-md border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-3 text-sm text-[var(--dash-text)] outline-none focus-visible:border-[var(--dash-accent-text)]/40 focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-text)]/10";

function resolveTemplateIcon(iconKey: string | null): IconKey {
  if (iconKey && iconKey in ICON_REGISTRY) {
    return iconKey as IconKey;
  }
  return "other";
}

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

function SelectionPanel({
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
      className="evento-card min-w-[min(100%,12rem)] flex-1 rounded-[16px] p-3"
      data-category-id={group.slug}
      data-service-id={selection.serviceId}
      data-vendor-id={selection.vendorId}
      data-offer-id={selection.offerId}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--dash-sage)]/15">
          <Check className="h-3 w-3 text-[var(--dash-sage)]" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--dash-accent-text)]">
          {ro.vendors.workspace.choiceStripChosen}
        </p>
      </div>
      {showServiceName ? (
        <p className="mb-1 text-[11px] font-medium text-[var(--dash-text-muted)]">
          {selection.serviceName}
        </p>
      ) : null}
      <p className="text-[0.8125rem] font-semibold leading-snug text-[var(--dash-text)]">
        {selection.vendorName}
      </p>
      <p className="mt-0.5 text-[13px] text-[var(--dash-text-secondary)]">
        {selection.packageName}
      </p>
      <p className="text-[12px] font-bold tabular-nums text-[var(--dash-accent-text)]">
        {formatVendorPrice(selection.price, selection.currency)}
      </p>
      {range ? (
        <p className="mt-1 text-[12px] text-[var(--dash-text-secondary)]">
          <span className="text-[var(--dash-text-muted)]">{ro.vendors.workspace.choiceStripRange}: </span>
          {range}
        </p>
      ) : null}
      {alternatives > 0 ? (
        <p className="mt-0.5 text-[12px] text-[var(--dash-text-muted)]">
          {ro.vendors.workspace.choiceStripAlternativesAvailable.replace(
            "{count}",
            String(alternatives)
          )}
        </p>
      ) : null}
    </div>
  );
}

function CustomServiceInlineEdit({
  icon,
  name,
  creating,
  onIconChange,
  onNameChange,
  onSave,
  onCancel,
}: {
  icon: IconKey;
  name: string;
  creating: boolean;
  onIconChange: (icon: IconKey) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rowRef.current?.contains(target)) return;
      const popoverContent = document.querySelector('[data-slot="popover-content"]');
      if (popoverContent?.contains(target)) return;
      onCancel();
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onCancel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      ref={rowRef}
      className="inline-flex min-w-[min(100%,18rem)] flex-1 items-center gap-2 rounded-md border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-2 py-1.5"
    >
      <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={creating}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--dash-hairline)] bg-[var(--dash-accent-soft)]"
            aria-label="Alege iconița"
          >
            <EmojiIcon icon={icon} size="sm" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[9.5rem] p-2">
          <div className="grid grid-cols-4 gap-1">
            {ALL_ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onIconChange(key);
                  setIconPickerOpen(false);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-md border border-transparent transition-colors hover:border-[var(--dash-hairline)] hover:bg-[var(--dash-accent-soft)]"
                aria-label={ICON_REGISTRY[key].labelRo}
              >
                <EmojiIcon icon={key} size="sm" />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={ro.vendors.workspace.customServiceNamePlaceholder}
        autoFocus
        disabled={creating}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
        }}
        className={FIELD_CLASS}
      />
      <button
        type="button"
        disabled={creating || name.trim().length < 2}
        onClick={onSave}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--dash-accent-text)] text-white transition disabled:opacity-40"
        aria-label={ro.vendors.workspace.saveService}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
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
    <div className="rounded-[16px] border border-dashed border-[var(--dash-hairline)] bg-[var(--dash-ivory)] p-3">
      <p className="text-[13px] text-[var(--dash-text-secondary)]">
        {ro.vendors.workspace.choiceStripNoSelectionSummary
          .replace("{services}", servicesLabel)
          .replace("{offers}", offersLabel)}
      </p>
      {range ? (
        <p className="mt-1 text-[12px] text-[var(--dash-text-secondary)]">
          <span className="text-[var(--dash-text-muted)]">{ro.vendors.workspace.choiceStripRange}: </span>
          {range}
        </p>
      ) : null}
      {offerCount === 0 ? (
        <p className="mt-1 text-[12px] text-[var(--dash-text-muted)]">{ro.vendors.workspace.noOffersHint}</p>
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
  const [templates, setTemplates] = useState<VendorServiceTemplate[]>([]);
  const [customServiceEditing, setCustomServiceEditing] = useState(false);
  const [customServiceIcon, setCustomServiceIcon] = useState<IconKey>("other");
  const [newServiceName, setNewServiceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const selections = getCategorySelections(group);
  const hasSelection = selections.length > 0;

  useEffect(() => {
    let cancelled = false;

    void fetchServiceTemplates(group.slug).then((fetched) => {
      if (!cancelled) setTemplates(fetched);
    });

    return () => {
      cancelled = true;
    };
  }, [group.slug]);

  const resetCustomServiceEdit = useCallback(() => {
    setCustomServiceEditing(false);
    setCustomServiceIcon(getIconForVendorCategory(group.slug));
    setNewServiceName("");
  }, [group.slug]);

  function closeNewServicePicker() {
    setShowNewService(false);
    resetCustomServiceEdit();
    setCreateError("");
  }

  function openNewServicePicker() {
    setShowNewService(true);
    setCreateError("");
    if (templates.length === 0) {
      setCustomServiceEditing(true);
      setCustomServiceIcon(getIconForVendorCategory(group.slug));
      setNewServiceName("");
    } else {
      resetCustomServiceEdit();
    }
  }

  async function handleCreateService(name?: string) {
    const serviceName = (name ?? newServiceName).trim();
    if (serviceName.length < 2) return;
    setCreating(true);
    setCreateError("");
    const result = await createVendorService(eventId, group.slug, serviceName);
    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
      return;
    }
    closeNewServicePicker();
    onServiceCreated();
  }

  async function handleCreateFromTemplate(template: VendorServiceTemplate) {
    if (creating) return;
    await handleCreateService(template.label_key);
  }

  return (
    <div className="evento-card min-w-0 flex-1 space-y-6 rounded-[16px] p-5 sm:p-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-accent-soft)]">
              <EmojiIcon icon={getIconForVendorCategory(group.slug)} size="lg" />
            </span>
            <div>
              <h2 className="text-[1.375rem] font-semibold tracking-[-0.022em] text-[var(--dash-text)]">
                {group.label}
              </h2>
              <p className="mt-0.5 text-[0.8125rem] text-[var(--dash-text-secondary)]">
                {group.services.length}{" "}
                {group.services.length === 1
                  ? ro.vendors.workspace.serviceSingular
                  : ro.vendors.workspace.servicePlural}{" "}
                · {group.aggregateSummary.offerCount}{" "}
                {group.aggregateSummary.offerCount === 1
                  ? ro.vendors.workspace.offerSingular
                  : ro.vendors.workspace.offerPlural}
              </p>
            </div>
          </div>
          {canManage && onRemoveCategory ? (
            <button
              type="button"
              disabled={removingCategory}
              onClick={onRemoveCategory}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {ro.vendors.workspace.removeCategoryFromEvent}
            </button>
          ) : null}
        </div>

        {hasSelection ? (
          <div className="flex flex-row flex-wrap gap-2">
            {selections.map((sel) => (
              <SelectionPanel
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
        <div className="rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-3">
          {!showNewService ? (
            <button
              type="button"
              onClick={openNewServicePicker}
              className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-accent-soft)] hover:text-[var(--dash-accent-text)]"
            >
              <Plus className="h-3.5 w-3.5 text-[var(--dash-accent-text)]" />
              {ro.vendors.workspace.addService}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={creating || customServiceEditing}
                    onClick={() => void handleCreateFromTemplate(template)}
                    className={SERVICE_CARD_CLASS}
                  >
                    <EmojiIcon icon={resolveTemplateIcon(template.icon_key)} size="sm" />
                    {template.label_key}
                  </button>
                ))}
                {customServiceEditing ? (
                  <CustomServiceInlineEdit
                    icon={customServiceIcon}
                    name={newServiceName}
                    creating={creating}
                    onIconChange={setCustomServiceIcon}
                    onNameChange={setNewServiceName}
                    onSave={() => void handleCreateService()}
                    onCancel={resetCustomServiceEdit}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      setCustomServiceEditing(true);
                      setCustomServiceIcon(getIconForVendorCategory(group.slug));
                      setNewServiceName("");
                      setCreateError("");
                    }}
                    className={CUSTOM_SERVICE_CARD_CLASS}
                  >
                    <EmojiIcon icon={getIconForVendorCategory(group.slug)} size="sm" />
                    {ro.vendors.workspace.customService}
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={creating}
                onClick={closeNewServicePicker}
                className="text-xs font-medium text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-text-secondary)] disabled:opacity-50"
              >
                {ro.vendors.workspace.cancelService}
              </button>
              {createError ? (
                <p className="text-[12px] text-red-600">{createError}</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {group.services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--dash-hairline)] bg-[var(--dash-ivory)] py-16 text-center">
          <p className="text-sm font-semibold text-[var(--dash-text)]">
            {ro.vendors.workspace.noServicesYet}
          </p>
          {canEdit ? (
            <button
              type="button"
              onClick={openNewServicePicker}
              className="mt-4 text-xs font-semibold text-[var(--dash-accent-text)] hover:underline"
            >
              {ro.vendors.workspace.addService}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
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
