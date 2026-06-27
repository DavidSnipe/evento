"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Loader2,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { fetchSeatingExportSnapshotAction } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import {
  buildGuestListPdfBlob,
  downloadGuestListExport,
  type GuestListExportFormat,
} from "@/components/seating/export/download-guest-list-pdf";
import { rasterizeGuestListPreview } from "@/components/seating/export/guest-list-preview-raster";
import {
  downloadFloorPlanFromDataUrl,
  type FloorPlanExportFormat,
} from "@/components/seating/export/export-floor-plan";
import { GuestListPreviewViewport } from "@/components/seating/export/guest-list-preview-viewport";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { modalContentVariants } from "@/lib/nuntiki/variants";
import { preloadPdfFonts } from "@/components/seating/export/pdf-fonts";
import type {
  GuestListPdfOrientation,
  GuestListPdfSortMode,
  SeatingExportSnapshot,
} from "@/lib/seating/export-snapshot-types";
import { cn } from "@/lib/utils";

export type SeatingExportTab = "guestList" | "floorPlan";
export type SeatingExportFormat = GuestListExportFormat | FloorPlanExportFormat;

type GuestListExportDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSortMode: GuestListPdfSortMode;
  initialTab?: SeatingExportTab;
  onSnapshotLoaded?: (snapshot: SeatingExportSnapshot) => void;
  onExportFloorPlan: (format: FloorPlanExportFormat) => Promise<void>;
  onCaptureFloorPlanPreview: () => Promise<string>;
};

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  ariaLabel?: string;
};

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Label className="shrink-0 text-xs text-muted-foreground">{label}</Label>
      <div
        className="inline-flex rounded-xl border border-border-rose-18 p-0.5"
        style={{ background: "rgba(245, 240, 243, 0.72)" }}
      >
        {options.map((option) => {
          const active = value === option.value;
          const Icon = option.icon;
          const accessibleLabel = option.ariaLabel ?? option.label;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              title={Icon ? accessibleLabel : undefined}
              aria-label={Icon ? accessibleLabel : undefined}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-[9px] text-xs font-medium leading-none transition-all duration-150",
                Icon ? "px-2.5" : "px-3.5",
                active
                  ? "bg-white text-[#B8516B] shadow-[0_1px_6px_rgba(180,100,120,0.14)]"
                  : "text-text-secondary hover:text-[#B8516B]"
              )}
            >
              {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabSwitcher({
  value,
  onChange,
}: {
  value: SeatingExportTab;
  onChange: (tab: SeatingExportTab) => void;
}) {
  const tabs: { value: SeatingExportTab; label: string }[] = [
    { value: "guestList", label: "Listă invitați" },
    { value: "floorPlan", label: "Plan sală" },
  ];

  return (
    <div
      className="inline-flex rounded-xl border border-border-rose-18 p-0.5"
      style={{ background: "rgba(245, 240, 243, 0.72)" }}
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "rounded-[9px] px-4 py-2 text-sm font-medium transition-all duration-150",
              active
                ? "bg-white text-[#B8516B] shadow-[0_1px_6px_rgba(180,100,120,0.14)]"
                : "text-text-secondary hover:text-[#B8516B]"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

type GuestListPreviewState = {
  imageUrl: string;
  logicalWidth: number;
  logicalHeight: number;
};

export function GuestListExportDialog({
  eventId,
  open,
  onOpenChange,
  initialSortMode,
  initialTab = "guestList",
  onSnapshotLoaded,
  onExportFloorPlan,
  onCaptureFloorPlanPreview,
}: GuestListExportDialogProps) {
  const [activeTab, setActiveTab] = useState<SeatingExportTab>(initialTab);
  const [format, setFormat] = useState<SeatingExportFormat>("pdf");
  const [sortMode, setSortMode] = useState<GuestListPdfSortMode>(initialSortMode);
  const [orientation, setOrientation] = useState<GuestListPdfOrientation>("landscape");
  const [snapshot, setSnapshot] = useState<SeatingExportSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [guestListPreview, setGuestListPreview] = useState<GuestListPreviewState | null>(null);
  const [guestListPreviewLoading, setGuestListPreviewLoading] = useState(false);
  const [guestListPreviewError, setGuestListPreviewError] = useState<string | null>(null);
  const guestListPreviewRequestIdRef = useRef(0);
  const guestListPreviewUrlRef = useRef<string | null>(null);
  const [floorPlanPreview, setFloorPlanPreview] = useState<string | null>(null);
  const [floorPlanPreviewLoading, setFloorPlanPreviewLoading] = useState(false);
  const [floorPlanPreviewError, setFloorPlanPreviewError] = useState<string | null>(null);
  const floorPlanPreviewUrlRef = useRef<string | null>(null);

  const revokeGuestListPreviewUrl = useCallback(() => {
    if (guestListPreviewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(guestListPreviewUrlRef.current);
    }
    guestListPreviewUrlRef.current = null;
  }, []);

  const revokeFloorPlanPreviewUrl = useCallback(() => {
    if (floorPlanPreviewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(floorPlanPreviewUrlRef.current);
    }
    floorPlanPreviewUrlRef.current = null;
  }, []);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchSeatingExportSnapshotAction(eventId);
      if (!data) {
        setLoadError("Nu s-au putut încărca datele pentru export.");
        setSnapshot(null);
        return;
      }
      setSnapshot(data);
      onSnapshotLoaded?.(data);
      await preloadPdfFonts();
    } catch (error) {
      console.error("Guest list export snapshot load failed:", error);
      setLoadError("Nu s-au putut încărca datele pentru export.");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, onSnapshotLoaded]);

  const loadFloorPlanPreview = useCallback(async () => {
    setFloorPlanPreviewLoading(true);
    setFloorPlanPreviewError(null);
    revokeFloorPlanPreviewUrl();
    setFloorPlanPreview(null);

    try {
      // Let the dialog finish opening and the canvas settle (pan/zoom transforms).
      await new Promise((resolve) => setTimeout(resolve, 120));
      const dataUrl = await onCaptureFloorPlanPreview();

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      floorPlanPreviewUrlRef.current = objectUrl;
      setFloorPlanPreview(objectUrl);
    } catch (error) {
      console.error("Floor plan preview failed:", error);
      setFloorPlanPreview(null);
      setFloorPlanPreviewError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut genera previzualizarea planului."
      );
    } finally {
      setFloorPlanPreviewLoading(false);
    }
  }, [onCaptureFloorPlanPreview, revokeFloorPlanPreviewUrl]);

  const handleGuestListPreviewImageError = useCallback(() => {
    setGuestListPreviewError("Previzualizarea nu s-a putut afișa.");
    revokeGuestListPreviewUrl();
    setGuestListPreview(null);
  }, [revokeGuestListPreviewUrl]);

  const loadGuestListPreview = useCallback(async () => {
    if (!snapshot) return;

    const requestId = guestListPreviewRequestIdRef.current + 1;
    guestListPreviewRequestIdRef.current = requestId;
    const isStale = () => requestId !== guestListPreviewRequestIdRef.current;

    setGuestListPreviewLoading(true);
    setGuestListPreviewError(null);

    try {
      const pdfBlob = await buildGuestListPdfBlob(snapshot, sortMode, orientation);
      if (isStale()) return;

      const raster = await rasterizeGuestListPreview(pdfBlob, isStale);
      if (!raster || isStale()) return;

      revokeGuestListPreviewUrl();
      guestListPreviewUrlRef.current = raster.imageUrl;
      setGuestListPreview({
        imageUrl: raster.imageUrl,
        logicalWidth: raster.logicalWidth,
        logicalHeight: raster.logicalHeight,
      });
    } catch (error) {
      if (isStale()) return;

      console.error("Guest list preview failed:", error);
      setGuestListPreviewError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut genera previzualizarea listei."
      );
    } finally {
      if (!isStale()) {
        setGuestListPreviewLoading(false);
      }
    }
  }, [snapshot, sortMode, orientation, revokeGuestListPreviewUrl]);

  useEffect(() => {
    if (!open) return;

    guestListPreviewRequestIdRef.current += 1;
    setActiveTab(initialTab);
    setFormat("pdf");
    setSortMode(initialSortMode);
    setOrientation("landscape");
    setSnapshot(null);
    revokeGuestListPreviewUrl();
    setGuestListPreview(null);
    setGuestListPreviewError(null);
    revokeFloorPlanPreviewUrl();
    setFloorPlanPreview(null);
    setFloorPlanPreviewError(null);

    void loadSnapshot();
  }, [open, initialTab, initialSortMode, loadSnapshot, revokeFloorPlanPreviewUrl, revokeGuestListPreviewUrl]);

  useEffect(() => {
    if (!open || activeTab !== "guestList" || loading || !snapshot) return;

    const timer = window.setTimeout(() => {
      void loadGuestListPreview();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    open,
    activeTab,
    loading,
    snapshot,
    sortMode,
    orientation,
    loadGuestListPreview,
  ]);

  useEffect(() => {
    if (!open || activeTab !== "floorPlan") return;
    if (floorPlanPreviewLoading) return;

    const shouldLoad = !floorPlanPreview && !floorPlanPreviewError;
    if (!shouldLoad) return;

    const timer = window.setTimeout(() => {
      void loadFloorPlanPreview();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [
    open,
    activeTab,
    floorPlanPreview,
    floorPlanPreviewError,
    floorPlanPreviewLoading,
    loadFloorPlanPreview,
  ]);

  useEffect(() => {
    if (open) return;
    revokeGuestListPreviewUrl();
    setGuestListPreview(null);
    revokeFloorPlanPreviewUrl();
    setFloorPlanPreview(null);
  }, [open, revokeFloorPlanPreviewUrl, revokeGuestListPreviewUrl]);

  async function handleExport() {
    setExporting(true);
    try {
      if (activeTab === "guestList") {
        if (!snapshot) return;
        await downloadGuestListExport(
          snapshot,
          sortMode,
          orientation,
          format as GuestListExportFormat
        );
      } else {
        if (floorPlanPreview) {
          await downloadFloorPlanFromDataUrl(
            floorPlanPreview,
            format as FloorPlanExportFormat
          );
        } else {
          await onExportFloorPlan(format as FloorPlanExportFormat);
        }
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Exportul a eșuat.");
    } finally {
      setExporting(false);
    }
  }

  const guestListCanExport = Boolean(snapshot && !loading);
  const canExport =
    activeTab === "guestList"
      ? guestListCanExport && !guestListPreviewLoading
      : !floorPlanPreviewLoading;

  const exportLabel =
    format === "pdf" ? "Exportă PDF" : "Exportă PNG";

  const description =
    activeTab === "guestList"
      ? "Previzualizează lista înainte de export. Modificările se reflectă instant în preview."
      : "Previzualizează planul sălii și exportă în formatul ales.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          modalContentVariants(),
          "flex h-[92vh] max-h-[92vh] w-[min(96vw,1200px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden rounded-[22px] border-border-rose-18 bg-dash-ivory p-0 shadow-popover sm:max-w-[min(96vw,1200px)]"
        )}
      >
        <DialogHeader className="shrink-0 space-y-4 border-b border-border-rose-18/60 px-6 py-5 text-left">
          <div className="space-y-2">
            <DialogTitle
              className="text-lg font-semibold leading-none tracking-[-0.022em] text-[var(--dash-text)]"
              style={{ fontFamily: "var(--font-inter, Inter, ui-sans-serif, system-ui, sans-serif)" }}
            >
              Export
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <TabSwitcher
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              if (tab === "floorPlan") {
                revokeFloorPlanPreviewUrl();
                setFloorPlanPreview(null);
                setFloorPlanPreviewError(null);
              }
            }}
          />
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-4 border-b border-border-rose-18/40 bg-white/50 px-6 py-4 backdrop-blur-sm">
          <SegmentedControl
            label="Format"
            value={format}
            options={[
              { value: "pdf", label: "PDF" },
              { value: "png", label: "PNG" },
            ]}
            onChange={setFormat}
          />
          {activeTab === "guestList" ? (
            <>
              <SegmentedControl
                label="Sortare"
                value={sortMode}
                options={[
                  { value: "alphabetical", label: "Alfabetic" },
                  { value: "byTable", label: "Pe mese" },
                ]}
                onChange={setSortMode}
              />
              <SegmentedControl
                label="Orientare"
                value={orientation}
                options={[
                  {
                    value: "landscape",
                    label: "Landscape",
                    icon: RectangleHorizontal,
                    ariaLabel: "Landscape",
                  },
                  {
                    value: "portrait",
                    label: "Portrait",
                    icon: RectangleVertical,
                    ariaLabel: "Portrait",
                  },
                ]}
                onChange={setOrientation}
              />
            </>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          {activeTab === "guestList" ? (
            loading ? (
              <div className="flex h-full min-h-[320px] flex-1 items-center justify-center gap-2 text-sm text-text-secondary">
                <Loader2 className="size-4 animate-spin text-[#B8516B]" />
                Se încarcă datele…
              </div>
            ) : loadError ? (
              <div className="flex h-full min-h-[320px] flex-1 flex-col items-center justify-center gap-3 text-sm text-text-secondary">
                <p>{loadError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadSnapshot()}>
                  Reîncearcă
                </Button>
              </div>
            ) : guestListPreview ? (
              <GuestListPreviewViewport
                imageUrl={guestListPreview.imageUrl}
                pageWidth={guestListPreview.logicalWidth}
                pageHeight={guestListPreview.logicalHeight}
                isUpdating={guestListPreviewLoading}
                onImageError={handleGuestListPreviewImageError}
              />
            ) : guestListPreviewLoading ? (
              <div className="flex h-full min-h-[320px] flex-1 items-center justify-center gap-2 text-sm text-text-secondary">
                <Loader2 className="size-4 animate-spin text-[#B8516B]" />
                Se generează previzualizarea…
              </div>
            ) : guestListPreviewError ? (
              <div className="flex h-full min-h-[320px] flex-1 flex-col items-center justify-center gap-3 text-sm text-text-secondary">
                <p>{guestListPreviewError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadGuestListPreview()}>
                  Reîncearcă
                </Button>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] flex-1 flex-col items-center justify-center gap-3 text-sm text-text-secondary">
                <p>Previzualizarea listei nu este disponibilă.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadGuestListPreview()}>
                  Generează preview
                </Button>
              </div>
            )
          ) : floorPlanPreviewLoading ? (
            <div className="flex h-full min-h-[320px] flex-1 items-center justify-center gap-2 text-sm text-text-secondary">
              <Loader2 className="size-4 animate-spin text-[#B8516B]" />
              Se generează previzualizarea planului…
            </div>
          ) : floorPlanPreviewError ? (
            <div className="flex h-full min-h-[320px] flex-1 flex-col items-center justify-center gap-3 text-sm text-text-secondary">
              <p>{floorPlanPreviewError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadFloorPlanPreview()}>
                Reîncearcă
              </Button>
            </div>
          ) : floorPlanPreview ? (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-border-rose-18/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-3 top-3 z-10 h-8 gap-1.5 bg-white/90 text-xs"
                onClick={() => void loadFloorPlanPreview()}
                disabled={floorPlanPreviewLoading}
              >
                <RefreshCw className="size-3.5" />
                Reîmprospătează
              </Button>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#f5f4f3] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={floorPlanPreview}
                  alt="Previzualizare plan sală"
                  className="max-h-full max-w-full rounded-lg shadow-sm object-contain"
                  onError={() => {
                    console.error("Floor plan preview image failed to load");
                    setFloorPlanPreviewError("Previzualizarea nu s-a putut afișa.");
                    revokeFloorPlanPreviewUrl();
                    setFloorPlanPreview(null);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-1 flex-col items-center justify-center gap-3 text-sm text-text-secondary">
              <p>Previzualizarea planului nu este disponibilă.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadFloorPlanPreview()}>
                Generează preview
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border-rose-18/60 bg-white/60 px-6 py-4 backdrop-blur-sm sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={!canExport || exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Se exportă…
              </>
            ) : (
              <>
                <Download className="size-4" />
                {exportLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
