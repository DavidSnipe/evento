"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  LayoutGrid,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  activateSeatingSnapshot,
  deleteSeatingSnapshot,
  listSeatingSnapshots,
  saveSeatingSnapshot,
  updateSnapshotName,
} from "@/app/(dashboard)/dashboard/events/[id]/seating/layout-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { modalContentVariants } from "@/lib/nuntiki/variants";
import type { SeatingLayoutSnapshot } from "@/types/seating";
import { cn } from "@/lib/utils";

type LayoutSnapshotsPanelProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptureThumbnail?: () => Promise<string>;
};

type PanelToast = {
  message: string;
  variant: "success" | "error" | "warning";
};

function formatSnapshotDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PanelToastBanner({ toast }: { toast: PanelToast | null }) {
  if (!toast) return null;
  const styles =
    toast.variant === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : toast.variant === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm",
        styles
      )}
      role="status"
    >
      {toast.message}
    </div>
  );
}

function SnapshotCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[16px] border border-[rgba(210,170,185,0.22)] bg-white/80 p-3">
      <div className="flex gap-3">
        <div className="h-16 w-20 shrink-0 rounded-lg bg-[rgba(210,170,185,0.2)]" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-4 w-2/3 rounded bg-[rgba(210,170,185,0.25)]" />
          <div className="h-3 w-1/2 rounded bg-[rgba(210,170,185,0.15)]" />
          <div className="h-3 w-1/3 rounded bg-[rgba(210,170,185,0.15)]" />
        </div>
      </div>
    </div>
  );
}

type SnapshotCardProps = {
  snapshot: SeatingLayoutSnapshot;
  busy: boolean;
  deleteConfirmId: string | null;
  editingId: string | null;
  editName: string;
  onEditNameChange: (value: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onActivate: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
};

function SnapshotCard({
  snapshot,
  busy,
  deleteConfirmId,
  editingId,
  editName,
  onEditNameChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onActivate,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: SnapshotCardProps) {
  const t = ro.seating.layoutSnapshots.panel;
  const isEditing = editingId === snapshot.id;
  const isDeleteConfirm = deleteConfirmId === snapshot.id;
  const tableCount = snapshot.tables_json?.length ?? 0;

  return (
    <div className="rounded-[16px] border border-[rgba(210,170,185,0.22)] bg-gradient-to-br from-white to-[#FEF8FA]/90 p-3 shadow-[0_2px_12px_rgba(180,100,120,0.06)]">
      <div className="flex gap-3">
        <div
          className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[rgba(210,170,185,0.2)] bg-[#F9F4F1]"
        >
          {snapshot.thumbnail_data_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snapshot.thumbnail_data_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <LayoutGrid size={22} className="text-[#C4A8B4]" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input
              value={editName}
              maxLength={50}
              autoFocus
              disabled={busy}
              className="mb-1 h-8 rounded-lg border-[rgba(210,170,185,0.35)] text-sm font-semibold"
              onChange={(e) => onEditNameChange(e.target.value)}
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
              onClick={onStartEdit}
              className="mb-0.5 block w-full truncate text-left text-sm font-semibold text-[#1A0E14] hover:text-[#B8516B]"
              title={snapshot.name}
            >
              {snapshot.name}
            </button>
          )}

          <p className="text-[11px] text-[#8A7080]">
            {t.savedOn.replace("{date}", formatSnapshotDate(snapshot.created_at))}
          </p>
          <p className="text-[11px] text-[#C4A8B4]">
            {t.tableCount.replace("{count}", String(tableCount))}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {isDeleteConfirm ? (
          <>
            <span className="flex-1 text-xs font-medium text-[#8A7080]">
              {t.deleteConfirm}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="h-8 rounded-lg text-xs"
              onClick={onDeleteCancel}
            >
              {t.deleteCancel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              className="h-8 rounded-lg bg-[#B8516B] text-xs hover:bg-[#9A4560]"
              onClick={onDeleteConfirm}
            >
              {t.deleteYes}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              className="h-8 flex-1 rounded-lg bg-gradient-to-r from-[#E8748A] to-[#B8516B] text-xs font-semibold text-white shadow-sm hover:opacity-95"
              onClick={onActivate}
            >
              {t.activate}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={busy}
              className="h-8 w-8 shrink-0 rounded-lg border-[rgba(210,170,185,0.35)] text-[#8A7080] hover:border-rose-200 hover:bg-rose-50 hover:text-[#B8516B]"
              onClick={onDeleteRequest}
              aria-label="Șterge layout"
            >
              <Trash2 size={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function LayoutSnapshotsPanel({
  eventId,
  open,
  onOpenChange,
  onCaptureThumbnail,
}: LayoutSnapshotsPanelProps) {
  const router = useRouter();
  const t = ro.seating.layoutSnapshots.panel;

  const [snapshots, setSnapshots] = useState<SeatingLayoutSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [toast, setToast] = useState<PanelToast | null>(null);
  const [activateTarget, setActivateTarget] = useState<SeatingLayoutSnapshot | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    const result = await listSeatingSnapshots(eventId);
    setLoading(false);
    if (result.error) {
      setToast({ message: result.error, variant: "error" });
      return;
    }
    setSnapshots(result.snapshots ?? []);
  }, [eventId]);

  useEffect(() => {
    if (!open) return;
    void loadSnapshots();
    setDeleteConfirmId(null);
    setEditingId(null);
    setActivateTarget(null);
  }, [open, loadSnapshots]);

  const handleSave = async () => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      setToast({
        message: ro.seating.layoutSnapshots.nameRequired,
        variant: "error",
      });
      return;
    }

    setBusy(true);
    let thumbnail: string | undefined;
    if (onCaptureThumbnail) {
      try {
        thumbnail = await onCaptureThumbnail();
      } catch {
        thumbnail = undefined;
      }
    }

    const result = await saveSeatingSnapshot(eventId, trimmed, thumbnail);
    setBusy(false);

    if (result.error) {
      setToast({ message: result.error, variant: "error" });
      return;
    }

    setToast({ message: t.savedToast, variant: "success" });
    setSaveName("");
    if (result.snapshot) {
      setSnapshots((prev) => [
        result.snapshot!,
        ...prev.filter((s) => s.id !== result.snapshot!.id),
      ]);
    } else {
      void loadSnapshots();
    }
    router.refresh();
  };

  const handleActivateConfirm = async () => {
    if (!activateTarget) return;
    setBusy(true);
    const result = await activateSeatingSnapshot(eventId, activateTarget.id);
    setBusy(false);
    setActivateTarget(null);

    if (result.error) {
      setToast({ message: result.error, variant: "error" });
      return;
    }

    if (result.unassigned > 0) {
      setToast({
        message: t.activatedWarning
          .replace("{remapped}", String(result.remapped))
          .replace("{unassigned}", String(result.unassigned)),
        variant: "warning",
      });
    } else {
      setToast({
        message: t.activatedSuccess.replace(
          "{remapped}",
          String(result.remapped)
        ),
        variant: "success",
      });
    }

    onOpenChange(false);
    router.refresh();
  };

  const handleDelete = async (snapshotId: string) => {
    setBusy(true);
    const result = await deleteSeatingSnapshot(eventId, snapshotId);
    setBusy(false);
    setDeleteConfirmId(null);

    if (result.error) {
      setToast({ message: result.error, variant: "error" });
      return;
    }

    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  };

  const commitRename = async (snapshot: SeatingLayoutSnapshot) => {
    const trimmed = editName.trim();
    setEditingId(null);
    if (!trimmed || trimmed === snapshot.name) return;

    setBusy(true);
    const result = await updateSnapshotName(eventId, snapshot.id, trimmed);
    setBusy(false);

    if (result.error) {
      setToast({ message: result.error, variant: "error" });
      return;
    }

    setSnapshots((prev) =>
      prev.map((s) => (s.id === snapshot.id ? { ...s, name: trimmed } : s))
    );
  };

  return (
    <>
      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4"
          aria-live="polite"
        >
          <PanelToastBanner toast={toast} />
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            modalContentVariants(),
            "flex max-h-[min(88vh,720px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          )}
        >
          <DialogHeader className="border-b border-[rgba(210,170,185,0.18)] px-5 py-4 text-left">
            <DialogTitle className="font-serif text-xl text-[#1A0E14]">
              {t.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8A7080]">
              {t.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <section className="rounded-[16px] border border-[rgba(210,170,185,0.2)] bg-[rgba(254,240,243,0.35)] p-4">
              <Label
                htmlFor="layout-snapshot-name"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#C4A8B4]"
              >
                {t.nameLabel}
              </Label>
              <Input
                id="layout-snapshot-name"
                value={saveName}
                maxLength={50}
                disabled={busy}
                placeholder={t.namePlaceholder}
                className="mb-3 rounded-xl border-[rgba(210,170,185,0.35)] bg-white/90"
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave();
                }}
              />
              <Button
                type="button"
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-[#E8748A] to-[#B8516B] font-semibold text-white shadow-[0_2px_10px_rgba(184,81,107,0.28)] hover:opacity-95"
                onClick={() => void handleSave()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                    {t.saveButton}
                  </>
                )}
              </Button>
            </section>

            <section className="flex flex-col gap-3">
              {loading ? (
                <>
                  <SnapshotCardSkeleton />
                  <SnapshotCardSkeleton />
                </>
              ) : snapshots.length === 0 ? (
                <p className="rounded-[16px] border border-dashed border-[rgba(210,170,185,0.35)] bg-white/60 px-4 py-8 text-center text-sm leading-relaxed text-[#8A7080]">
                  {t.empty}
                </p>
              ) : (
                snapshots.map((snapshot) => (
                  <SnapshotCard
                    key={snapshot.id}
                    snapshot={snapshot}
                    busy={busy}
                    deleteConfirmId={deleteConfirmId}
                    editingId={editingId}
                    editName={editName}
                    onEditNameChange={setEditName}
                    onStartEdit={() => {
                      setEditingId(snapshot.id);
                      setEditName(snapshot.name);
                    }}
                    onCommitEdit={() => void commitRename(snapshot)}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditName(snapshot.name);
                    }}
                    onActivate={() => setActivateTarget(snapshot)}
                    onDeleteRequest={() => setDeleteConfirmId(snapshot.id)}
                    onDeleteConfirm={() => void handleDelete(snapshot.id)}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                  />
                ))
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={activateTarget != null}
        onOpenChange={(next) => {
          if (!next && !busy) setActivateTarget(null);
        }}
      >
        <AlertDialogContent className={modalContentVariants()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg">
              {t.activateTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-[#8A7080]">
              {t.activateBody.replace("{name}", activateTarget?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.activateCancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-[#B8516B] hover:bg-[#9A4560]"
              onClick={(e) => {
                e.preventDefault();
                void handleActivateConfirm();
              }}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.activating}
                </>
              ) : (
                t.activateConfirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
