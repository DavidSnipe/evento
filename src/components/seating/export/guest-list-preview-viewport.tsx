"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Move, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clampImagePan,
  clampImageScale,
  computeImageFitScale,
  IMAGE_PAN_ZOOM_BUTTON_FACTOR,
  IMAGE_PAN_ZOOM_MAX_SCALE,
  IMAGE_PAN_ZOOM_WHEEL_FACTOR,
  zoomImagePanAtPoint,
} from "@/lib/seating/image-pan-zoom";
import { cn } from "@/lib/utils";

type GuestListPreviewViewportProps = {
  imageUrl: string;
  pageWidth: number;
  pageHeight: number;
  isUpdating?: boolean;
  onImageError?: () => void;
};

type ViewportSize = { width: number; height: number };

function readViewportSize(element: HTMLDivElement | null): ViewportSize {
  if (!element) return { width: 0, height: 0 };
  return { width: element.clientWidth, height: element.clientHeight };
}

export function GuestListPreviewViewport({
  imageUrl,
  pageWidth,
  pageHeight,
  isUpdating = false,
  onImageError,
}: GuestListPreviewViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const scaleRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const panStartRef = useRef({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);

  const fitScale = computeImageFitScale(
    viewportSize.width,
    viewportSize.height,
    pageWidth,
    pageHeight
  );

  const applyCamera = useCallback(
    (nextScale: number, nextPanX: number, nextPanY: number) => {
      if (pageWidth <= 0 || pageHeight <= 0) return;

      const container = readViewportSize(viewportRef.current);
      const clampedScale = clampImageScale(nextScale, fitScale, IMAGE_PAN_ZOOM_MAX_SCALE);
      const clampedPan = clampImagePan(
        nextPanX,
        nextPanY,
        clampedScale,
        container.width,
        container.height,
        pageWidth,
        pageHeight
      );

      scaleRef.current = clampedScale;
      panXRef.current = clampedPan.panX;
      panYRef.current = clampedPan.panY;
      setScale(clampedScale);
      setPanX(clampedPan.panX);
      setPanY(clampedPan.panY);
    },
    [fitScale, pageHeight, pageWidth]
  );

  const fitToView = useCallback(() => {
    const container = readViewportSize(viewportRef.current);
    const nextFitScale = computeImageFitScale(
      container.width,
      container.height,
      pageWidth,
      pageHeight
    );
    if (nextFitScale <= 0) return;

    const clampedPan = clampImagePan(
      0,
      0,
      nextFitScale,
      container.width,
      container.height,
      pageWidth,
      pageHeight
    );
    scaleRef.current = nextFitScale;
    panXRef.current = clampedPan.panX;
    panYRef.current = clampedPan.panY;
    setScale(nextFitScale);
    setPanX(clampedPan.panX);
    setPanY(clampedPan.panY);
  }, [pageHeight, pageWidth]);

  const resetToHundredPercent = useCallback(() => {
    const container = readViewportSize(viewportRef.current);
    const clampedPan = clampImagePan(
      0,
      0,
      1,
      container.width,
      container.height,
      pageWidth,
      pageHeight
    );
    scaleRef.current = 1;
    panXRef.current = clampedPan.panX;
    panYRef.current = clampedPan.panY;
    setScale(1);
    setPanX(clampedPan.panX);
    setPanY(clampedPan.panY);
  }, [pageHeight, pageWidth]);

  const zoomAtViewportCenter = useCallback(
    (direction: "in" | "out") => {
      const container = readViewportSize(viewportRef.current);
      if (container.width <= 0 || container.height <= 0) return;

      const anchorX = container.width / 2;
      const anchorY = container.height / 2;
      const currentScale = scaleRef.current;
      const factor =
        direction === "in" ? IMAGE_PAN_ZOOM_BUTTON_FACTOR : 1 / IMAGE_PAN_ZOOM_BUTTON_FACTOR;
      const unclampedScale = currentScale * factor;
      const nextScale = clampImageScale(unclampedScale, fitScale, IMAGE_PAN_ZOOM_MAX_SCALE);
      const zoomedPan = zoomImagePanAtPoint(
        currentScale,
        panXRef.current,
        panYRef.current,
        nextScale,
        anchorX,
        anchorY
      );
      applyCamera(nextScale, zoomedPan.panX, zoomedPan.panY);
    },
    [applyCamera, fitScale]
  );

  useEffect(() => {
    fitToView();
  }, [fitToView, imageUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportSize = () => {
      const next = readViewportSize(viewport);
      setViewportSize(next);
      applyCamera(scaleRef.current, panXRef.current, panYRef.current);
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    window.addEventListener("resize", updateViewportSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [applyCamera]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "BUTTON"
      ) {
        event.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || pageWidth <= 0) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;

      const zoomIntensity = Math.min(Math.max(Math.abs(event.deltaY) / 120, 0.05), 1.2);
      const factor = Math.pow(
        IMAGE_PAN_ZOOM_WHEEL_FACTOR,
        event.deltaY < 0 ? zoomIntensity : -zoomIntensity
      );

      const currentScale = scaleRef.current;
      const nextScale = clampImageScale(
        currentScale * factor,
        fitScale,
        IMAGE_PAN_ZOOM_MAX_SCALE
      );
      const zoomedPan = zoomImagePanAtPoint(
        currentScale,
        panXRef.current,
        panYRef.current,
        nextScale,
        anchorX,
        anchorY
      );
      applyCamera(nextScale, zoomedPan.panX, zoomedPan.panY);
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [applyCamera, fitScale, pageWidth]);

  const isHudTarget = (target: HTMLElement) => !!target.closest("[data-pan-zoom-hud]");

  const beginPan = (clientX: number, clientY: number, pointerId: number) => {
    isPanningRef.current = true;
    activePointerIdRef.current = pointerId;
    setIsPanning(true);
    panStartRef.current = {
      x: clientX - panXRef.current,
      y: clientY - panYRef.current,
    };
  };

  const movePan = (clientX: number, clientY: number) => {
    const rawX = clientX - panStartRef.current.x;
    const rawY = clientY - panStartRef.current.y;
    applyCamera(scaleRef.current, rawX, rawY);
  };

  const endPan = () => {
    isPanningRef.current = false;
    activePointerIdRef.current = null;
    setIsPanning(false);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (isHudTarget(event.target as HTMLElement)) return;

    const forcePan = isSpacePressedRef.current || event.button === 1;
    if (!forcePan && (event.target as HTMLElement).tagName === "BUTTON") return;

    event.preventDefault();
    beginPan(event.clientX, event.clientY, event.pointerId);
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    movePan(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    try {
      viewportRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // ignored
    }
    endPan();
  };

  const scaledW = pageWidth * scale;
  const scaledH = pageHeight * scale;
  const canPan =
    isSpacePressed ||
    scaledW > viewportSize.width + 0.5 ||
    scaledH > viewportSize.height + 0.5;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-border-rose-18/50">
      {isUpdating ? (
        <div className="absolute right-3 top-3 z-10 flex h-8 items-center gap-1.5 rounded-md border border-border-rose-18/50 bg-white/90 px-2.5 text-xs text-text-secondary">
          <Loader2 className="size-3.5 animate-spin text-[#B8516B]" />
          Se actualizează…
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden bg-[#f5f4f3]",
          isPanning ? "cursor-grabbing" : canPan ? "cursor-grab" : "cursor-default"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Previzualizare listă invitați"
          draggable={false}
          onError={onImageError}
          className="pointer-events-none absolute left-0 top-0 max-w-none select-none rounded-lg bg-white shadow-sm"
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        />
      </div>

      <div
        data-pan-zoom-hud
        className="absolute bottom-5 right-5 z-30 flex select-none flex-col items-center gap-2 print:hidden"
      >
        <div
          className="flex h-6 min-w-[42px] items-center justify-center rounded-[10px] border border-border-rose-18/50 bg-white/95 px-2 text-[10.5px] font-semibold text-text-secondary shadow-sm backdrop-blur-md"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {Math.round(scale * 100)}%
        </div>
        <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border-rose-18/50 bg-white/95 p-1.5 shadow-md backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-text-secondary hover:bg-slate-100"
            onClick={() => zoomAtViewportCenter("in")}
            title="Mărește"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-text-secondary hover:bg-slate-100"
            onClick={() => zoomAtViewportCenter("out")}
            title="Micșorează"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <div className="my-0.5 h-px w-4 bg-border-rose-18/50" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-text-secondary hover:bg-slate-100"
            onClick={fitToView}
            title="Încadrează în vizor"
          >
            <Maximize2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-text-secondary hover:bg-slate-100"
            onClick={resetToHundredPercent}
            title="Reset 100%"
          >
            <Move className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
