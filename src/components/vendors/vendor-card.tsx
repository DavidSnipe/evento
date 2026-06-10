"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Globe,
  Pencil,
  Trash2,
  Plus,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatVendorDate, formatVendorPrice } from "@/lib/vendors/format";
import { getSelectedPackage } from "@/lib/vendors/grouping";
import { ro } from "@/lib/i18n/ro";
import type { EventVendorWithRelations, VendorOfferInput } from "@/types/vendors";
import { cn } from "@/lib/utils";
import { SelectedPackageBadge, VendorStatusBadge } from "./vendor-status-badge";

type VendorCardProps = {
  vendor: EventVendorWithRelations;
  canEdit: boolean;
  canManage: boolean;
  isSyncing: boolean;
  forceExpanded?: boolean;
  onExpanded?: () => void;
  onSelectOffer: (vendorId: string, offerId: string | null) => void;
  onAddOffer: (input: VendorOfferInput) => Promise<{ error?: string }>;
  onUpdateOffer: (offerId: string, input: VendorOfferInput) => Promise<{ error?: string }>;
  onDeleteOffer: (vendorId: string, offerId: string) => Promise<{ error?: string }>;
  onDeleteVendor?: (vendorId: string) => Promise<{ error?: string }>;
};

const emptyOfferForm = (vendorId: string): VendorOfferInput => ({
  vendorId,
  title: "",
  price: null,
  currency: "RON",
  includedServices: "",
  offerDate: null,
  expiryDate: null,
  notes: "",
});

export function VendorCard({
  vendor,
  canEdit,
  canManage,
  isSyncing,
  onSelectOffer,
  onAddOffer,
  onUpdateOffer,
  onDeleteOffer,
  onDeleteVendor,
  forceExpanded = false,
  onExpanded,
}: VendorCardProps) {
  const [expanded, setExpanded] = useState(forceExpanded);

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerForm, setOfferForm] = useState<VendorOfferInput>(emptyOfferForm(vendor.id));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const selected = getSelectedPackage(vendor);

  async function submitOffer() {
    setPending(true);
    setError("");
    const result = editingOfferId
      ? await onUpdateOffer(editingOfferId, offerForm)
      : await onAddOffer(offerForm);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setShowOfferForm(false);
    setEditingOfferId(null);
    setOfferForm(emptyOfferForm(vendor.id));
  }

  function startEditOffer(offerId: string) {
    const offer = vendor.offers.find((o) => o.id === offerId);
    if (!offer) return;
    setEditingOfferId(offerId);
    setOfferForm({
      vendorId: vendor.id,
      title: offer.title,
      price: offer.price != null ? Number(offer.price) : null,
      currency: offer.currency,
      includedServices: offer.included_services ?? "",
      offerDate: offer.offer_date,
      expiryDate: offer.expiry_date,
      notes: offer.notes ?? "",
    });
    setShowOfferForm(true);
    setExpanded(true);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-background/80 transition-shadow",
        selected && "border-emerald-200 shadow-sm shadow-emerald-100/50",
        isSyncing && "opacity-70"
      )}
    >
      <button
        type="button"
        onClick={() => {
          setExpanded((e) => !e);
          onExpanded?.();
        }}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg font-semibold">{vendor.name}</h3>
            {selected && <SelectedPackageBadge compact packageName={selected.title} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <VendorStatusBadge status={vendor.status} />
            <span className="text-xs text-muted-foreground">
              {vendor.offer_count}{" "}
              {vendor.offer_count === 1
                ? ro.vendors.workspace.packageSingular
                : ro.vendors.workspace.packagePlural}
            </span>
            {selected?.price != null && (
              <span className="font-serif text-sm font-semibold text-emerald-700">
                {formatVendorPrice(Number(selected.price), selected.currency)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {vendor.contact_person && (
              <span>{ro.vendors.workspace.fieldContact}: {vendor.contact_person}</span>
            )}
            {vendor.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {vendor.phone}
              </span>
            )}
            {vendor.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {vendor.email}
              </span>
            )}
            {vendor.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" /> {vendor.website.replace(/^https?:\/\//, "")}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-4">
          {vendor.notes && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vendor.notes}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{ro.vendors.workspace.packagesSection}</h4>
              {canEdit && !showOfferForm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    setEditingOfferId(null);
                    setOfferForm(emptyOfferForm(vendor.id));
                    setShowOfferForm(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {ro.vendors.workspace.addPackage}
                </Button>
              )}
            </div>

            {vendor.offers.length === 0 && !showOfferForm && (
              <p className="text-sm text-muted-foreground">{ro.vendors.workspace.noPackages}</p>
            )}

            <ul className="space-y-2">
              {vendor.offers.map((offer) => (
                <li
                  key={offer.id}
                  className={cn(
                    "rounded-xl border border-border/50 p-3",
                    offer.is_selected && "border-emerald-200 bg-emerald-50/40"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{offer.title}</p>
                      <p className="font-serif text-base font-semibold">
                        {formatVendorPrice(
                          offer.price != null ? Number(offer.price) : null,
                          offer.currency
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatVendorDate(offer.offer_date)}
                        {offer.expiry_date &&
                          ` → ${formatVendorDate(offer.expiry_date)}`}
                      </p>
                      {(offer.included_services || offer.notes) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {offer.included_services || offer.notes}
                        </p>
                      )}
                    </div>
                    {offer.is_selected && (
                      <SelectedPackageBadge compact packageName={offer.title} />
                    )}
                  </div>
                  {canEdit && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!offer.is_selected && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => onSelectOffer(vendor.id, offer.id)}
                        >
                          <Check className="h-3 w-3" />
                          {ro.vendors.workspace.selectPackage}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => startEditOffer(offer.id)}
                      >
                        <Pencil className="h-3 w-3" />
                        {ro.vendors.workspace.edit}
                      </Button>
                      {canManage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => onDeleteOffer(vendor.id, offer.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          {ro.vendors.workspace.delete}
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {showOfferForm && canEdit && (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">{ro.vendors.workspace.packageName}</Label>
                    <Input
                      value={offerForm.title}
                      onChange={(e) => setOfferForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="ex. Pachet complet"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{ro.vendors.workspace.packagePrice}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={offerForm.price ?? ""}
                      onChange={(e) =>
                        setOfferForm((f) => ({
                          ...f,
                          price: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{ro.vendors.workspace.packageIncluded}</Label>
                    <Input
                      value={offerForm.includedServices ?? ""}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, includedServices: e.target.value }))
                      }
                      placeholder="ex. 8 ore, 2 soliști"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{ro.vendors.workspace.packageDate}</Label>
                    <Input
                      type="date"
                      value={offerForm.offerDate ?? ""}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, offerDate: e.target.value || null }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{ro.vendors.workspace.packageExpiry}</Label>
                    <Input
                      type="date"
                      value={offerForm.expiryDate ?? ""}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, expiryDate: e.target.value || null }))
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">{ro.vendors.workspace.notes}</Label>
                    <Input
                      value={offerForm.notes ?? ""}
                      onChange={(e) => setOfferForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={pending} onClick={submitOffer}>
                    {pending ? ro.vendors.workspace.saving : ro.vendors.workspace.savePackage}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowOfferForm(false);
                      setEditingOfferId(null);
                    }}
                  >
                    {ro.vendors.workspace.cancel}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {canManage && onDeleteVendor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive text-xs"
              onClick={() => onDeleteVendor(vendor.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {ro.vendors.workspace.deleteVendor}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
