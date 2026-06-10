"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

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
  "w-full min-w-0 border-0 bg-transparent px-0 py-0 text-[13px] font-normal text-[var(--vk-text)] shadow-none outline-none placeholder:text-[var(--vk-text-muted)] focus:ring-0";

const thClass =
  "px-0 pb-3 pt-1 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--vk-text-muted)]";

const tdClass = "px-0 py-0 align-middle h-16";

const rowClass =
  "group relative transition-colors hover:bg-[var(--vk-warm-gray)]/35";

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
    if (!canEdit) return;
    function onPointerDown(e: MouseEvent) {
      if (!tableRef.current?.contains(e.target as Node)) {
        if (draftHasContent(draft)) {
          void persistRow("draft", draft);
        }
        if (editingRowKey && edits[editingRowKey]) {
          const row = savedRows.find((r) => r.rowKey === editingRowKey);
          void persistRow(editingRowKey, edits[editingRowKey], row);
        }
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [canEdit, draft, editingRowKey, edits, persistRow, savedRows]);

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
      <span className={cn("vk-table-cell text-[var(--vk-text-secondary)]", className)}>
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
            className="text-[13px] font-medium text-[var(--vk-text-secondary)] transition-colors hover:text-[var(--vk-text)]"
            onClick={() => onSelectPackage(row.vendorId, row.packageId, serviceId)}
          >
            {ro.vendors.workspace.chooseAction}
          </button>
        )}
        <button
          type="button"
          className="text-[13px] font-medium text-[var(--vk-text-muted)] transition-colors hover:text-[var(--vk-text)]"
          onClick={() => setEditingRowKey(row.rowKey)}
        >
          {ro.vendors.workspace.edit}
        </button>
        <button
          type="button"
          className="text-[13px] font-medium text-[var(--vk-text-muted)] transition-colors hover:text-red-600"
          onClick={() => void onDeleteRow(row.vendorId, row.packageId, serviceId)}
        >
          {ro.vendors.workspace.delete}
        </button>
        {err ? <p className="w-full text-[12px] text-red-600">{err}</p> : null}
      </div>
    );
  }

  return (
    <div ref={tableRef} className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--vk-hairline)]">
            <th className={cn(thClass, "pl-3")}>{ro.vendors.workspace.colVendor}</th>
            <th className={thClass}>{ro.vendors.workspace.colPackage}</th>
            <th className={thClass}>{ro.vendors.workspace.colPrice}</th>
            <th className={thClass}>{ro.vendors.workspace.colPhone}</th>
            <th className={thClass}>{ro.vendors.workspace.colNotes}</th>
            {canEdit ? (
              <th className={cn(thClass, "w-[168px] pr-3")}>{ro.vendors.workspace.colActions}</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--vk-hairline)]">
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
                  row.isSelected &&
                    "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-[var(--vk-dusty-rose)] before:content-['']",
                  row.isMuted && !row.isSelected && "opacity-50 hover:opacity-75",
                  saving && "opacity-60"
                )}
              >
                <td className={cn(tdClass, "pl-3")}>
                  <div className="flex h-16 items-center gap-2.5">
                    {row.isSelected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--vk-sage)]" aria-hidden />
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
                        <span className="vk-table-cell font-medium text-[var(--vk-text)]">
                          {row.vendorName}
                        </span>
                      )}
                  </div>
                </td>
                <td className={tdClass}>
                  <div className="flex h-16 items-center">
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
                  </div>
                </td>
                <td className={tdClass}>
                  <div className="flex h-16 items-center">
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
                        <span className="vk-table-cell font-medium tabular-nums text-[var(--vk-text)]">
                          {row.price != null
                            ? formatVendorPrice(row.price, row.currency)
                            : displayCellValue("")}
                        </span>
                      )}
                  </div>
                </td>
                <td className={tdClass}>
                  <div className="flex h-16 items-center">
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
                  </div>
                </td>
                <td className={tdClass}>
                  <div className="flex h-16 items-center">
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
                  </div>
                </td>
                {canEdit ? (
                  <td className={cn(tdClass, "pr-3")}>
                    <div className="flex h-16 items-center">
                      {renderActions(row, isEditing, err)}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}

          {canEdit ? (
            <tr className={cn(rowClass, "text-[var(--vk-text-muted)]")}>
              <td className={cn(tdClass, "pl-3")}>
                <div className="flex h-16 items-center">
                  {renderCellInput("draft", "vendorName", 0, draft.vendorName, (v) =>
                    setDraft((d) => ({ ...d, vendorName: v }))
                  )}
                </div>
              </td>
              <td className={tdClass}>
                <div className="flex h-16 items-center">
                  {renderCellInput("draft", "packageName", 1, draft.packageName, (v) =>
                    setDraft((d) => ({ ...d, packageName: v }))
                  )}
                </div>
              </td>
              <td className={tdClass}>
                <div className="flex h-16 items-center">
                  {renderCellInput("draft", "price", 2, draft.price, (v) =>
                    setDraft((d) => ({ ...d, price: v }))
                  )}
                </div>
              </td>
              <td className={tdClass}>
                <div className="flex h-16 items-center">
                  {renderCellInput("draft", "phone", 3, draft.phone, (v) =>
                    setDraft((d) => ({ ...d, phone: v }))
                  )}
                </div>
              </td>
              <td className={tdClass}>
                <div className="flex h-16 items-center">
                  {renderCellInput("draft", "notes", 4, draft.notes, (v) =>
                    setDraft((d) => ({ ...d, notes: v }))
                  )}
                </div>
              </td>
              <td className={cn(tdClass, "pr-3")}>
                <div className="flex h-16 items-center">
                  {fieldErrors.draft ? (
                    <p className="text-[12px] text-red-600">{fieldErrors.draft}</p>
                  ) : (
                    <span className="vk-meta">{ro.vendors.workspace.inlineHint}</span>
                  )}
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
