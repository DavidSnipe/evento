"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";

import { updateVendor } from "@/app/(dashboard)/dashboard/events/[id]/vendors/actions";
import { formatVendorPrice } from "@/lib/vendors/format";
import {
  displayCellValue,
  formatPriceForInput,
  isValidPhoneInput,
  isValidPriceInput,
  parsePriceValue,
  sanitizePhoneInput,
  sanitizePriceInput,
} from "@/lib/vendors/field-validation";
import {
  buildServiceTableRows,
  draftHasContent,
  emptyDraftRow,
  type DraftServiceRow,
  type ServiceTableRow,
} from "@/lib/vendors/service-rows";
import { ro } from "@/lib/i18n/ro";
import type { EventVendorWithRelations, VendorInput, VendorOfferInput } from "@/types/vendors";
import { cn } from "@/lib/utils";

type CellKey = "vendorName" | "packageName" | "price" | "phone" | "notes";
const CELL_ORDER: CellKey[] = ["vendorName", "packageName", "price", "phone", "notes"];

type RowEditState = DraftServiceRow;

type VendorServicesTableProps = {
  eventId: string;
  categorySlug: string;
  serviceId: string;
  selectedOfferId: string | null;
  vendors: EventVendorWithRelations[];
  canEdit: boolean;
  onSelectPackage: (vendorId: string, packageId: string, serviceId: string) => void;
  onAddVendor: (input: VendorInput) => Promise<{ error?: string; id?: string }>;
  onAddPackage: (input: VendorOfferInput) => Promise<{ error?: string }>;
  onUpdatePackage: (offerId: string, input: VendorOfferInput) => Promise<{ error?: string }>;
  onDeleteRow: (vendorId: string, packageId: string, serviceId: string) => Promise<void>;
};

const cellInputClass =
  "w-full min-w-0 rounded-[8px] border border-transparent bg-[#F3F3F5]/80 px-2 py-1.5 text-xs font-medium text-[#1A0E14] shadow-none outline-none placeholder:text-text-subtle focus:border-[#B8516B]/40 focus:ring-3 focus:ring-[#B8516B]/10";

const thClass =
  "px-4 py-3 text-left text-[9.5px] font-bold uppercase tracking-wider text-text-subtle border-r border-border-rose-18/20 last:border-r-0";

const tdClass = "px-4 py-2.5 align-middle text-xs border-r border-border-rose-18/20 last:border-r-0";

const rowClass =
  "group relative border-b border-border-rose-18/20 transition-colors duration-200 hover:bg-[#FEF0F3]/12";

function rowToEdit(row: ServiceTableRow): RowEditState {
  return {
    vendorName: row.vendorName,
    packageName: row.packageName,
    price: formatPriceForInput(row.price),
    phone: row.phone,
    notes: row.notes,
  };
}

export function VendorServicesTable({
  eventId,
  categorySlug,
  serviceId,
  selectedOfferId,
  vendors,
  canEdit,
  onSelectPackage,
  onAddVendor,
  onAddPackage,
  onUpdatePackage,
  onDeleteRow,
}: VendorServicesTableProps) {
  const savedRows = useMemo(
    () => buildServiceTableRows(vendors, categorySlug, serviceId, selectedOfferId),
    [vendors, categorySlug, serviceId, selectedOfferId]
  );

  const [draft, setDraft] = useState<DraftServiceRow>(emptyDraftRow);
  const [showDraft, setShowDraft] = useState(false);
  const [edits, setEdits] = useState<Record<string, RowEditState>>({});
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tableRef = useRef<HTMLDivElement>(null);
  const draftCellRefs = useRef<(HTMLInputElement | null)[]>([]);
  const editCellRefs = useRef<Record<string, (HTMLInputElement | null)[]>>({});

  useEffect(() => {
    setEdits((prev) => {
      const next: Record<string, RowEditState> = {};
      for (const row of savedRows) {
        next[row.rowKey] = prev[row.rowKey] ?? rowToEdit(row);
      }
      return next;
    });
  }, [savedRows]);

  const markSaving = useCallback((key: string, on: boolean) => {
    setSavingKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const validateRow = useCallback((state: RowEditState): string | null => {
    if (!state.vendorName.trim()) {
      return ro.vendors.workspace.vendorNameRequired;
    }
    if (!isValidPriceInput(state.price)) {
      return ro.vendors.workspace.invalidPrice;
    }
    if (!isValidPhoneInput(state.phone)) {
      return ro.vendors.workspace.invalidPhone;
    }
    return null;
  }, []);

  const persistRow = useCallback(
    async (rowKey: string, state: RowEditState, row?: ServiceTableRow) => {
      const error = validateRow(state);
      if (error) {
        setFieldErrors((e) => ({ ...e, [rowKey]: error }));
        return false;
      }
      setFieldErrors((e) => {
        const next = { ...e };
        delete next[rowKey];
        return next;
      });

      if (rowKey === "draft") {
        markSaving("draft", true);
        const vendorResult = await onAddVendor({
          categoryId: categorySlug,
          serviceId,
          name: state.vendorName.trim(),
          phone: sanitizePhoneInput(state.phone).trim() || null,
          notes: state.notes.trim() || null,
          contactPerson: null,
          email: null,
          website: null,
        });
        if (vendorResult.error || !vendorResult.id) {
          markSaving("draft", false);
          return false;
        }
        await onAddPackage({
          vendorId: vendorResult.id,
          title: state.packageName.trim() || ro.vendors.workspace.defaultPackage,
          price: parsePriceValue(state.price),
          currency: "RON",
          includedServices: null,
          offerDate: null,
          expiryDate: null,
          notes: null,
        });
        markSaving("draft", false);
        setDraft(emptyDraftRow());
        return true;
      }

      if (!row) return false;
      markSaving(rowKey, true);
      await updateVendor(eventId, row.vendorId, {
        categoryId: categorySlug,
        serviceId,
        name: state.vendorName.trim(),
        phone: sanitizePhoneInput(state.phone).trim() || null,
        notes: state.notes.trim() || null,
        contactPerson: null,
        email: null,
        website: null,
      });
      await onUpdatePackage(row.packageId, {
        vendorId: row.vendorId,
        title: state.packageName.trim() || row.packageName,
        price: parsePriceValue(state.price),
        currency: row.currency,
        includedServices: null,
        offerDate: null,
        expiryDate: null,
        notes: null,
      });
      markSaving(rowKey, false);
      setEditingRowKey(null);
      return true;
    },
    [
      categorySlug,
      eventId,
      markSaving,
      onAddPackage,
      onAddVendor,
      onUpdatePackage,
      serviceId,
      validateRow,
    ]
  );

  const focusCell = useCallback((rowKey: string, cellIndex: number) => {
    if (rowKey === "draft") {
      draftCellRefs.current[cellIndex]?.focus();
      return;
    }
    editCellRefs.current[rowKey]?.[cellIndex]?.focus();
  }, []);

  const handleTab = useCallback(
    (rowKey: string, cellIndex: number, row?: ServiceTableRow) => {
      if (cellIndex < CELL_ORDER.length - 1) {
        focusCell(rowKey, cellIndex + 1);
        return;
      }
      const state =
        rowKey === "draft" ? draft : edits[rowKey] ?? (row ? rowToEdit(row) : emptyDraftRow());
      void persistRow(rowKey, state, row).then((ok) => {
        if (!ok) return;
        if (rowKey === "draft" || editingRowKey === rowKey) {
          setEditingRowKey(null);
          requestAnimationFrame(() => draftCellRefs.current[0]?.focus());
        }
      });
    },
    [draft, edits, editingRowKey, focusCell, persistRow]
  );

  const handleEnter = useCallback(
    (rowKey: string, row?: ServiceTableRow) => {
      const state =
        rowKey === "draft" ? draft : edits[rowKey] ?? (row ? rowToEdit(row) : emptyDraftRow());
      void persistRow(rowKey, state, row).then((ok) => {
        if (ok && rowKey === "draft") {
          requestAnimationFrame(() => draftCellRefs.current[0]?.focus());
        }
      });
    },
    [draft, edits, persistRow]
  );

  useEffect(() => {
    if (editingRowKey) {
      requestAnimationFrame(() => focusCell(editingRowKey, 0));
    }
  }, [editingRowKey, focusCell]);

  useEffect(() => {
    if (showDraft) {
      requestAnimationFrame(() => draftCellRefs.current[0]?.focus());
    }
  }, [showDraft]);

  useEffect(() => {
    if (!canEdit) return;
    function onPointerDown(e: MouseEvent) {
      if (!tableRef.current?.contains(e.target as Node)) {
        if (draftHasContent(draft)) {
          void persistRow("draft", draft);
        } else if (showDraft) {
          setShowDraft(false);
        }
        if (editingRowKey && edits[editingRowKey]) {
          const row = savedRows.find((r) => r.rowKey === editingRowKey);
          void persistRow(editingRowKey, edits[editingRowKey], row);
        }
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [canEdit, draft, editingRowKey, edits, persistRow, savedRows, showDraft]);

  function renderCellInput(
    rowKey: string,
    cellKey: CellKey,
    cellIndex: number,
    value: string,
    onChange: (v: string) => void,
    row?: ServiceTableRow
  ) {
    const onValueChange = (raw: string) => {
      if (cellKey === "price") onChange(sanitizePriceInput(raw));
      else if (cellKey === "phone") onChange(sanitizePhoneInput(raw));
      else onChange(raw);
    };

    return (
      <input
        ref={(el) => {
          if (rowKey === "draft") draftCellRefs.current[cellIndex] = el;
          else {
            if (!editCellRefs.current[rowKey]) editCellRefs.current[rowKey] = [];
            editCellRefs.current[rowKey][cellIndex] = el;
          }
        }}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleEnter(rowKey, row);
          } else if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            handleTab(rowKey, cellIndex, row);
          }
        }}
        className={cellInputClass}
        placeholder={cellKey === "vendorName" && rowKey === "draft" ? ro.vendors.workspace.newRowPlaceholder : ro.vendors.workspace.emptyCell}
      />
    );
  }

  function renderDisplayCell(value: string, className?: string) {
    return (
      <span className={cn("text-xs font-medium text-text-secondary", className)}>
        {displayCellValue(value)}
      </span>
    );
  }

  function renderActions(row: ServiceTableRow, isEditing: boolean, err?: string) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 transition-opacity duration-150",
          !isEditing && !row.isSelected && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        )}
      >
        {!row.isSelected && (
          <button
            type="button"
            className="text-[11px] font-semibold text-[var(--dash-accent-text)] transition-colors hover:text-[var(--dash-accent-text)]/80"
            onClick={() => onSelectPackage(row.vendorId, row.packageId, serviceId)}
          >
            {ro.vendors.workspace.chooseAction}
          </button>
        )}
        <button
          type="button"
          className="text-[11px] font-semibold text-text-secondary transition-colors hover:text-[#1A0E14]"
          onClick={() => setEditingRowKey(row.rowKey)}
        >
          {ro.vendors.workspace.edit}
        </button>
        <button
          type="button"
          className="text-[11px] font-semibold text-text-secondary transition-colors hover:text-red-600"
          onClick={() => void onDeleteRow(row.vendorId, row.packageId, serviceId)}
        >
          {ro.vendors.workspace.delete}
        </button>
        {err ? <p className="w-full text-[12px] text-red-600">{err}</p> : null}
      </div>
    );
  }

  const colSpan = canEdit ? 6 : 5;

  return (
    <div ref={tableRef} className="overflow-x-auto">
      <table className="min-w-full w-full border-collapse text-sm">
        <thead>
          <tr className="sticky top-0 z-10 border-b border-border-rose-18/60 bg-white/95">
            <th className={cn(thClass, "pl-4")}>{ro.vendors.workspace.colVendor}</th>
            <th className={thClass}>{ro.vendors.workspace.colPackage}</th>
            <th className={thClass}>{ro.vendors.workspace.colPrice}</th>
            <th className={thClass}>{ro.vendors.workspace.colPhone}</th>
            <th className={thClass}>{ro.vendors.workspace.colNotes}</th>
            {canEdit ? (
              <th className={cn(thClass, "w-[168px] pr-4")}>{ro.vendors.workspace.colActions}</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-rose-18/20">
          {savedRows.length === 0 && !canEdit ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-14 text-center">
                <p className="text-sm font-semibold text-[var(--dash-text)]">
                  {ro.vendors.workspace.noPackagesYet}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {ro.vendors.workspace.noOffersHint}
                </p>
              </td>
            </tr>
          ) : null}
          {savedRows.map((row) => {
            const edit = edits[row.rowKey] ?? rowToEdit(row);
            const isEditing = editingRowKey === row.rowKey;
            const saving = savingKeys.has(row.rowKey);
            const err = fieldErrors[row.rowKey];

            return (
              <tr
                key={row.rowKey}
                data-category-id={categorySlug}
                data-service-id={serviceId}
                data-vendor-id={row.vendorId}
                data-offer-id={row.packageId}
                className={cn(
                  rowClass,
                  row.isSelected && "bg-[#FEF0F3]/45 shadow-[inset_2px_0_0_var(--dash-dusty-rose)]",
                  row.isMuted && !row.isSelected && "opacity-50 hover:opacity-80",
                  saving && "opacity-60"
                )}
              >
                <td className={cn(tdClass, "pl-4")}>
                  <div className="flex items-center gap-2.5">
                    {row.isSelected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--dash-sage)]" aria-hidden />
                    ) : null}
                    {canEdit && isEditing
                      ? renderCellInput(
                          row.rowKey,
                          "vendorName",
                          0,
                          edit.vendorName,
                          (v) =>
                            setEdits((e) => ({
                              ...e,
                              [row.rowKey]: { ...edit, vendorName: v },
                            })),
                          row
                        )
                      : (
                        <span className="text-xs font-semibold text-[#1A0E14]">
                          {row.vendorName}
                        </span>
                      )}
                  </div>
                </td>
                <td className={tdClass}>
                  {canEdit && isEditing
                    ? renderCellInput(
                        row.rowKey,
                        "packageName",
                        1,
                        edit.packageName,
                        (v) =>
                          setEdits((e) => ({
                            ...e,
                            [row.rowKey]: { ...edit, packageName: v },
                          })),
                        row
                      )
                    : renderDisplayCell(edit.packageName)}
                </td>
                <td className={tdClass}>
                  {canEdit && isEditing
                    ? renderCellInput(
                        row.rowKey,
                        "price",
                        2,
                        edit.price,
                        (v) =>
                          setEdits((e) => ({ ...e, [row.rowKey]: { ...edit, price: v } })),
                        row
                      )
                    : (
                      <span className="text-xs font-semibold tabular-nums text-[#1A0E14]">
                        {row.price != null
                          ? formatVendorPrice(row.price, row.currency)
                          : displayCellValue("")}
                      </span>
                    )}
                </td>
                <td className={tdClass}>
                  {canEdit && isEditing
                    ? renderCellInput(
                        row.rowKey,
                        "phone",
                        3,
                        edit.phone,
                        (v) =>
                          setEdits((e) => ({ ...e, [row.rowKey]: { ...edit, phone: v } })),
                        row
                      )
                    : renderDisplayCell(edit.phone)}
                </td>
                <td className={tdClass}>
                  {canEdit && isEditing
                    ? renderCellInput(
                        row.rowKey,
                        "notes",
                        4,
                        edit.notes,
                        (v) =>
                          setEdits((e) => ({ ...e, [row.rowKey]: { ...edit, notes: v } })),
                        row
                      )
                    : renderDisplayCell(edit.notes, "truncate block max-w-[200px]")}
                </td>
                {canEdit ? (
                  <td className={cn(tdClass, "pr-4")}>{renderActions(row, isEditing, err)}</td>
                ) : null}
              </tr>
            );
          })}

          {canEdit ? (
            showDraft ? (
              <tr className={cn(rowClass, "bg-[#F3F3F5]/20")}>
                <td className={cn(tdClass, "pl-4")}>
                  {renderCellInput("draft", "vendorName", 0, draft.vendorName, (v) =>
                    setDraft((d) => ({ ...d, vendorName: v }))
                  )}
                </td>
                <td className={tdClass}>
                  {renderCellInput("draft", "packageName", 1, draft.packageName, (v) =>
                    setDraft((d) => ({ ...d, packageName: v }))
                  )}
                </td>
                <td className={tdClass}>
                  {renderCellInput("draft", "price", 2, draft.price, (v) =>
                    setDraft((d) => ({ ...d, price: v }))
                  )}
                </td>
                <td className={tdClass}>
                  {renderCellInput("draft", "phone", 3, draft.phone, (v) =>
                    setDraft((d) => ({ ...d, phone: v }))
                  )}
                </td>
                <td className={tdClass}>
                  {renderCellInput("draft", "notes", 4, draft.notes, (v) =>
                    setDraft((d) => ({ ...d, notes: v }))
                  )}
                </td>
                <td className={cn(tdClass, "pr-4")}>
                  {fieldErrors.draft ? (
                    <p className="text-[12px] text-red-600">{fieldErrors.draft}</p>
                  ) : (
                    <span className="text-[10px] font-medium text-text-subtle">
                      {savedRows.length === 0
                        ? ro.vendors.workspace.noPackagesYet
                        : ro.vendors.workspace.inlineHint}
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              <tr className={rowClass}>
                <td colSpan={colSpan} className={cn(tdClass, "pl-4 py-2")}>
                  <button
                    type="button"
                    onClick={() => setShowDraft(true)}
                    className="inline-flex items-center gap-1 text-xs text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-accent-text)]"
                    aria-label={ro.vendors.workspace.addToCategory}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            )
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
