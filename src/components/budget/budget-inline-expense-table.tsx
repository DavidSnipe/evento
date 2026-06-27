"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Lock, Plus } from "lucide-react";

import {
  createBudgetItem,
  deleteBudgetItem,
  updateBudgetItem,
} from "@/app/(dashboard)/dashboard/events/[id]/budget/actions";
import { fetchServiceTemplates } from "@/app/(dashboard)/dashboard/events/[id]/vendors/service-actions";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import {
  ICON_REGISTRY,
  getIconForVendorCategory,
  type IconKey,
} from "@/lib/icons/registry";
import {
  formatPriceForInput,
  isValidPriceInput,
  parsePriceValue,
  sanitizePriceInput,
} from "@/lib/vendors/field-validation";
import { ro } from "@/lib/i18n/ro";
import type { BudgetLineItem, BudgetLineStatus } from "@/types/budget";
import type { VendorServiceTemplate } from "@/types/vendors";
import { cn } from "@/lib/utils";

type CellKey = "title" | "estimated" | "paid";
const CELL_ORDER: CellKey[] = ["title", "estimated", "paid"];

type RowEditState = {
  title: string;
  estimated: string;
  paid: string;
};

type BudgetInlineExpenseTableProps = {
  eventId: string;
  categorySlug: string;
  items: BudgetLineItem[];
  canEdit: boolean;
};

const cellInputClass =
  "w-full min-w-0 rounded-[8px] border border-transparent bg-[#F3F3F5]/80 px-2 py-1.5 text-xs font-medium text-[#1A0E14] shadow-none outline-none placeholder:text-text-subtle focus:border-[#B8516B]/40 focus:ring-3 focus:ring-[#B8516B]/10";

const thClass =
  "px-4 py-3 text-left text-[9.5px] font-bold uppercase tracking-wider text-text-subtle border-r border-border-rose-18/20 last:border-r-0";

const tdClass = "px-4 py-2.5 align-middle text-xs border-r border-border-rose-18/20 last:border-r-0";

const rowClass =
  "group relative border-b border-border-rose-18/20 transition-colors duration-200 hover:bg-[#FEF0F3]/12";

const EXPENSE_CARD_CLASS =
  "inline-flex items-center gap-2 rounded-[10px] border border-border-rose-18 bg-white px-3 py-2 text-xs font-medium text-[var(--dash-text)] shadow-sm disabled:opacity-50";

const CUSTOM_EXPENSE_CARD_CLASS =
  "inline-flex items-center gap-2 rounded-[10px] border border-dashed border-border-rose-18 bg-[var(--dash-blush)]/15 px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] shadow-sm disabled:opacity-50";

function resolveTemplateIcon(iconKey: string | null): IconKey {
  if (iconKey && iconKey in ICON_REGISTRY) {
    return iconKey as IconKey;
  }
  return "other";
}

function buildCreateFormData(title: string, categorySlug: string): FormData {
  const formData = new FormData();
  formData.set("title", title.trim());
  formData.set("category_slug", categorySlug);
  formData.set("estimated_cost", "0");
  formData.set("actual_cost", "0");
  formData.set("paid_amount", "0");
  formData.set("due_date", "");
  return formData;
}

function formatLei(value: number) {
  return `${value.toLocaleString("ro-RO")} RON`;
}

function statusLabel(status: BudgetLineStatus) {
  switch (status) {
    case "vendor_locked":
      return ro.budgetModule.statusVendor;
    case "paid":
      return ro.budgetModule.statusPaid;
    case "partial":
      return ro.budgetModule.statusPartial;
    default:
      return ro.budgetModule.statusUnpaid;
  }
}

function statusClass(status: BudgetLineStatus) {
  switch (status) {
    case "vendor_locked":
      return "bg-[var(--dash-sage)]/15 text-[var(--dash-sage)]";
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "partial":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-[var(--dash-warm-gray)]/80 text-[var(--dash-text-secondary)]";
  }
}

function rowToEdit(item: BudgetLineItem): RowEditState {
  return {
    title: item.title,
    estimated: formatPriceForInput(item.estimated_cost),
    paid: formatPriceForInput(item.paid_amount),
  };
}

function buildFormData(
  state: RowEditState,
  categorySlug: string,
  actualCost: number
): FormData {
  const formData = new FormData();
  formData.set("title", state.title.trim());
  formData.set("category_slug", categorySlug);
  formData.set("estimated_cost", String(parsePriceValue(state.estimated) ?? 0));
  formData.set("actual_cost", String(actualCost));
  formData.set("paid_amount", String(parsePriceValue(state.paid) ?? 0));
  formData.set("due_date", "");
  return formData;
}

export function BudgetInlineExpenseTable({
  eventId,
  categorySlug,
  items,
  canEdit,
}: BudgetInlineExpenseTableProps) {
  const manualItems = useMemo(() => items.filter((item) => item.source === "manual"), [items]);
  const vendorItems = useMemo(() => items.filter((item) => item.source === "vendor"), [items]);

  const [showPicker, setShowPicker] = useState(false);
  const [templates, setTemplates] = useState<VendorServiceTemplate[]>([]);
  const [customExpenseEditing, setCustomExpenseEditing] = useState(false);
  const [customExpenseName, setCustomExpenseName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [edits, setEdits] = useState<Record<string, RowEditState>>({});
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tableRef = useRef<HTMLDivElement>(null);
  const editCellRefs = useRef<Record<string, (HTMLInputElement | null)[]>>({});

  useEffect(() => {
    let cancelled = false;
    void fetchServiceTemplates(categorySlug).then((fetched) => {
      if (!cancelled) setTemplates(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  useEffect(() => {
    setShowPicker(false);
    setCustomExpenseEditing(false);
    setCustomExpenseName("");
    setCreateError("");
  }, [categorySlug]);

  useEffect(() => {
    setEdits((prev) => {
      const next: Record<string, RowEditState> = {};
      for (const item of manualItems) {
        next[item.id] = prev[item.id] ?? rowToEdit(item);
      }
      return next;
    });
  }, [manualItems]);

  const markSaving = useCallback((key: string, on: boolean) => {
    setSavingKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const validateRow = useCallback((state: RowEditState): string | null => {
    if (!state.title.trim()) {
      return "Denumirea este obligatorie.";
    }
    if (!isValidPriceInput(state.estimated) || !isValidPriceInput(state.paid)) {
      return ro.vendors.workspace.invalidPrice;
    }
    return null;
  }, []);

  const persistRow = useCallback(
    async (rowKey: string, state: RowEditState, item?: BudgetLineItem) => {
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

      if (!item) return false;
      markSaving(rowKey, true);
      const formData = buildFormData(state, categorySlug, item.actual_cost);
      const result = await updateBudgetItem(eventId, item.id, formData);
      markSaving(rowKey, false);
      if (result.error) {
        setFieldErrors((e) => ({ ...e, [rowKey]: result.error! }));
        return false;
      }
      setEditingRowKey(null);
      return true;
    },
    [categorySlug, eventId, markSaving, validateRow]
  );

  const closeExpensePicker = useCallback(() => {
    setShowPicker(false);
    setCustomExpenseEditing(false);
    setCustomExpenseName("");
    setCreateError("");
  }, []);

  const openExpensePicker = useCallback(() => {
    setShowPicker(true);
    setCreateError("");
    if (templates.length === 0) {
      setCustomExpenseEditing(true);
      setCustomExpenseName("");
    } else {
      setCustomExpenseEditing(false);
      setCustomExpenseName("");
    }
  }, [templates.length]);

  const handleCreateExpense = useCallback(
    async (title?: string) => {
      const expenseTitle = (title ?? customExpenseName).trim();
      if (expenseTitle.length < 2) return;
      setCreating(true);
      setCreateError("");
      const result = await createBudgetItem(eventId, buildCreateFormData(expenseTitle, categorySlug));
      setCreating(false);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      closeExpensePicker();
    },
    [categorySlug, closeExpensePicker, customExpenseName, eventId]
  );

  const handleCreateFromTemplate = useCallback(
    async (template: VendorServiceTemplate) => {
      if (creating) return;
      await handleCreateExpense(template.label_key);
    },
    [creating, handleCreateExpense]
  );

  const focusCell = useCallback((rowKey: string, cellIndex: number) => {
    editCellRefs.current[rowKey]?.[cellIndex]?.focus();
  }, []);

  const handleTab = useCallback(
    (rowKey: string, cellIndex: number, item?: BudgetLineItem) => {
      if (cellIndex < CELL_ORDER.length - 1) {
        focusCell(rowKey, cellIndex + 1);
        return;
      }
      const state = edits[rowKey] ?? (item ? rowToEdit(item) : { title: "", estimated: "", paid: "" });
      void persistRow(rowKey, state, item).then((ok) => {
        if (!ok) return;
        if (editingRowKey === rowKey) {
          setEditingRowKey(null);
        }
      });
    },
    [edits, editingRowKey, focusCell, persistRow]
  );

  const handleEnter = useCallback(
    (rowKey: string, item?: BudgetLineItem) => {
      const state = edits[rowKey] ?? (item ? rowToEdit(item) : { title: "", estimated: "", paid: "" });
      void persistRow(rowKey, state, item);
    },
    [edits, persistRow]
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
        if (editingRowKey && edits[editingRowKey]) {
          const item = manualItems.find((i) => i.id === editingRowKey);
          void persistRow(editingRowKey, edits[editingRowKey], item);
        }
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [canEdit, editingRowKey, edits, manualItems, persistRow]);

  function renderCellInput(
    rowKey: string,
    cellKey: CellKey,
    cellIndex: number,
    value: string,
    onChange: (v: string) => void,
    item?: BudgetLineItem
  ) {
    const onValueChange = (raw: string) => {
      if (cellKey === "estimated" || cellKey === "paid") onChange(sanitizePriceInput(raw));
      else onChange(raw);
    };

    return (
      <input
        ref={(el) => {
          if (!editCellRefs.current[rowKey]) editCellRefs.current[rowKey] = [];
          editCellRefs.current[rowKey][cellIndex] = el;
        }}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleEnter(rowKey, item);
          } else if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            handleTab(rowKey, cellIndex, item);
          }
        }}
        className={cellInputClass}
        placeholder={ro.vendors.workspace.emptyCell}
      />
    );
  }

  const colSpan = canEdit ? 5 : 4;

  return (
    <div ref={tableRef} className="overflow-x-auto rounded-[18px] border border-border-rose-18 bg-white/70 shadow-card backdrop-blur-md">
      <table className="min-w-full w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-rose-18/60 bg-[#F3F3F5]/40">
            <th className={cn(thClass, "pl-4")}>{ro.budgetModule.nameColumn}</th>
            <th className={cn(thClass, "text-right")}>{ro.budgetModule.estimated}</th>
            <th className={cn(thClass, "text-right")}>{ro.budgetModule.paid}</th>
            <th className={thClass}>{ro.budgetModule.statusColumn}</th>
            {canEdit ? (
              <th className={cn(thClass, "w-[148px] pr-4 text-right")}>{ro.budgetModule.actionsColumn}</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-rose-18/20">
          {vendorItems.map((item) => (
            <tr
              key={item.id}
              className={cn(rowClass, "bg-[var(--dash-sage)]/[0.04]")}
            >
              <td className={cn(tdClass, "pl-4")}>
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--dash-sage)]" aria-hidden />
                  <span className="text-xs font-semibold text-[#1A0E14]">{item.title}</span>
                </div>
                {item.serviceName ? (
                  <p className="mt-0.5 truncate pl-5 text-[11px] text-[var(--dash-text-muted)]">
                    {item.serviceName}
                  </p>
                ) : null}
              </td>
              <td className={cn(tdClass, "text-right tabular-nums text-text-secondary")}>
                {formatLei(item.estimated_cost)}
              </td>
              <td className={cn(tdClass, "text-right tabular-nums text-[var(--dash-sage)]")}>
                {formatLei(item.paid_amount)}
              </td>
              <td className={tdClass}>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    statusClass(item.status)
                  )}
                >
                  {statusLabel(item.status)}
                </span>
              </td>
              {canEdit ? (
                <td className={cn(tdClass, "pr-4 text-right")}>
                  <Link
                    href={`/dashboard/events/${eventId}/vendors`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--dash-accent-text)] hover:underline"
                  >
                    {ro.budgetModule.manageInVendors}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </td>
              ) : null}
            </tr>
          ))}

          {manualItems.map((item) => {
            const edit = edits[item.id] ?? rowToEdit(item);
            const isEditing = editingRowKey === item.id;
            const saving = savingKeys.has(item.id);
            const err = fieldErrors[item.id];

            return (
              <tr key={item.id} className={cn(rowClass, saving && "opacity-60")}>
                <td className={cn(tdClass, "pl-4")}>
                  {canEdit && isEditing
                    ? renderCellInput(item.id, "title", 0, edit.title, (v) =>
                        setEdits((e) => ({ ...e, [item.id]: { ...edit, title: v } }))
                      , item)
                    : (
                      <span className="text-xs font-semibold text-[#1A0E14]">{item.title}</span>
                    )}
                </td>
                <td className={tdClass}>
                  {canEdit && isEditing
                    ? renderCellInput(item.id, "estimated", 1, edit.estimated, (v) =>
                        setEdits((e) => ({ ...e, [item.id]: { ...edit, estimated: v } }))
                      , item)
                    : (
                      <span className="block text-right text-xs tabular-nums text-text-secondary">
                        {formatLei(item.estimated_cost)}
                      </span>
                    )}
                </td>
                <td className={tdClass}>
                  {canEdit && isEditing
                    ? renderCellInput(item.id, "paid", 2, edit.paid, (v) =>
                        setEdits((e) => ({ ...e, [item.id]: { ...edit, paid: v } }))
                      , item)
                    : (
                      <span className="block text-right text-xs tabular-nums text-[var(--dash-sage)]">
                        {formatLei(item.paid_amount)}
                      </span>
                    )}
                </td>
                <td className={tdClass}>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      statusClass(item.status)
                    )}
                  >
                    {statusLabel(item.status)}
                  </span>
                </td>
                {canEdit ? (
                  <td className={cn(tdClass, "pr-4")}>
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-text-secondary hover:text-[#1A0E14]"
                        onClick={() => setEditingRowKey(item.id)}
                      >
                        {ro.vendors.workspace.edit}
                      </button>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-text-secondary hover:text-red-600"
                        onClick={() => {
                          if (confirm(ro.budgetModule.deleteConfirm)) {
                            void deleteBudgetItem(eventId, item.id);
                          }
                        }}
                      >
                        {ro.vendors.workspace.deleteRow}
                      </button>
                    </div>
                    {err ? <p className="mt-1 text-[12px] text-red-600">{err}</p> : null}
                  </td>
                ) : null}
              </tr>
            );
          })}

          {items.length === 0 && !canEdit ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center text-[13px] text-[var(--dash-text-muted)]">
                {ro.budgetModule.noExpenses}
              </td>
            </tr>
          ) : null}

          {canEdit ? (
            showPicker ? (
              <tr className={cn(rowClass, "bg-[#F3F3F5]/20")}>
                <td colSpan={colSpan} className={cn(tdClass, "pl-4 py-3 pr-4")}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          disabled={creating || customExpenseEditing}
                          onClick={() => void handleCreateFromTemplate(template)}
                          className={EXPENSE_CARD_CLASS}
                        >
                          <EmojiIcon icon={resolveTemplateIcon(template.icon_key)} size="sm" />
                          {template.label_key}
                        </button>
                      ))}
                      {customExpenseEditing ? (
                        <div className="inline-flex min-w-[min(100%,16rem)] flex-1 items-center gap-2">
                          <input
                            value={customExpenseName}
                            onChange={(e) => setCustomExpenseName(e.target.value)}
                            placeholder={ro.vendors.workspace.customServiceNamePlaceholder}
                            autoFocus
                            disabled={creating}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleCreateExpense();
                            }}
                            className="h-8 min-w-0 flex-1 rounded-[8px] border border-[rgba(210,170,185,0.22)] bg-[#F3F3F5] px-2.5 text-xs text-[#1A0E14] outline-none focus-visible:border-[#B8516B]/40 focus-visible:ring-3 focus-visible:ring-[#B8516B]/10"
                          />
                          <button
                            type="button"
                            disabled={creating || customExpenseName.trim().length < 2}
                            onClick={() => void handleCreateExpense()}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] text-white shadow-primary-btn disabled:opacity-40"
                            aria-label={ro.budgetModule.addExpense}
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={creating}
                          onClick={() => {
                            setCustomExpenseEditing(true);
                            setCustomExpenseName("");
                            setCreateError("");
                          }}
                          className={CUSTOM_EXPENSE_CARD_CLASS}
                        >
                          <EmojiIcon icon={getIconForVendorCategory(categorySlug)} size="sm" />
                          {ro.budgetModule.customExpense}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={creating}
                      onClick={closeExpensePicker}
                      className="text-xs font-medium text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-text-secondary)] disabled:opacity-50"
                    >
                      {ro.vendors.workspace.cancelService}
                    </button>
                    {createError ? <p className="text-[12px] text-red-600">{createError}</p> : null}
                  </div>
                </td>
              </tr>
            ) : (
              <tr className={rowClass}>
                <td colSpan={colSpan} className={cn(tdClass, "pl-4 py-2")}>
                  <button
                    type="button"
                    onClick={openExpensePicker}
                    className="inline-flex items-center gap-1 text-xs text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-accent-text)]"
                    aria-label={ro.budgetModule.addExpense}
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
