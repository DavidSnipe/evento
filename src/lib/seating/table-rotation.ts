import {
  patchMeterDimensions,
  resolveFootprintMeters,
} from "@/lib/seating/table-spatial";
import type { TableMetadata } from "@/lib/seating/utils";

export function getPlannerShape(meta: TableMetadata, tableShape: string): string {
  return meta.customShape ?? tableShape;
}

export function isRoomObject(meta: TableMetadata): boolean {
  return !!meta.objectType;
}

/** Round / square / sweetheart — no rotation on canvas */
export function tableAllowsRotation(meta: TableMetadata, tableShape: string): boolean {
  if (isRoomObject(meta)) return true;
  const shape = getPlannerShape(meta, tableShape);
  return shape === "rectangular" || shape === "long_banquet";
}

/** Room objects may use 0/90/180/270; tables only 0 or 90 */
export function usesRectangularOrientationToggle(
  meta: TableMetadata,
  tableShape: string
): boolean {
  if (isRoomObject(meta)) return false;
  const shape = getPlannerShape(meta, tableShape);
  return shape === "rectangular" || shape === "long_banquet";
}

export function normalizeTableRotation(
  meta: TableMetadata,
  tableShape: string
): TableMetadata {
  if (!tableAllowsRotation(meta, tableShape)) {
    if (meta.rotation === 0 || meta.rotation == null) return meta;
    const { rotation: _r, ...rest } = meta;
    return rest;
  }
  if (usesRectangularOrientationToggle(meta, tableShape)) {
    const rot = meta.rotation === 90 ? 90 : 0;
    if (meta.rotation === rot) return meta;
    return { ...meta, rotation: rot };
  }
  return meta;
}

export function getDisplayRotationDeg(
  meta: TableMetadata,
  tableShape: string
): number {
  if (!tableAllowsRotation(meta, tableShape)) return 0;
  if (usesRectangularOrientationToggle(meta, tableShape)) {
    return meta.rotation === 90 ? 90 : 0;
  }
  const rot = meta.rotation ?? 0;
  return [0, 90, 180, 270].includes(rot) ? rot : 0;
}

/** Toggle rectangular / banquet between horizontal (0°) and vertical (90°), swapping footprint meters */
export function toggleRectangularOrientation(
  meta: TableMetadata,
  tableShape: string
): TableMetadata {
  const shape = getPlannerShape(meta, tableShape);
  const nextRotation = meta.rotation === 90 ? 0 : 90;
  const fp = resolveFootprintMeters(meta, shape);
  return patchMeterDimensions(
    { ...meta, rotation: nextRotation },
    {
      widthM: fp.heightM,
      heightM: fp.widthM,
      physicalWidthM: fp.physicalHeightM ?? fp.heightM,
      physicalHeightM: fp.physicalWidthM ?? fp.widthM,
    },
    shape
  );
}

export function isRectangularVertical(
  meta: TableMetadata,
  tableShape: string
): boolean {
  return (
    usesRectangularOrientationToggle(meta, tableShape) && meta.rotation === 90
  );
}
