import type { CSSProperties } from "react";

import {
  metersToPixels,
  pixelsToMeters,
  PIXELS_PER_METER,
  snapMeters,
} from "@/lib/seating/spatial";
import type { TableMetadata } from "@/lib/seating/utils";

export const MIN_TABLE_RESIZE_M = 0.5;
export const MAX_TABLE_RESIZE_M = 15;

export type ResizeHandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type ResizeRectPx = {
  posX: number;
  posY: number;
  widthPx: number;
  heightPx: number;
  widthM: number;
  heightM: number;
  renderScale: number;
};

export function isTableCanvasResizable(
  meta: TableMetadata,
  tableShape: string
): boolean {
  const shape = meta.customShape ?? tableShape;
  return shape !== "sweetheart";
}

function isCornerHandle(handle: ResizeHandleId): boolean {
  return handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";
}

function dominantScale(scaleW: number, scaleH: number): number {
  return Math.abs(scaleW - 1) >= Math.abs(scaleH - 1) ? scaleW : scaleH;
}

function clampDimensionMeters(valueM: number): number {
  return snapMeters(
    Math.max(MIN_TABLE_RESIZE_M, Math.min(MAX_TABLE_RESIZE_M, valueM))
  );
}

function visualPxToMeters(px: number, renderScale: number): number {
  return pixelsToMeters(px / renderScale, PIXELS_PER_METER);
}

function metersToVisualPx(meters: number, renderScale: number): number {
  return Math.round(metersToPixels(meters, PIXELS_PER_METER) * renderScale);
}

function clampAspectMeters(
  widthM: number,
  heightM: number,
  aspectRatio: number
): { widthM: number; heightM: number } {
  let w = clampDimensionMeters(widthM);
  let h = w / aspectRatio;

  if (h < MIN_TABLE_RESIZE_M) {
    h = MIN_TABLE_RESIZE_M;
    w = clampDimensionMeters(h * aspectRatio);
  }
  if (h > MAX_TABLE_RESIZE_M) {
    h = MAX_TABLE_RESIZE_M;
    w = clampDimensionMeters(h * aspectRatio);
  }
  if (w > MAX_TABLE_RESIZE_M) {
    w = MAX_TABLE_RESIZE_M;
    h = clampDimensionMeters(w / aspectRatio);
  }

  return { widthM: w, heightM: h };
}

/** Fixed anchor point in the element's local (unrotated) coordinate space. */
function getFixedAnchorLocal(
  handle: ResizeHandleId,
  widthPx: number,
  heightPx: number
): { x: number; y: number } {
  switch (handle) {
    case "se":
      return { x: 0, y: 0 };
    case "nw":
      return { x: widthPx, y: heightPx };
    case "ne":
      return { x: 0, y: heightPx };
    case "sw":
      return { x: widthPx, y: 0 };
    case "e":
      return { x: 0, y: heightPx / 2 };
    case "w":
      return { x: widthPx, y: heightPx / 2 };
    case "s":
      return { x: widthPx / 2, y: 0 };
    case "n":
      return { x: widthPx / 2, y: heightPx };
    default:
      return { x: 0, y: 0 };
  }
}

function localAnchorToCanvas(
  posX: number,
  posY: number,
  widthPx: number,
  heightPx: number,
  rotationDeg: number,
  anchorLocal: { x: number; y: number }
): { x: number; y: number } {
  const cx = posX + widthPx / 2;
  const cy = posY + heightPx / 2;
  const lx = anchorLocal.x - widthPx / 2;
  const ly = anchorLocal.y - heightPx / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  };
}

function posFromFixedAnchor(
  anchorCanvas: { x: number; y: number },
  handle: ResizeHandleId,
  widthPx: number,
  heightPx: number,
  rotationDeg: number
): { posX: number; posY: number } {
  const anchorLocal = getFixedAnchorLocal(handle, widthPx, heightPx);
  const lx = anchorLocal.x - widthPx / 2;
  const ly = anchorLocal.y - heightPx / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = anchorCanvas.x - (lx * cos - ly * sin);
  const cy = anchorCanvas.y - (lx * sin + ly * cos);
  return { posX: cx - widthPx / 2, posY: cy - heightPx / 2 };
}

/** Canvas position of the fixed anchor at resize start (from initial rect + handle). */
export function computeResizeAnchorCanvas(
  handle: ResizeHandleId,
  initial: ResizeRectPx,
  rotationDeg: number
): { x: number; y: number } {
  const anchorLocal = getFixedAnchorLocal(
    handle,
    initial.widthPx,
    initial.heightPx
  );
  return localAnchorToCanvas(
    initial.posX,
    initial.posY,
    initial.widthPx,
    initial.heightPx,
    rotationDeg,
    anchorLocal
  );
}

function computeNextDimensions(
  handle: ResizeHandleId,
  initial: ResizeRectPx,
  localDx: number,
  localDy: number,
  aspectRatio: number
): { widthM: number; heightM: number; widthPx: number; heightPx: number } {
  const { widthPx, heightPx, renderScale } = initial;
  const minVisualPx = metersToVisualPx(MIN_TABLE_RESIZE_M, renderScale);

  if (isCornerHandle(handle)) {
    let scale = 1;

    switch (handle) {
      case "se": {
        const sw = (widthPx + localDx) / widthPx;
        const sh = (heightPx + localDy) / heightPx;
        scale = Math.max(minVisualPx / widthPx, dominantScale(sw, sh));
        break;
      }
      case "nw": {
        const sw = (widthPx - localDx) / widthPx;
        const sh = (heightPx - localDy) / heightPx;
        scale = Math.max(minVisualPx / widthPx, dominantScale(sw, sh));
        break;
      }
      case "ne": {
        const sw = (widthPx + localDx) / widthPx;
        const sh = (heightPx - localDy) / heightPx;
        scale = Math.max(minVisualPx / widthPx, dominantScale(sw, sh));
        break;
      }
      case "sw": {
        const sw = (widthPx - localDx) / widthPx;
        const sh = (heightPx + localDy) / heightPx;
        scale = Math.max(minVisualPx / widthPx, dominantScale(sw, sh));
        break;
      }
    }

    const clamped = clampAspectMeters(
      visualPxToMeters(widthPx * scale, renderScale),
      visualPxToMeters(heightPx * scale, renderScale),
      aspectRatio
    );

    return {
      widthM: clamped.widthM,
      heightM: clamped.heightM,
      widthPx: metersToVisualPx(clamped.widthM, renderScale),
      heightPx: metersToVisualPx(clamped.heightM, renderScale),
    };
  }

  switch (handle) {
    case "e": {
      const nextWidthPx = Math.max(minVisualPx, widthPx + localDx);
      const widthM = clampDimensionMeters(
        visualPxToMeters(nextWidthPx, renderScale)
      );
      return {
        widthM,
        heightM: initial.heightM,
        widthPx: metersToVisualPx(widthM, renderScale),
        heightPx: initial.heightPx,
      };
    }
    case "w": {
      const nextWidthPx = Math.max(minVisualPx, widthPx - localDx);
      const widthM = clampDimensionMeters(
        visualPxToMeters(nextWidthPx, renderScale)
      );
      return {
        widthM,
        heightM: initial.heightM,
        widthPx: metersToVisualPx(widthM, renderScale),
        heightPx: initial.heightPx,
      };
    }
    case "s": {
      const nextHeightPx = Math.max(minVisualPx, heightPx + localDy);
      const heightM = clampDimensionMeters(
        visualPxToMeters(nextHeightPx, renderScale)
      );
      return {
        widthM: initial.widthM,
        heightM,
        widthPx: initial.widthPx,
        heightPx: metersToVisualPx(heightM, renderScale),
      };
    }
    case "n": {
      const nextHeightPx = Math.max(minVisualPx, heightPx - localDy);
      const heightM = clampDimensionMeters(
        visualPxToMeters(nextHeightPx, renderScale)
      );
      return {
        widthM: initial.widthM,
        heightM,
        widthPx: initial.widthPx,
        heightPx: metersToVisualPx(heightM, renderScale),
      };
    }
    default:
      return {
        widthM: initial.widthM,
        heightM: initial.heightM,
        widthPx: initial.widthPx,
        heightPx: initial.heightPx,
      };
  }
}

export function computeResizeFromHandle(
  handle: ResizeHandleId,
  initial: ResizeRectPx,
  anchorCanvas: { x: number; y: number },
  pointerCanvas: { x: number; y: number },
  startPointerCanvas: { x: number; y: number },
  rotationDeg: number,
  aspectRatio: number
): ResizeRectPx {
  const dx = pointerCanvas.x - startPointerCanvas.x;
  const dy = pointerCanvas.y - startPointerCanvas.y;

  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const localDx = dx * cos - dy * sin;
  const localDy = dx * sin + dy * cos;

  const nextDims = computeNextDimensions(
    handle,
    initial,
    localDx,
    localDy,
    aspectRatio
  );
  const { posX, posY } = posFromFixedAnchor(
    anchorCanvas,
    handle,
    nextDims.widthPx,
    nextDims.heightPx,
    rotationDeg
  );

  return {
    posX,
    posY,
    widthPx: nextDims.widthPx,
    heightPx: nextDims.heightPx,
    widthM: nextDims.widthM,
    heightM: nextDims.heightM,
    renderScale: initial.renderScale,
  };
}

export const RESIZE_HANDLES: Array<{
  id: ResizeHandleId;
  cursor: string;
  rounded: boolean;
  style: CSSProperties;
}> = [
  { id: "nw", cursor: "nw-resize", rounded: false, style: { left: 0, top: 0 } },
  { id: "n", cursor: "n-resize", rounded: true, style: { left: "50%", top: 0 } },
  { id: "ne", cursor: "ne-resize", rounded: false, style: { left: "100%", top: 0 } },
  { id: "e", cursor: "e-resize", rounded: true, style: { left: "100%", top: "50%" } },
  { id: "se", cursor: "se-resize", rounded: false, style: { left: "100%", top: "100%" } },
  { id: "s", cursor: "s-resize", rounded: true, style: { left: "50%", top: "100%" } },
  { id: "sw", cursor: "sw-resize", rounded: false, style: { left: 0, top: "100%" } },
  { id: "w", cursor: "w-resize", rounded: true, style: { left: 0, top: "50%" } },
];
