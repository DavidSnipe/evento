/**
 * Virtual spatial coordinate system for the seating planner.
 * Logical units are meters; canvas uses PIXELS_PER_METER for rendering.
 * DB pos_x/pos_y are stored at STORAGE_PIXELS_PER_METER for backward compatibility.
 */

/** Canvas render density (~35% denser than legacy 100 px/m) */
export const PIXELS_PER_METER = 65;

/** Canonical scale used when persisting pos_x/pos_y to the database */
export const STORAGE_PIXELS_PER_METER = 100;

/** Live drag snap increment (meters) */
export const GRID_METERS = 0.5;

/** One snap cell on canvas in pixels */
export const GRID_CELL_PX = PIXELS_PER_METER * GRID_METERS;

/** Default room size in meters (used when event has no custom value) */
export const DEFAULT_ROOM_WIDTH_M = 30;
export const DEFAULT_ROOM_HEIGHT_M = 24;

/** @deprecated use DEFAULT_ROOM_WIDTH_M or event-specific room size */
export const ROOM_WIDTH_M = DEFAULT_ROOM_WIDTH_M;
/** @deprecated use DEFAULT_ROOM_HEIGHT_M or event-specific room size */
export const ROOM_HEIGHT_M = DEFAULT_ROOM_HEIGHT_M;

export const MIN_SEATING_ROOM_DIMENSION_M = 5;
export const MAX_SEATING_ROOM_DIMENSION_M = 100;

/** @deprecated use resolveSpatialLayout() for event-specific canvas size */
export const CANVAS_WIDTH_PX = DEFAULT_ROOM_WIDTH_M * PIXELS_PER_METER;
/** @deprecated use resolveSpatialLayout() for event-specific canvas size */
export const CANVAS_HEIGHT_PX = DEFAULT_ROOM_HEIGHT_M * PIXELS_PER_METER;

/** Extra pan range beyond the room, in meters */
export const WORKSPACE_PAD_M = 10;
export const WORKSPACE_PAD_PX = WORKSPACE_PAD_M * PIXELS_PER_METER;

export type SpatialConfig = {
  pixelsPerMeter: number;
  gridMeters: number;
  roomWidthM: number;
  roomHeightM: number;
};

export const DEFAULT_SPATIAL_CONFIG: SpatialConfig = {
  pixelsPerMeter: PIXELS_PER_METER,
  gridMeters: GRID_METERS,
  roomWidthM: DEFAULT_ROOM_WIDTH_M,
  roomHeightM: DEFAULT_ROOM_HEIGHT_M,
};

export type RoomSpatialLayout = {
  roomWidthM: number;
  roomHeightM: number;
  roomWidthPx: number;
  roomHeightPx: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
};

export function clampRoomDimensionM(meters: number): number {
  if (!Number.isFinite(meters)) return DEFAULT_ROOM_WIDTH_M;
  const rounded = Math.round(meters * 10) / 10;
  return Math.min(MAX_SEATING_ROOM_DIMENSION_M, Math.max(MIN_SEATING_ROOM_DIMENSION_M, rounded));
}

export function normalizeRoomDimensions(
  widthM: number | null | undefined,
  heightM: number | null | undefined
): { roomWidthM: number; roomHeightM: number } {
  return {
    roomWidthM: clampRoomDimensionM(Number(widthM) || DEFAULT_ROOM_WIDTH_M),
    roomHeightM: clampRoomDimensionM(Number(heightM) || DEFAULT_ROOM_HEIGHT_M),
  };
}

/** Workspace canvas is at least the room size, or large enough to fit placed content. */
export function resolveSpatialLayout(
  roomWidthM: number,
  roomHeightM: number,
  contentMaxX = 0,
  contentMaxY = 0
): RoomSpatialLayout {
  const roomWidthPx = metersToPixels(roomWidthM);
  const roomHeightPx = metersToPixels(roomHeightM);
  const canvasWidthPx = Math.max(roomWidthPx, Math.ceil(contentMaxX));
  const canvasHeightPx = Math.max(roomHeightPx, Math.ceil(contentMaxY));

  return {
    roomWidthM,
    roomHeightM,
    roomWidthPx,
    roomHeightPx,
    canvasWidthPx,
    canvasHeightPx,
  };
}

export function isFootprintOutsideRoom(
  x: number,
  y: number,
  footprintWidthPx: number,
  footprintHeightPx: number,
  roomWidthPx: number,
  roomHeightPx: number
): boolean {
  return (
    x < 0 ||
    y < 0 ||
    x + footprintWidthPx > roomWidthPx ||
    y + footprintHeightPx > roomHeightPx
  );
}

export function metersToPixels(
  meters: number,
  ppm: number = PIXELS_PER_METER
): number {
  return meters * ppm;
}

export function pixelsToMeters(
  pixels: number,
  ppm: number = PIXELS_PER_METER
): number {
  return pixels / ppm;
}

/** DB/stored coordinates → current canvas pixels (preserves real-world meters) */
export function storedPxToCanvasPx(storedPx: number): number {
  const meters = storedPx / STORAGE_PIXELS_PER_METER;
  return Math.round(metersToPixels(meters, PIXELS_PER_METER));
}

/** Canvas pixels → DB/stored coordinates */
export function canvasPxToStoredPx(canvasPx: number): number {
  const meters = pixelsToMeters(canvasPx, PIXELS_PER_METER);
  return Math.round(metersToPixels(meters, STORAGE_PIXELS_PER_METER));
}

export function tablePositionsToCanvas<
  T extends { pos_x?: number | null; pos_y?: number | null },
>(table: T): T {
  return {
    ...table,
    pos_x: storedPxToCanvasPx(table.pos_x ?? 0),
    pos_y: storedPxToCanvasPx(table.pos_y ?? 0),
  };
}

export function snapMeters(
  meters: number,
  gridMeters: number = GRID_METERS
): number {
  if (gridMeters <= 0) return meters;
  return Math.round(meters / gridMeters) * gridMeters;
}

export function snapPixels(
  pixels: number,
  gridMeters: number = GRID_METERS,
  ppm: number = PIXELS_PER_METER
): number {
  return metersToPixels(snapMeters(pixelsToMeters(pixels), gridMeters), ppm);
}

export function snapPointPx(
  x: number,
  y: number,
  gridMeters: number = GRID_METERS,
  ppm: number = PIXELS_PER_METER
): { x: number; y: number } {
  return {
    x: snapPixels(x, gridMeters, ppm),
    y: snapPixels(y, gridMeters, ppm),
  };
}

/** Format for UI labels */
export function formatMeters(m: number): string {
  const rounded = Math.round(m * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} m` : `${rounded.toFixed(1)} m`;
}

/**
 * Convert screen/client coordinates to canvas-local pixels.
 * Inverse of viewport transform: translate(pan) then scale(zoom), origin top-left.
 */
export function clientPointToCanvasPx(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  panX: number,
  panY: number,
  scale: number
): { x: number; y: number } {
  const s = scale > 0 ? scale : 1;
  return {
    x: (clientX - viewportRect.left - panX) / s,
    y: (clientY - viewportRect.top - panY) / s,
  };
}
