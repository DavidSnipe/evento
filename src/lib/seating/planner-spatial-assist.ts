/**
 * Spatial indexing, alignment guides, and collision detection for the seating planner.
 * Canvas-pixel coordinates; grid snap remains unchanged in spatial.ts.
 */

import { PIXELS_PER_METER } from "@/lib/seating/spatial";

/** Allow up to this much footprint overlap before blocking (edge contact tolerance). */
export const COLLISION_TOLERANCE_M = 0.1;
export const COLLISION_TOLERANCE_PX = COLLISION_TOLERANCE_M * PIXELS_PER_METER;

export const SPATIAL_CELL_SIZE_PX = 260;
export const ALIGN_THRESHOLD_PX = 10;
export const NEARBY_QUERY_PAD_PX = 80;

export type FootprintRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

export type PlannerSpatialItem = {
  id: string;
  renderKey: string;
  rect: FootprintRect;
};

export type AlignmentGuideLine = {
  orientation: "horizontal" | "vertical";
  /** Canvas y for horizontal, canvas x for vertical */
  position: number;
  from: number;
  to: number;
  kind: "center" | "edge" | "spacing";
};

export type DragAssistResult = {
  guides: AlignmentGuideLine[];
  collisionIds: string[];
  nearbyIds: string[];
};

export function rectFromPosition(
  x: number,
  y: number,
  width: number,
  height: number
): FootprintRect {
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    width,
    height,
  };
}

/** Inset footprints by half tolerance so ≤0.1 m contact does not count as overlap. */
function shrinkRectForCollision(rect: FootprintRect): FootprintRect {
  const inset = COLLISION_TOLERANCE_PX / 2;
  const shrunkW = rect.width - COLLISION_TOLERANCE_PX;
  const shrunkH = rect.height - COLLISION_TOLERANCE_PX;
  if (shrunkW <= 0 || shrunkH <= 0) {
    return rectFromPosition(
      rect.centerX - 1,
      rect.centerY - 1,
      2,
      2
    );
  }
  return rectFromPosition(
    rect.left + inset,
    rect.top + inset,
    shrunkW,
    shrunkH
  );
}

/** True when shrunk footprints share positive area (real overlap beyond tolerance). */
export function rectsOverlap(a: FootprintRect, b: FootprintRect): boolean {
  const sa = shrinkRectForCollision(a);
  const sb = shrinkRectForCollision(b);
  const overlapW = Math.min(sa.right, sb.right) - Math.max(sa.left, sb.left);
  const overlapH = Math.min(sa.bottom, sb.bottom) - Math.max(sa.top, sb.top);
  return overlapW > 0 && overlapH > 0;
}

export function hasFootprintCollisionAt(
  movingId: string,
  posX: number,
  posY: number,
  footprintWidth: number,
  footprintHeight: number,
  grid: SpatialHashGrid<PlannerSpatialItem>
): boolean {
  const movingRect = rectFromPosition(
    posX,
    posY,
    footprintWidth,
    footprintHeight
  );
  const nearby = grid.query(movingRect, NEARBY_QUERY_PAD_PX);
  for (const other of nearby) {
    if (other.id === movingId) continue;
    if (rectsOverlap(movingRect, other.rect)) return true;
  }
  return false;
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

function cellsForRect(
  rect: FootprintRect,
  cellSize: number,
  pad: number
): string[] {
  const left = rect.left - pad;
  const top = rect.top - pad;
  const right = rect.right + pad;
  const bottom = rect.bottom + pad;
  const c0 = Math.floor(left / cellSize);
  const c1 = Math.floor(right / cellSize);
  const r0 = Math.floor(top / cellSize);
  const r1 = Math.floor(bottom / cellSize);
  const keys: string[] = [];
  for (let col = c0; col <= c1; col++) {
    for (let row = r0; row <= r1; row++) {
      keys.push(cellKey(col, row));
    }
  }
  return keys;
}

/** Uniform grid spatial hash — O(cells touched) insert/query */
export class SpatialHashGrid<T extends PlannerSpatialItem> {
  private readonly cellSize: number;
  private readonly buckets = new Map<string, T[]>();

  constructor(cellSize: number = SPATIAL_CELL_SIZE_PX) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.buckets.clear();
  }

  insert(item: T): void {
    for (const key of cellsForRect(item.rect, this.cellSize, 0)) {
      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = [];
        this.buckets.set(key, bucket);
      }
      bucket.push(item);
    }
  }

  build(items: T[]): void {
    this.clear();
    for (const item of items) {
      this.insert(item);
    }
  }

  query(rect: FootprintRect, pad: number = NEARBY_QUERY_PAD_PX): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const key of cellsForRect(rect, this.cellSize, pad)) {
      const bucket = this.buckets.get(key);
      if (!bucket) continue;
      for (const item of bucket) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  }
}

function near(a: number, b: number, threshold: number): boolean {
  return Math.abs(a - b) <= threshold;
}

function mergeGuideSpan(
  guides: AlignmentGuideLine[],
  orientation: AlignmentGuideLine["orientation"],
  position: number,
  from: number,
  to: number,
  kind: AlignmentGuideLine["kind"]
): void {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const existing = guides.find(
    (g) =>
      g.orientation === orientation &&
      g.kind === kind &&
      near(g.position, position, 1)
  );
  if (existing) {
    existing.from = Math.min(existing.from, lo);
    existing.to = Math.max(existing.to, hi);
    return;
  }
  guides.push({ orientation, position, from: lo, to: hi, kind });
}

function computeAlignmentGuides(
  moving: FootprintRect,
  others: PlannerSpatialItem[],
  threshold: number
): AlignmentGuideLine[] {
  const guides: AlignmentGuideLine[] = [];

  for (const other of others) {
    const o = other.rect;

    if (near(moving.centerX, o.centerX, threshold)) {
      mergeGuideSpan(
        guides,
        "vertical",
        o.centerX,
        Math.min(moving.top, o.top),
        Math.max(moving.bottom, o.bottom),
        "center"
      );
    }
    if (near(moving.centerY, o.centerY, threshold)) {
      mergeGuideSpan(
        guides,
        "horizontal",
        o.centerY,
        Math.min(moving.left, o.left),
        Math.max(moving.right, o.right),
        "center"
      );
    }

    const xPairs: [number, number][] = [
      [moving.left, o.left],
      [moving.right, o.right],
      [moving.left, o.right],
      [moving.right, o.left],
    ];
    for (const [a, b] of xPairs) {
      if (near(a, b, threshold)) {
        mergeGuideSpan(
          guides,
          "vertical",
          b,
          Math.min(moving.top, o.top),
          Math.max(moving.bottom, o.bottom),
          "edge"
        );
      }
    }

    const yPairs: [number, number][] = [
      [moving.top, o.top],
      [moving.bottom, o.bottom],
      [moving.top, o.bottom],
      [moving.bottom, o.top],
    ];
    for (const [a, b] of yPairs) {
      if (near(a, b, threshold)) {
        mergeGuideSpan(
          guides,
          "horizontal",
          b,
          Math.min(moving.left, o.left),
          Math.max(moving.right, o.right),
          "edge"
        );
      }
    }

    const gapRightLeft = o.left - moving.right;
    const gapLeftRight = moving.left - o.right;
    if (gapRightLeft > 0 && gapRightLeft < threshold * 4) {
      for (const third of others) {
        if (third.id === other.id) continue;
        const gap2 = third.left - o.right;
        if (gap2 > 0 && near(gapRightLeft, gap2, threshold)) {
          mergeGuideSpan(
            guides,
            "horizontal",
            moving.centerY,
            moving.right,
            third.left,
            "spacing"
          );
        }
      }
    }
    if (gapLeftRight > 0 && gapLeftRight < threshold * 4) {
      for (const third of others) {
        if (third.id === other.id) continue;
        const gap2 = moving.left - third.right;
        if (gap2 > 0 && near(gapLeftRight, gap2, threshold)) {
          mergeGuideSpan(
            guides,
            "horizontal",
            moving.centerY,
            third.right,
            moving.left,
            "spacing"
          );
        }
      }
    }
  }

  return guides.slice(0, 24);
}

export function computeDragAssist(
  movingId: string,
  posX: number,
  posY: number,
  footprintWidth: number,
  footprintHeight: number,
  grid: SpatialHashGrid<PlannerSpatialItem>,
  threshold: number = ALIGN_THRESHOLD_PX
): DragAssistResult {
  const movingRect = rectFromPosition(
    posX,
    posY,
    footprintWidth,
    footprintHeight
  );

  const nearby = grid.query(movingRect, NEARBY_QUERY_PAD_PX);
  const others = nearby.filter((item) => item.id !== movingId);

  const collisionIds: string[] = [];
  for (const other of others) {
    if (rectsOverlap(movingRect, other.rect)) {
      collisionIds.push(other.id);
    }
  }

  const guides = computeAlignmentGuides(movingRect, others, threshold);

  return {
    guides,
    collisionIds,
    nearbyIds: others.map((o) => o.id),
  };
}
