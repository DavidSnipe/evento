"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import {
  createBudgetItem,
  updateBudgetItem,
  updateBudgetTarget,
} from "@/app/(dashboard)/dashboard/events/[id]/budget/actions";
import { ro } from "@/lib/i18n/ro";
import type { BudgetLineItem } from "@/types/budget";
import { cn } from "@/lib/utils";

type BudgetCategoryOption = { slug: string; label: string };

const inputClass =
  "h-9 w-full rounded-[10px] border border-[rgba(210,170,185,0.22)] bg-[#F3F3F5] px-3 text-xs text-[#1A0E14] outline-none focus-visible:border-[#B8516B]/40 focus-visible:ring-3 focus-visible:ring-[#B8516B]/10";

function BudgetItemFormFields({
  categories,
  defaultCategorySlug = "",
  item,
}: {
  categories: BudgetCategoryOption[];
  defaultCategorySlug?: string;
  item?: BudgetLineItem;
}) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">
          {ro.budgetModule.categoryLabel}
        </label>
        <select
          name="category_slug"
          defaultValue={item?.categorySlug ?? defaultCategorySlug}
          required
          className={inputClass}
        >
          <option value="" disabled>
            {ro.budgetModule.selectCategoryOption}
          </option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">
          {ro.budgetModule.nameColumn}
        </label>
        <input
          name="title"
          defaultValue={item?.title ?? ""}
          placeholder="ex: Tips, transport suplimentar"
          required
          autoFocus={!item}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">
            {ro.budgetModule.estimated}
          </label>
          <input
            name="estimated_cost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={item?.estimated_cost ?? 0}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">
            {ro.budgetModule.actual}
          </label>
          <input
            name="actual_cost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={item?.actual_cost ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">
          {ro.budgetModule.paid}
        </label>
        <input
          name="paid_amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={item?.paid_amount ?? 0}
          className={inputClass}
        />
      </div>
    </>
  );
}

function BudgetDialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1816]/20 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className="glass-panel mx-4 w-full max-w-md animate-in fade-in zoom-in-95 rounded-[20px] border bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight text-[var(--dash-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--dash-text-muted)] hover:bg-[var(--dash-warm-gray)]"
            aria-label={ro.vendors.workspace.cancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden />
    </div>
  );
}

export function AddBudgetDialog({
  eventId,
  open,
  onClose,
  categories,
  defaultCategorySlug = "",
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
  categories: BudgetCategoryOption[];
  defaultCategorySlug?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await createBudgetItem(eventId, formData);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <BudgetDialogShell title={ro.budgetModule.addExpense} onClose={onClose}>
      <form action={handleSubmit} className="space-y-4">
        <BudgetItemFormFields categories={categories} defaultCategorySlug={defaultCategorySlug} />

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[10px] border border-border-rose-18/30 px-4 py-2.5 text-xs font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-warm-gray)]/60"
          >
            {ro.vendors.workspace.cancel}
          </button>
          <button
            type="submit"
            disabled={pending || categories.length === 0}
            className={cn(
              "flex-1 rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-4 py-2.5 text-xs font-bold text-white shadow-primary-btn hover:opacity-95 disabled:opacity-50"
            )}
          >
            {pending ? ro.vendors.workspace.saving : ro.vendors.workspace.saveService}
          </button>
        </div>
      </form>
    </BudgetDialogShell>
  );
}

export function EditBudgetDialog({
  eventId,
  item,
  open,
  onClose,
  categories,
}: {
  eventId: string;
  item: BudgetLineItem | null;
  open: boolean;
  onClose: () => void;
  categories: BudgetCategoryOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open || !item) return null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await updateBudgetItem(eventId, item!.id, formData);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <BudgetDialogShell title={ro.budgetModule.editExpense} onClose={onClose}>
      <form action={handleSubmit} className="space-y-4">
        <BudgetItemFormFields categories={categories} item={item} />

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[10px] border border-border-rose-18/30 px-4 py-2.5 text-xs font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-warm-gray)]/60"
          >
            {ro.vendors.workspace.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "flex-1 rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-4 py-2.5 text-xs font-bold text-white shadow-primary-btn hover:opacity-95 disabled:opacity-50"
            )}
          >
            {pending ? ro.vendors.workspace.saving : ro.vendors.workspace.saveService}
          </button>
        </div>
      </form>
    </BudgetDialogShell>
  );
}

export function BudgetTargetDialog({
  eventId,
  open,
  onClose,
  currentTarget,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
  currentTarget: number | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await updateBudgetTarget(eventId, formData);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <BudgetDialogShell title={ro.budgetModule.setTargetTitle} onClose={onClose}>
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">
            {ro.budgetModule.statsTotal}
          </label>
          <input
            name="budget_target"
            type="number"
            min="0"
            step="100"
            defaultValue={currentTarget ?? ""}
            placeholder="ex: 25000"
            required
            autoFocus
            className={inputClass}
          />
          <p className="text-[11px] text-[var(--dash-text-muted)]">{ro.budgetModule.targetHint}</p>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[10px] border border-border-rose-18/30 px-4 py-2.5 text-xs font-semibold text-[var(--dash-text-secondary)] hover:bg-[var(--dash-warm-gray)]/60"
          >
            {ro.vendors.workspace.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "flex-1 rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-4 py-2.5 text-xs font-bold text-white shadow-primary-btn hover:opacity-95 disabled:opacity-50"
            )}
          >
            {pending ? ro.vendors.workspace.saving : ro.vendors.workspace.saveService}
          </button>
        </div>
      </form>
    </BudgetDialogShell>
  );
}
