"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ro as roDateFns } from "date-fns/locale";
import { Check, Grid3X3, Loader2, Plus, Trash2, X } from "lucide-react";

import {
  deleteSeatingSnapshot,
  listSeatingSnapshots,
  saveSeatingSnapshot,
  updateSnapshotName,
} from "@/app/(dashboard)/dashboard/events/[id]/seating/layout-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ro } from "@/lib/i18n/ro";
import type { SeatingLayoutSnapshot } from "@/types/seating";
import { CURRENT_PLAN_SNAPSHOT_NAME } from "@/types/seating";
import { cn } from "@/lib/utils";

export const LAYOUT_SIDEBAR_WIDTH = 280;

const THUMBNAIL_MAX_WIDTH = 400;
const SAVED_CHECKMARK_MS = 2500;

type LayoutSidebarProps = {
  eventId: string;
  open: boolean;
  onClose: () => void;
  onCaptureThumbnail?: () => Promise<string>;
  previewSnapshotId?: string | null;
  onPreviewSnapshot?: (snapshot: SeatingLayoutSnapshot | null) => void;
  refreshKey?: number;
  className?: string;
  onNewLayout?: () => void | Promise<void>;
  newLayoutBusy?: boolean;
};

function isCurrentPlanSnapshot(snapshot: SeatingLayoutSnapshot): boolean {
  return snapshot.is_current_plan || snapshot.name === CURRENT_PLAN_SNAPSHOT_NAME;
}

function sortSnapshots(snapshots: SeatingLayoutSnapshot[]): SeatingLayoutSnapshot[] {
  const current = snapshots.filter((s) => isCurrentPlanSnapshot(s));
  const others = snapshots
    .filter((s) => !isCurrentPlanSnapshot(s))
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  return [...current, ...others];
}

async function downscaleThumbnail(dataUrl: string, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.width <= maxWidth) {
        resolve(dataUrl);
        return;
      }
      const scale = maxWidth / image.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png", 0.85));
    };
    image.onerror = () => reject(new Error("Nu s-a putut redimensiona miniatura."));
    image.src = dataUrl;
  });
}

function formatRelativeDate(iso: string): string {
  return formatDistanceToNow(new Date(iso), {
    addSuffix: true,
    locale: roDateFns,
  });
}

function LayoutCardSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-[rgba(210,170,185,0.22)] bg-white/80 p-2.5">
      <Skeleton className="h-20 w-full rounded-lg bg-[rgba(210,170,185,0.2)]" />
      <Skeleton className="h-4 w-3/4 bg-[rgba(210,170,185,0.25)]" />
      <Skeleton className="h-3 w-1/2 bg-[rgba(210,170,185,0.15)]" />
    </div>
  );
}

type LayoutCardProps = {
  snapshot: SeatingLayoutSnapshot;
  busy: boolean;
  showSavedCheck: boolean;
  deleteConfirmId: string | null;
  editingId: string | null;
  editName: string;
  onEditNameChange: (value: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isPreviewSelected: boolean;
  onPreviewToggle: () => void;
};

function LayoutCard({
  snapshot,
  busy,
  showSavedCheck,
  deleteConfirmId,
  editingId,
  editName,
  onEditNameChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  isPreviewSelected,
  onPreviewToggle,
}: LayoutCardProps) {
  const t = ro.seating.layoutSnapshots.sidebar;
  const isCurrentPlan =
    snapshot.is_current_plan || snapshot.name === CURRENT_PLAN_SNAPSHOT_NAME;
  const isEditing = editingId === snapshot.id;
  const isDeleteConfirm = deleteConfirmId === snapshot.id;
  const tableCount = snapshot.tables_json?.length ?? 0;

  return (
    <div
      role="button"
      tabIndex={isEditing || isDeleteConfirm ? -1 : 0}
      onClick={() => {
        if (isEditing || isDeleteConfirm || busy) return;
        onPreviewToggle();
      }}
      onKeyDown={(e) => {
        if (isEditing || isDeleteConfirm || busy) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreviewToggle();
        }
      }}
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-gradient-to-br from-white to-[#FEF8FA]/90 p-2.5 shadow-[0_2px_12px_rgba(180,100,120,0.06)] transition-colors duration-200",
        isPreviewSelected
          ? "border-2 border-[#B8516B] shadow-[0_0_0_1px_rgba(184,81,107,0.12)]"
          : "border-[rgba(210,170,185,0.22)] hover:border-[rgba(210,170,185,0.55)]",
        showSavedCheck && "ring-2 ring-emerald-300/80 ring-offset-1"
      )}
    >
      {showSavedCheck ? (
        <div className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm animate-in zoom-in-50 fade-in duration-200">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
      ) : null}

      {!isDeleteConfirm && !isCurrentPlan ? (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest();
          }}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-transparent bg-white/90 text-[#8A7080] opacity-0 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-[#B8516B] group-hover:opacity-100 disabled:pointer-events-none"
          aria-label="Șterge layout"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <div className="relative mb-2 overflow-hidden rounded-lg border border-[rgba(210,170,185,0.2)]">
        <div className="relative h-20 w-full">
          {isCurrentPlan ? (
            <span className="absolute left-2 top-2 z-20 rounded-full bg-[#89a293] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              {t.currentPlanBadge}
            </span>
          ) : null}
          {snapshot.thumbnail_data_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snapshot.thumbnail_data_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(254,240,243,0.65)]">
              <Grid3X3 className="h-6 w-6 text-[#C4A8B4]" strokeWidth={1.5} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[rgba(26,14,20,0.35)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="text-xs font-semibold tracking-wide text-white">
              {t.previewOverlay}
            </span>
          </div>
        </div>
      </div>

      {isEditing ? (
        <Input
          value={editName}
          maxLength={50}
          autoFocus
          disabled={busy}
          className="mb-1 h-8 rounded-lg border-[rgba(210,170,185,0.35)] text-sm font-medium"
          onChange={(e) => onEditNameChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
          onBlur={onCommitEdit}
        />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          className="mb-1 block w-full truncate text-left text-sm font-medium text-[#1A0E14] hover:text-[#B8516B]"
          title={snapshot.name}
        >
          {snapshot.name}
        </button>
      )}

      <p className="text-[11px] text-[#8A7080]">
        {t.tableMeta
          .replace("{count}", String(tableCount))
          .replace("{relative}", formatRelativeDate(snapshot.updated_at))}
      </p>

      {isDeleteConfirm ? (
        <div className="mt-2 flex items-center gap-2 border-t border-[rgba(210,170,185,0.18)] pt-2">
          <span className="flex-1 text-xs font-medium text-[#8A7080]">
            {t.deleteConfirm}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCancel();
            }}
          >
            {t.deleteNo}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            className="h-7 rounded-lg bg-[#B8516B] px-2.5 text-xs hover:bg-[#9A4560]"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteConfirm();
            }}
          >
            {t.deleteYes}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function LayoutSidebar({
  eventId,
  open,
  onClose,
  onCaptureThumbnail,
  previewSnapshotId = null,
  onPreviewSnapshot,
  refreshKey = 0,
  className,
  onNewLayout,
  newLayoutBusy = false,
}: LayoutSidebarProps) {
  const router = useRouter();
  const t = ro.seating.layoutSnapshots.sidebar;
  const tCommon = ro.seating.layoutSnapshots;

  const [snapshots, setSnapshots] = useState<SeatingLayoutSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveFormOpen, setSaveFormOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!recentlySavedId) return;
    const timer = window.setTimeout(() => setRecentlySavedId(null), SAVED_CHECKMARK_MS);
    return () => window.clearTimeout(timer);
  }, [recentlySavedId]);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const result = await listSeatingSnapshots(eventId);
    setLoading(false);
    if (result.error) {
      setListError(result.error);
      return;
    }
    setSnapshots(sortSnapshots(result.snapshots ?? []));
  }, [eventId]);

  useEffect(() => {
    if (!open) return;
    void loadSnapshots();
    setDeleteConfirmId(null);
    setEditingId(null);
    setSaveError(null);
    setListError(null);
  }, [open, loadSnapshots, refreshKey]);

  const handleSaveCancel = () => {
    setSaveFormOpen(false);
    setSaveName("");
    setSaveError(null);
  };

  const handleSave = async () => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      setSaveError(tCommon.nameRequired);
      return;
    }

    setBusy(true);
    setSaveError(null);

    let thumbnail: string | undefined;
    if (onCaptureThumbnail) {
      try {
        const captured = await onCaptureThumbnail();
        thumbnail = await downscaleThumbnail(captured, THUMBNAIL_MAX_WIDTH);
      } catch {
        thumbnail = undefined;
      }
    }

    const result = await saveSeatingSnapshot(eventId, trimmed, thumbnail);
    setBusy(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    setSaveFormOpen(false);
    setSaveName("");

    if (result.snapshot) {
      setRecentlySavedId(result.snapshot.id);
      setSnapshots((prev) =>
        sortSnapshots([
          result.snapshot!,
          ...prev.filter((s) => s.id !== result.snapshot!.id),
        ])
      );
    } else {
      void loadSnapshots();
    }

    router.refresh();
  };

  const handleDelete = async (snapshotId: string) => {
    setBusy(true);
    const result = await deleteSeatingSnapshot(eventId, snapshotId);
    setBusy(false);
    setDeleteConfirmId(null);

    if (result.error) {
      setListError(result.error);
      return;
    }

    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    if (previewSnapshotId === snapshotId) {
      onPreviewSnapshot?.(null);
    }
  };

  const commitRename = async (snapshot: SeatingLayoutSnapshot) => {
    const trimmed = editName.trim();
    setEditingId(null);
    if (!trimmed || trimmed === snapshot.name) return;

    setBusy(true);
    const result = await updateSnapshotName(eventId, snapshot.id, trimmed);
    setBusy(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    setSnapshots((prev) =>
      prev.map((s) => (s.id === snapshot.id ? { ...s, name: trimmed } : s))
    );
  };

  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col overflow-hidden select-none transition-all duration-350 ease-in-out",
        className
      )}
      style={{
        background: "var(--ev-bg-sidebar)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid var(--ev-border-soft)",
        boxShadow: "-2px 0 16px rgba(160,80,110,0.06)",
      }}
    >
      <div
        className="flex shrink-0 items-start justify-between"
        style={{
          padding: "18px 18px 14px",
          borderBottom: "1px solid var(--ev-border-soft)",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ev-text-primary)",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "-0.3px",
              lineHeight: 1,
            }}
          >
            Layout-uri
          </h3>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: 11,
              color: "var(--ev-text-muted)",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.01em",
            }}
          >
            Salvează și comută între variante
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 shrink-0 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-slate-700"
          title="Închide panoul de layout-uri"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ background: "rgba(249, 244, 241, 0.45)" }}
      >
        <div className="shrink-0 border-b border-[rgba(210,170,185,0.18)] px-3.5 py-3">
          <Button
            type="button"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-[#E8748A] to-[#B8516B] font-semibold text-white shadow-[0_2px_10px_rgba(184,81,107,0.28)] hover:opacity-95 disabled:opacity-70"
            onClick={() => {
              setSaveFormOpen((prev) => !prev);
              setSaveError(null);
              if (saveFormOpen) {
                setSaveName("");
              }
            }}
          >
            {t.saveButton}
          </Button>

          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              saveFormOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  "space-y-2.5 rounded-xl border border-[rgba(210,170,185,0.25)] bg-white/90 p-3",
                  saveFormOpen && "animate-in slide-in-from-top-2 fade-in duration-200"
                )}
              >
                <div>
                  <Label
                    htmlFor="layout-sidebar-name"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#C4A8B4]"
                  >
                    {t.nameLabel}
                  </Label>
                  <Input
                    id="layout-sidebar-name"
                    value={saveName}
                    maxLength={50}
                    disabled={busy}
                    placeholder={t.namePlaceholder}
                    className="h-9 rounded-lg border-[rgba(210,170,185,0.35)] text-sm"
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSave();
                      if (e.key === "Escape") handleSaveCancel();
                    }}
                  />
                </div>

                {saveError ? (
                  <p className="text-xs font-medium text-rose-600" role="alert">
                    {saveError}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    className="h-8 flex-1 rounded-lg text-xs"
                    onClick={handleSaveCancel}
                  >
                    {t.saveCancel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    className="h-8 flex-1 rounded-lg bg-[#B8516B] text-xs font-semibold text-white hover:bg-[#9A4560]"
                    onClick={() => void handleSave()}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        {t.saving}
                      </>
                    ) : (
                      t.saveConfirm
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3.5 py-3">
          {listError ? (
            <p className="mb-3 text-xs font-medium text-rose-600" role="alert">
              {listError}
            </p>
          ) : null}
          {loading ? (
            <div className="flex flex-col gap-3">
              <LayoutCardSkeleton />
              <LayoutCardSkeleton />
              <LayoutCardSkeleton />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-2 py-10 text-center">
              <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(254,240,243,0.8)]">
                <Grid3X3 className="h-5 w-5 text-[#C4A8B4]" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-[#1A0E14]">{t.emptyTitle}</p>
              <p className="text-xs leading-relaxed text-[#8A7080]">{t.emptyHint}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {snapshots.map((snapshot) => (
                <LayoutCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  busy={busy}
                  showSavedCheck={recentlySavedId === snapshot.id}
                  deleteConfirmId={deleteConfirmId}
                  editingId={editingId}
                  editName={editName}
                  onEditNameChange={setEditName}
                  onStartEdit={() => {
                    setEditingId(snapshot.id);
                    setEditName(snapshot.name);
                    setDeleteConfirmId(null);
                  }}
                  onCommitEdit={() => void commitRename(snapshot)}
                  onCancelEdit={() => {
                    setEditingId(null);
                    setEditName(snapshot.name);
                  }}
                  onDeleteRequest={() => {
                    setDeleteConfirmId(snapshot.id);
                    setEditingId(null);
                  }}
                  onDeleteConfirm={() => void handleDelete(snapshot.id)}
                  onDeleteCancel={() => setDeleteConfirmId(null)}
                  isPreviewSelected={previewSnapshotId === snapshot.id}
                  onPreviewToggle={() => {
                    if (!onPreviewSnapshot) return;
                    if (previewSnapshotId === snapshot.id) {
                      onPreviewSnapshot(null);
                    } else {
                      onPreviewSnapshot(snapshot);
                    }
                  }}
                />
              ))}
            </div>
          )}
          {onNewLayout ? (
            <button
              type="button"
              disabled={busy || newLayoutBusy}
              onClick={() => void onNewLayout()}
              className={cn(
                "mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-5 text-center transition-colors",
                "border-[rgba(210,170,185,0.45)] bg-white/60 hover:border-[#B8516B]/45 hover:bg-[#FEF0F3]/40",
                (busy || newLayoutBusy) && "cursor-not-allowed opacity-60"
              )}
            >
              {newLayoutBusy ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#B8516B]" />
              ) : (
                <Plus className="h-5 w-5 text-[#B8516B]" strokeWidth={1.75} />
              )}
              <span className="text-sm font-semibold text-[#1A0E14]">Layout nou</span>
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
