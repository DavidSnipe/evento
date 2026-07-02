"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Circle,
  Heart,
  Loader2,
  Mic,
  Music,
  Plus,
  RectangleHorizontal,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { extractFloorPlanFromPhoto } from "@/app/(dashboard)/dashboard/events/[id]/seating/photo-plan-actions";
import { generateTemplateLayout } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import {
  saveSeatingSnapshot,
  upsertCurrentPlanSnapshot,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEmptyReviewElement,
  floorPlanElementsToTemplateElements,
  previewFootprintNormalized,
  resolveImportedElementPositions,
  getRoomObjectCollisionBboxWithMargin,
  reviewElementToExtracted,
  toReviewElements,
  type ReviewFloorPlanElement,
} from "@/lib/seating/floor-plan-import";
import { modalContentVariants } from "@/lib/nuntiki/variants";
import type { ExtractedFloorPlanElement } from "@/types/seating";
import { cn } from "@/lib/utils";

type ImportStep = "upload" | "processing" | "review";

type FloorPlanImportDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomWidthM: number;
  roomHeightM: number;
  hasExistingTables: boolean;
  onCaptureThumbnail?: () => Promise<string>;
  onApplied?: (result: {
    layoutName: string;
    previousPlanSaveFailed?: boolean;
    snapshotSaveFailed?: boolean;
    hadExistingTables?: boolean;
  }) => void;
};

function defaultImportLayoutName(): string {
  return `Import ${new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date())}`;
}

async function captureThumbnailWithTimeout(
  capture?: () => Promise<string>,
  timeoutMs = 2000
): Promise<string | undefined> {
  if (!capture) return undefined;
  try {
    return await Promise.race([
      capture(),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
  } catch {
    return undefined;
  }
}

const TABLE_SHAPES: ExtractedFloorPlanElement["shape"][] = [
  "round",
  "rectangular",
  "square",
  "long_banquet",
  "sweetheart",
];

const OBJECT_TYPES: NonNullable<ExtractedFloorPlanElement["objectType"]>[] = [
  "dance_floor",
  "dance_floor_round",
  "stage",
  "stage_semicircle",
  "dj_booth",
  "bar",
  "candy_bar",
  "photo_booth",
  "entrance",
  "sweet_table",
];

const PREVIEW_ROOM_OBJECT_COLORS: Record<string, { fill: string; stroke: string }> = {
  dance_floor: { fill: "#f0e6f0", stroke: "#8b5e8b" },
  dance_floor_round: { fill: "#f0e6f0", stroke: "#8b5e8b" },
  stage: { fill: "#d4c4b0", stroke: "#5a3e2b" },
  stage_semicircle: { fill: "#d4c4b0", stroke: "#5a3e2b" },
  dj_booth: { fill: "#c8d8e8", stroke: "#3a5a7a" },
  entrance: { fill: "#c8d8c0", stroke: "#4a6a3a" },
  bar: { fill: "#e8e0d0", stroke: "#6a5a4a" },
  candy_bar: { fill: "#e8e0d0", stroke: "#6a5a4a" },
  photo_booth: { fill: "#e8e0d0", stroke: "#6a5a4a" },
  sweet_table: { fill: "#e8e0d0", stroke: "#6a5a4a" },
};

const SWEETHEART_TABLE_COLORS = { fill: "#ffe0e0", stroke: "#c05050" };

function previewTableLabel(element: ReviewFloorPlanElement): string {
  if (element.tableNumber != null) return String(element.tableNumber);
  if (element.shape === "sweetheart") return "♥";
  const masaMatch = element.label.match(/^masa\s+(\d+)$/i);
  if (masaMatch) return masaMatch[1];
  return element.label.length > 8 ? `${element.label.slice(0, 6)}…` : element.label;
}

function ConfidenceOverlay({
  cx,
  cy,
  w,
  h,
  confidence,
  shape,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  confidence: ReviewFloorPlanElement["confidence"];
  shape: ReviewFloorPlanElement["shape"];
}) {
  if (confidence !== "low") return null;

  if (shape === "round") {
    const r = Math.max(w, h) / 2 + 0.6;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#eab308"
        strokeWidth="0.7"
        strokeDasharray="1.2 0.8"
      />
    );
  }

  return (
    <rect
      x={cx - w / 2 - 0.5}
      y={cy - h / 2 - 0.5}
      width={w + 1}
      height={h + 1}
      fill="none"
      stroke="#eab308"
      strokeWidth="0.7"
      strokeDasharray="1.2 0.8"
      rx="0.8"
    />
  );
}

function fileToImagePayload(file: File): Promise<{
  dataUrl: string;
  base64: string;
  mediaType: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Nu am putut citi fișierul „${file.name}".`));
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result;
      if (typeof dataUrl !== "string") {
        reject(new Error(`Fișierul „${file.name}" este invalid.`));
        return;
      }
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      resolve({
        dataUrl,
        base64: match?.[2] || dataUrl,
        mediaType: match?.[1] || file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
  });
}

function confidenceBadgeClass(confidence: ReviewFloorPlanElement["confidence"]): string {
  switch (confidence) {
    case "high":
      return "bg-[#E8F8EE] text-[#2F7A4F] border-[#C6F1D5]";
    case "medium":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "low":
      return "bg-red-50 text-red-700 border-red-200";
  }
}

function confidenceLabel(confidence: ReviewFloorPlanElement["confidence"]): string {
  switch (confidence) {
    case "high":
      return "Ridicată";
    case "medium":
      return "Medie";
    case "low":
      return "Scăzută";
  }
}

function ObjectIcon({ objectType }: { objectType?: string }) {
  switch (objectType) {
    case "stage":
    case "stage_semicircle":
      return <Mic className="h-3.5 w-3.5" />;
    case "dj_booth":
      return <Sliders className="h-3.5 w-3.5" />;
    case "dance_floor":
    case "dance_floor_round":
      return <Music className="h-3.5 w-3.5" />;
    default:
      return <RectangleHorizontal className="h-3.5 w-3.5" />;
  }
}

function RoomObjectPreviewShape({
  element,
  cx,
  cy,
  w,
  h,
  colors,
}: {
  element: ReviewFloorPlanElement;
  cx: number;
  cy: number;
  w: number;
  h: number;
  colors: { fill: string; stroke: string };
}) {
  const label =
    element.label.length > 14 ? `${element.label.slice(0, 12)}…` : element.label;

  if (element.objectType === "dance_floor_round") {
    const r = Math.max(w, h) / 2;
    return (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={colors.fill}
          fillOpacity={0.72}
          stroke={colors.stroke}
          strokeWidth="0.55"
        />
        <text
          x={cx}
          y={cy + 0.8}
          textAnchor="middle"
          fontSize="2.4"
          fill={colors.stroke}
          fontWeight="600"
        >
          {label}
        </text>
      </>
    );
  }

  if (element.objectType === "stage_semicircle") {
    const rx = w / 2;
    const ry = h / 2;
    const flatY = cy + ry;
    const path = `M ${cx - rx} ${flatY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${flatY} Z`;
    return (
      <>
        <path
          d={path}
          fill={colors.fill}
          fillOpacity={0.72}
          stroke={colors.stroke}
          strokeWidth="0.55"
        />
        <text
          x={cx}
          y={cy + ry * 0.35}
          textAnchor="middle"
          fontSize="2.4"
          fill={colors.stroke}
          fontWeight="600"
        >
          {label}
        </text>
      </>
    );
  }

  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={colors.fill}
        fillOpacity={0.72}
        stroke={colors.stroke}
        strokeWidth="0.55"
        rx="1.2"
      />
      <text
        x={cx}
        y={cy + 0.8}
        textAnchor="middle"
        fontSize="2.4"
        fill={colors.stroke}
        fontWeight="600"
      >
        {label}
      </text>
    </>
  );
}

function FloorPlanPreviewCanvas({
  elements,
  roomWidthM,
  roomHeightM,
}: {
  elements: ReviewFloorPlanElement[];
  roomWidthM: number;
  roomHeightM: number;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const roomOrigin = 4;
  const roomSize = 92;

  const roomObjects = useMemo(
    () => elements.filter((element) => element.elementType === "room_object"),
    [elements]
  );
  const tables = useMemo(
    () => elements.filter((element) => element.elementType === "table"),
    [elements]
  );

  const renderElement = (element: ReviewFloorPlanElement) => {
    const cx = element.posX_normalized * roomSize + roomOrigin;
    const cy = element.posY_normalized * roomSize + roomOrigin;
    const { width, height } = previewFootprintNormalized(element, roomWidthM, roomHeightM);
    const w = width * roomSize;
    const h = height * roomSize;

    if (element.elementType === "room_object") {
      const colors =
        PREVIEW_ROOM_OBJECT_COLORS[element.objectType ?? ""] ?? {
          fill: "#e8e0d0",
          stroke: "#6a5a4a",
        };
      return (
        <g key={element.id}>
          <RoomObjectPreviewShape
            element={element}
            cx={cx}
            cy={cy}
            w={w}
            h={h}
            colors={colors}
          />
          <ConfidenceOverlay
            cx={cx}
            cy={cy}
            w={w}
            h={h}
            confidence={element.confidence}
            shape={element.shape}
          />
        </g>
      );
    }

    const isSweetheart = element.shape === "sweetheart";
    const tableFill = isSweetheart ? SWEETHEART_TABLE_COLORS.fill : "#ffffff";
    const tableStroke = isSweetheart ? SWEETHEART_TABLE_COLORS.stroke : "#2d2a2e";

    if (element.shape === "round" && !isSweetheart) {
      const r = Math.max(w, h) / 2;
      return (
        <g key={element.id}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={tableFill}
            stroke={tableStroke}
            strokeWidth="0.55"
          />
          <text
            x={cx}
            y={cy + 0.9}
            textAnchor="middle"
            fontSize="2.8"
            fill="#1A0E14"
            fontWeight="700"
          >
            {previewTableLabel(element)}
          </text>
          <ConfidenceOverlay
            cx={cx}
            cy={cy}
            w={w}
            h={h}
            confidence={element.confidence}
            shape={element.shape}
          />
        </g>
      );
    }

    const x = cx - w / 2;
    const y = cy - h / 2;
    return (
      <g key={element.id}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={tableFill}
          stroke={tableStroke}
          strokeWidth="0.55"
          rx={isSweetheart ? "2.5" : "0.8"}
        />
        <text
          x={cx}
          y={cy + 0.8}
          textAnchor="middle"
          fontSize="2.4"
          fill={isSweetheart ? SWEETHEART_TABLE_COLORS.stroke : "#1A0E14"}
          fontWeight="700"
        >
          {isSweetheart ? "♥" : previewTableLabel(element)}
        </text>
        <ConfidenceOverlay
          cx={cx}
          cy={cy}
          w={w}
          h={h}
          confidence={element.confidence}
          shape={element.shape}
        />
      </g>
    );
  };

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[rgba(210,170,185,0.28)] bg-[#faf8f7]">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <rect
          x={roomOrigin}
          y={roomOrigin}
          width={roomSize}
          height={roomSize}
          fill="#fff"
          stroke="#dcb5be"
          strokeWidth="0.6"
          rx="1.5"
        />
        {roomObjects.map(renderElement)}
        {isDev
          ? roomObjects.map((element) => {
              const bbox = getRoomObjectCollisionBboxWithMargin(element, roomWidthM, roomHeightM);
              const x = bbox.left * roomSize + roomOrigin;
              const y = bbox.top * roomSize + roomOrigin;
              const w = (bbox.right - bbox.left) * roomSize;
              const h = (bbox.bottom - bbox.top) * roomSize;
              return (
                <rect
                  key={`collision-debug-${element.id}`}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="rgba(239,68,68,0.08)"
                  stroke="rgba(239,68,68,0.5)"
                  strokeWidth="0.45"
                  strokeDasharray="1.2 0.8"
                  pointerEvents="none"
                />
              );
            })
          : null}
        {tables.map(renderElement)}
      </svg>
    </div>
  );
}

export function FloorPlanImportDialog({
  eventId,
  open,
  onOpenChange,
  roomWidthM,
  roomHeightM,
  hasExistingTables,
  onCaptureThumbnail,
  onApplied,
}: FloorPlanImportDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elements, setElements] = useState<ReviewFloorPlanElement[]>([]);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showNamingForm, setShowNamingForm] = useState(false);
  const [layoutName, setLayoutName] = useState(defaultImportLayoutName);
  const [applyWarning, setApplyWarning] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [positionCorrectionCount, setPositionCorrectionCount] = useState(0);

  const resetState = useCallback(() => {
    setStep("upload");
    setImagePreview(null);
    setSelectedFile(null);
    setError(null);
    setElements([]);
    setShowReplaceConfirm(false);
    setShowNamingForm(false);
    setLayoutName(defaultImportLayoutName());
    setApplyWarning(null);
    setApplying(false);
    setPositionCorrectionCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const summary = useMemo(() => {
    const tables = elements.filter((e) => e.elementType === "table").length;
    const objects = elements.filter((e) => e.elementType === "room_object").length;
    const low = elements.filter((e) => e.confidence === "low").length;
    return { tables, objects, low, total: elements.length };
  }, [elements]);

  const handleFileSelect = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setSelectedFile(file);
    try {
      const payload = await fileToImagePayload(file);
      setImagePreview(payload.dataUrl);
    } catch (err) {
      setSelectedFile(null);
      setImagePreview(null);
      setError(err instanceof Error ? err.message : "Nu am putut încărca imaginea.");
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setError(null);
    setStep("processing");
    try {
      const payload = await fileToImagePayload(selectedFile);
      const result = await extractFloorPlanFromPhoto(eventId, payload.base64, payload.mediaType);
      if (result.error || !result.elements?.length) {
        setError(result.error ?? "Nu s-au detectat elemente. Încearcă o altă fotografie.");
        setStep("upload");
        return;
      }
      const { elements: correctedElements, correctedCount } = resolveImportedElementPositions(
        result.elements,
        roomWidthM,
        roomHeightM
      );
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[floor-plan-import] elements:",
          correctedElements.length,
          "corrected:",
          correctedCount
        );
      }
      setPositionCorrectionCount(correctedCount);
      setElements(toReviewElements(correctedElements));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "A apărut o eroare la analiză.");
      setStep("upload");
    }
  };

  const openNamingStep = () => {
    setLayoutName(defaultImportLayoutName());
    setApplyWarning(null);
    setShowNamingForm(true);
  };

  const applyToCanvas = async (nameOverride?: string) => {
    if (elements.length === 0) return;

    const trimmedName = (nameOverride ?? layoutName).trim() || defaultImportLayoutName();
    setApplying(true);
    setApplyWarning(null);

    let previousPlanSaveFailed = false;
    let snapshotSaveFailed = false;

    try {
      if (hasExistingTables) {
        const thumbnail = await captureThumbnailWithTimeout(onCaptureThumbnail, 2000);
        const saveCurrentResult = await upsertCurrentPlanSnapshot(eventId, thumbnail);
        if (saveCurrentResult.error) {
          previousPlanSaveFailed = true;
          setApplyWarning(
            "Planul anterior nu a putut fi salvat automat. Importul va continua."
          );
        }
      }

      const extracted = elements.map(reviewElementToExtracted);
      const templateElements = floorPlanElementsToTemplateElements(
        extracted,
        roomWidthM,
        roomHeightM
      );
      const layoutResult = await generateTemplateLayout(eventId, templateElements);
      if (layoutResult.error) {
        alert(layoutResult.error);
        return;
      }

      const snapshotResult = await saveSeatingSnapshot(eventId, trimmedName);
      if (snapshotResult.error) {
        snapshotSaveFailed = true;
      }

      onApplied?.({
        layoutName: trimmedName,
        previousPlanSaveFailed,
        snapshotSaveFailed,
        hadExistingTables: hasExistingTables,
      });
      router.refresh();
      onOpenChange(false);
    } finally {
      setApplying(false);
      setShowReplaceConfirm(false);
      setShowNamingForm(false);
    }
  };

  const handleApplyClick = () => {
    if (hasExistingTables) {
      setShowReplaceConfirm(true);
      return;
    }
    openNamingStep();
  };

  const updateElement = (id: string, patch: Partial<ReviewFloorPlanElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  };

  const selectClassName =
    "h-8 w-full rounded-lg border border-[rgba(210,170,185,0.28)] bg-white px-2 text-xs text-[#1A0E14]";

  return (
    <>
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            modalContentVariants(),
            "flex max-h-[92vh] w-[min(960px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
          )}
        >
          <DialogHeader className="border-b border-[rgba(210,170,185,0.18)] px-6 py-5">
            <DialogTitle className="font-serif text-xl text-[#1A0E14]">
              {step === "review"
                ? `Plan detectat — ${summary.total} elemente`
                : "Import plan din poză"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8A7080]">
              {step === "upload"
                ? "Încarcă o fotografie a planului sălii — desenat de mână sau tipărit."
                : step === "processing"
                  ? "Se analizează planul sălii cu AI..."
                  : "Verifică și corectează elementele detectate înainte de a aplica pe canvas."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === "upload" ? (
              <div className="space-y-4">
                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                ) : null}

                {!imagePreview ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void handleFileSelect(e.dataTransfer.files[0] ?? null);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[rgba(210,170,185,0.45)] bg-[#faf8f7]/80 px-6 py-14 text-center transition-colors hover:border-[#B8516B]/45 hover:bg-[#FEF0F3]/40"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleFileSelect(e.target.files?.[0] ?? null)}
                    />
                    <Upload className="mb-3 h-10 w-10 text-[#C4A8B4]" />
                    <p className="text-sm font-semibold text-[#1A0E14]">
                      Trage imaginea aici sau click pentru a selecta
                    </p>
                    <p className="mt-1 text-xs text-[#8A7080]">JPG, PNG sau WEBP</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-[rgba(210,170,185,0.28)] bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Previzualizare plan"
                        className="mx-auto max-h-72 w-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Alege altă imagine
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleFileSelect(e.target.files?.[0] ?? null)}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {step === "processing" && imagePreview ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative max-h-64 overflow-hidden rounded-2xl border border-[rgba(210,170,185,0.28)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Plan în analiză"
                    className="max-h-64 w-full object-contain opacity-70"
                  />
                  <div className="absolute inset-x-0 h-1 animate-[scan_2.2s_ease-in-out_infinite] bg-[#B8516B] shadow-[0_0_15px_#B8516B]" />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-[#5A4550]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#B8516B]" />
                  Se analizează planul sălii cu AI...
                </div>
              </div>
            ) : null}

            {step === "review" ? (
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <FloorPlanPreviewCanvas
                  elements={elements}
                  roomWidthM={roomWidthM}
                  roomHeightM={roomHeightM}
                />

                <div className="flex min-h-0 flex-col gap-3">
                  {summary.total > 0 && summary.low === summary.total ? (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-900">
                      Toate elementele detectate au încredere scăzută. Verifică pozițiile și
                      denumirile înainte de a aplica planul pe canvas.
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-[rgba(210,170,185,0.22)] bg-[#faf8f7] px-3 py-2.5 text-xs text-[#5A4550]">
                    {summary.tables} mese, {summary.objects} obiecte detectate.
                    {summary.low > 0 ? ` ${summary.low} necesită verificare.` : ""}
                    {positionCorrectionCount > 0
                      ? ` ${positionCorrectionCount} ${
                          positionCorrectionCount === 1 ? "masă repoziționată" : "mese repoziționate"
                        } automat în afara obiectelor sălii.`
                      : ""}
                  </div>

                  <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                    {elements.map((element) => (
                      <div
                        key={element.id}
                        className="rounded-xl border border-[rgba(210,170,185,0.22)] bg-white p-3"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {element.elementType === "table" ? (
                              element.shape === "round" ? (
                                <Circle className="h-4 w-4 text-[#B8516B]" />
                              ) : element.shape === "sweetheart" ? (
                                <Heart className="h-4 w-4 text-[#B8516B]" />
                              ) : (
                                <RectangleHorizontal className="h-4 w-4 text-[#B8516B]" />
                              )
                            ) : (
                              <span className="text-[#B8516B]">
                                <ObjectIcon objectType={element.objectType} />
                              </span>
                            )}
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                confidenceBadgeClass(element.confidence)
                              )}
                            >
                              {confidenceLabel(element.confidence)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setElements((prev) => prev.filter((el) => el.id !== element.id))
                            }
                            className="rounded-lg p-1 text-[#8A7080] hover:bg-red-50 hover:text-red-600"
                            title="Elimină element"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <Label className="text-[10px] uppercase tracking-wide text-[#8A7080]">
                              Nume / număr
                            </Label>
                            <Input
                              value={element.label}
                              onChange={(e) =>
                                updateElement(element.id, { label: e.target.value })
                              }
                              className="mt-1 h-8 rounded-lg text-xs"
                            />
                          </div>

                          {element.elementType === "table" ? (
                            <div>
                              <Label className="text-[10px] uppercase tracking-wide text-[#8A7080]">
                                Capacitate
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={50}
                                value={element.capacity ?? 8}
                                onChange={(e) =>
                                  updateElement(element.id, {
                                    capacity: Math.max(1, parseInt(e.target.value, 10) || 8),
                                  })
                                }
                                className="mt-1 h-8 w-20 rounded-lg text-xs"
                              />
                            </div>
                          ) : null}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] uppercase tracking-wide text-[#8A7080]">
                                Tip
                              </Label>
                              <select
                                value={element.elementType}
                                onChange={(e) =>
                                  updateElement(element.id, {
                                    elementType: e.target.value as ReviewFloorPlanElement["elementType"],
                                  })
                                }
                                className={cn(selectClassName, "mt-1")}
                              >
                                <option value="table">Masă</option>
                                <option value="room_object">Obiect sală</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase tracking-wide text-[#8A7080]">
                                Formă
                              </Label>
                              <select
                                value={element.shape}
                                onChange={(e) =>
                                  updateElement(element.id, {
                                    shape: e.target.value as ReviewFloorPlanElement["shape"],
                                  })
                                }
                                className={cn(selectClassName, "mt-1")}
                              >
                                {TABLE_SHAPES.map((shape) => (
                                  <option key={shape} value={shape}>
                                    {shape}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {element.elementType === "room_object" ? (
                            <div>
                              <Label className="text-[10px] uppercase tracking-wide text-[#8A7080]">
                                Obiect
                              </Label>
                              <select
                                value={element.objectType ?? "dance_floor"}
                                onChange={(e) =>
                                  updateElement(element.id, {
                                    objectType: e.target
                                      .value as ReviewFloorPlanElement["objectType"],
                                  })
                                }
                                className={cn(selectClassName, "mt-1")}
                              >
                                {OBJECT_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={() => setElements((prev) => [...prev, createEmptyReviewElement()])}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adaugă element manual
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-[rgba(210,170,185,0.18)] px-6 py-4 flex-col items-stretch gap-3 sm:flex-col sm:justify-start">
            {step === "upload" ? (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Anulează
                </Button>
                <Button
                  type="button"
                  disabled={!selectedFile}
                  className="rounded-xl bg-[#B8516B] text-white hover:bg-[#9A4560]"
                  onClick={() => void handleAnalyze()}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Analizează cu AI
                </Button>
              </>
            ) : null}

            {step === "processing" ? (
              <Button type="button" disabled className="rounded-xl">
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Se procesează...
              </Button>
            ) : null}

            {step === "review" ? (
              <>
                {applyWarning ? (
                  <div className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
                    {applyWarning}
                  </div>
                ) : null}

                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    showNamingForm ? "mb-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className={cn(
                        "space-y-2.5 rounded-xl border border-[rgba(210,170,185,0.25)] bg-white/90 p-3",
                        showNamingForm && "animate-in slide-in-from-top-2 fade-in duration-200"
                      )}
                    >
                      <div>
                        <Label
                          htmlFor="floor-plan-import-layout-name"
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#C4A8B4]"
                        >
                          Nume layout importat
                        </Label>
                        <Input
                          id="floor-plan-import-layout-name"
                          value={layoutName}
                          maxLength={50}
                          disabled={applying}
                          placeholder="ex: Plan sală venue, Schița noastră"
                          className="h-9 rounded-lg border-[rgba(210,170,185,0.35)] text-sm"
                          onChange={(e) => setLayoutName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void applyToCanvas();
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={applying}
                          className="text-xs font-medium text-[#8A7080] underline-offset-2 hover:text-[#B8516B] hover:underline disabled:opacity-50"
                          onClick={() => void applyToCanvas(defaultImportLayoutName())}
                        >
                          Sari peste
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={applying}
                          className="h-8 rounded-lg bg-[#B8516B] px-4 text-xs font-semibold text-white hover:bg-[#9A4560]"
                          onClick={() => void applyToCanvas()}
                        >
                          {applying ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Se aplică...
                            </>
                          ) : (
                            "Salvează și aplică"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {!showNamingForm ? (
                  <div className="flex w-full justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep("upload");
                        setElements([]);
                      }}
                    >
                      Înapoi
                    </Button>
                    <Button
                      type="button"
                      disabled={applying || elements.length === 0}
                      className="rounded-xl bg-[#B8516B] text-white hover:bg-[#9A4560]"
                      onClick={handleApplyClick}
                    >
                      Aplică pe canvas
                    </Button>
                  </div>
                ) : (
                  <div className="flex w-full justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={applying}
                      onClick={() => setShowNamingForm(false)}
                    >
                      Înapoi
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <AlertDialogContent className={modalContentVariants()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Înlocuiești planul curent?</AlertDialogTitle>
            <AlertDialogDescription>
              Planul curent va fi înlocuit. Invitații asignați vor fi neasignați. Continuați?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#B8516B] hover:bg-[#9A4560]"
              onClick={(event) => {
                event.preventDefault();
                setShowReplaceConfirm(false);
                openNamingStep();
              }}
            >
              Înlocuiește planul
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
