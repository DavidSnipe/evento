"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";

import {
  activateVendorCategory,
  createVendorCategory,
} from "@/app/(dashboard)/dashboard/events/[id]/vendors/category-actions";
import { categoryLabel } from "@/lib/vendors/grouping";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { getIconForVendorCategory } from "@/lib/icons/registry";
import { ro } from "@/lib/i18n/ro";
import type { VendorCategoryRow } from "@/types/vendors";
import { GeistSans } from "geist/font/sans";

import { cn } from "@/lib/utils";

import "@/components/layout/dashboard-foundation.css";
import "./vendors-theme.css";

type VendorCategoryPickerProps = {
  eventId: string;
  open: boolean;
  onClose: () => void;
  categories: VendorCategoryRow[];
  activeSlugs: string[];
  onActivated: (slug: string) => void;
};

export function VendorCategoryPicker({
  eventId,
  open,
  onClose,
  categories,
  activeSlugs,
  onActivated,
}: VendorCategoryPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customName, setCustomName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const inactive = useMemo(() => {
    const active = new Set(activeSlugs);
    return categories.filter((c) => !active.has(c.slug));
  }, [categories, activeSlugs]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !mounted) return null;

  async function handleActivate(slug: string) {
    setPending(true);
    setError("");
    const result = await activateVendorCategory(eventId, slug);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onActivated(slug);
    onClose();
  }

  async function handleCreateCustom() {
    if (!customName.trim()) return;
    setPending(true);
    setError("");
    const result = await createVendorCategory(eventId, customName);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onActivated(result.id ?? customName);
    setCustomName("");
    onClose();
  }

  const content = (
    <div className={cn("dashboard-shell vendors-workspace", GeistSans.className)}>
      <div
        className={cn(
          "fixed inset-0 z-[10000] h-[100dvh] w-screen bg-[#1C1816]/20 backdrop-blur-[1px] transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed left-1/2 top-1/2 z-[10001] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-[var(--vk-ivory)] shadow-[0_24px_80px_rgba(28,24,22,0.14)] transition-all duration-200",
          visible ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-6 py-5">
          <h2 className="text-[17px] font-semibold tracking-tight text-[var(--vk-text)]">
            {ro.vendors.workspace.pickCategoryTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--vk-text-muted)] transition-colors hover:bg-[var(--vk-warm-gray)] hover:text-[var(--vk-text)]"
            aria-label={ro.vendors.workspace.cancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 pb-6">
          {inactive.length > 0 ? (
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {inactive.map((cat) => (
                <li key={cat.slug}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void handleActivate(cat.slug)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-[14px] font-medium text-[var(--vk-text)] transition-colors hover:bg-[var(--vk-warm-gray)]/60 disabled:opacity-50"
                  >
                    <EmojiIcon icon={getIconForVendorCategory(cat.slug)} size="md" />
                    {categoryLabel(cat.slug, categories)}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--vk-text-muted)]">
              {ro.vendors.workspace.allCategoriesActive}
            </p>
          )}

          <div className="space-y-2 pt-2">
            <p className="text-[12px] font-medium text-[var(--vk-text-muted)]">
              {ro.vendors.workspace.customCategoryLabel}
            </p>
            <div className="flex gap-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={ro.vendors.workspace.categoryName}
                className="h-10 flex-1 border-0 border-b border-[var(--vk-hairline)] bg-transparent px-0 text-[14px] outline-none focus:border-[var(--vk-dusty-rose)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateCustom();
                }}
              />
              <button
                type="button"
                disabled={pending || customName.trim().length < 2}
                onClick={() => void handleCreateCustom()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--vk-text)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
