import {
  getFootprintVisualScale,
  getRoundTableVisualScale,
  RECT_TABLE_VISUAL_H_PX,
  RECT_TABLE_VISUAL_W_PX,
  ROUND_TABLE_VISUAL_PX,
  SQUARE_TABLE_VISUAL_PX,
} from "@/lib/seating/table-spatial";
import type { ResizeRectPx } from "@/lib/seating/table-resize";
import { metersToPixels, PIXELS_PER_METER } from "@/lib/seating/spatial";
import type { DragAssistResult } from "@/lib/seating/planner-spatial-assist";

export type ResizeVisualKind =
  | "room"
  | "round"
  | "square"
  | "rectangular";

export function resolveResizeVisualKind(
  isRoomObject: boolean,
  shape: string
): ResizeVisualKind {
  if (isRoomObject) return "room";
  if (shape === "round") return "round";
  if (shape === "square") return "square";
  return "rectangular";
}

function findTableWrapper(tableId: string): HTMLElement | null {
  return document.querySelector(
    `[data-table-id="${tableId}"],[data-planner-table-id="${tableId}"]`
  );
}

function applyFootprintInnerScale(
  footprintEl: HTMLElement,
  footprintWidthPx: number,
  footprintHeightPx: number,
  visualKind: ResizeVisualKind
) {
  const inner = footprintEl.querySelector(
    "[data-table-footprint-inner]"
  ) as HTMLElement | null;
  if (!inner) return;

  let scale = 1;
  switch (visualKind) {
    case "round":
      scale = getRoundTableVisualScale(footprintWidthPx, ROUND_TABLE_VISUAL_PX);
      break;
    case "square":
      scale = getFootprintVisualScale(
        footprintWidthPx,
        footprintHeightPx,
        SQUARE_TABLE_VISUAL_PX,
        SQUARE_TABLE_VISUAL_PX
      );
      break;
    case "rectangular":
      scale = getFootprintVisualScale(
        footprintWidthPx,
        footprintHeightPx,
        RECT_TABLE_VISUAL_W_PX,
        RECT_TABLE_VISUAL_H_PX
      );
      break;
    default:
      return;
  }

  inner.style.transform = `scale(${scale})`;
}

export function footprintPxFromResizeRect(rect: ResizeRectPx): {
  width: number;
  height: number;
} {
  return {
    width: metersToPixels(rect.widthM, PIXELS_PER_METER),
    height: metersToPixels(rect.heightM, PIXELS_PER_METER),
  };
}

function setTableCollisionVisual(tableId: string, colliding: boolean) {
  const wrapper = findTableWrapper(tableId);
  if (!wrapper) return;
  wrapper.classList.toggle("planner-table-collision", colliding);
  wrapper
    .querySelector<HTMLElement>(".table-visual-collision-host")
    ?.toggleAttribute("data-collision-visual", colliding);
}

export function applyResizeOverlayPosition(
  overlayEl: HTMLElement | null,
  posX: number,
  posY: number
) {
  if (!overlayEl) return;
  overlayEl.style.left = `${Math.round(posX)}px`;
  overlayEl.style.top = `${Math.round(posY)}px`;
}

/** Imperative resize paint — no React re-render. */
export function applyTableResizeDOM(
  tableId: string,
  rect: ResizeRectPx,
  overlayEl: HTMLElement | null,
  visualKind: ResizeVisualKind
) {
  const wrapper = findTableWrapper(tableId);
  if (wrapper) {
    wrapper.style.transform = `translate3d(${Math.round(rect.posX)}px, ${Math.round(rect.posY)}px, 0)`;
  }

  const footprintEl = wrapper?.querySelector(
    "[data-table-footprint]"
  ) as HTMLElement | null;

  if (footprintEl) {
    if (visualKind === "room") {
      footprintEl.style.width = `${rect.widthPx}px`;
      footprintEl.style.height = `${rect.heightPx}px`;
    } else {
      const footprintWidthPx = Math.round(rect.widthPx / rect.renderScale);
      const footprintHeightPx = Math.round(rect.heightPx / rect.renderScale);
      footprintEl.style.width = `${footprintWidthPx}px`;
      footprintEl.style.height = `${footprintHeightPx}px`;
      applyFootprintInnerScale(
        footprintEl,
        footprintWidthPx,
        footprintHeightPx,
        visualKind
      );
    }
  }

  if (overlayEl) {
    overlayEl.style.left = `${rect.posX}px`;
    overlayEl.style.top = `${rect.posY}px`;
    overlayEl.style.width = `${rect.widthPx}px`;
    overlayEl.style.height = `${rect.heightPx}px`;
  }
}

export function applyResizeCollisionDOM(
  resizingTableId: string,
  overlayEl: HTMLElement | null,
  assist: DragAssistResult,
  previouslyMarkedIds: string[]
): string[] {
  const hasCollision = assist.collisionIds.length > 0;

  setTableCollisionVisual(resizingTableId, hasCollision);
  overlayEl?.classList.toggle("resize-collision", hasCollision);

  const nextMarked = new Set(assist.collisionIds);
  for (const id of previouslyMarkedIds) {
    if (!nextMarked.has(id)) {
      setTableCollisionVisual(id, false);
    }
  }
  for (const id of assist.collisionIds) {
    setTableCollisionVisual(id, true);
  }

  return assist.collisionIds;
}

export function clearResizeCollisionDOM(
  resizingTableId: string,
  overlayEl: HTMLElement | null,
  markedIds: string[]
) {
  setTableCollisionVisual(resizingTableId, false);
  overlayEl?.classList.remove("resize-collision");
  for (const id of markedIds) {
    setTableCollisionVisual(id, false);
  }
}
