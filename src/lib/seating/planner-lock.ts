import type { TableMetadata } from "@/lib/seating/utils";

export function isPlannerGloballyLocked(globalLock: boolean): boolean {
  return globalLock;
}

export function isTableIndividuallyLocked(metadata: TableMetadata): boolean {
  return metadata.isLocked === true;
}

/**
 * Layout editing: move tables, resize, rotate, rename, delete, position lock toggle.
 * Blocked when global lock is on or the table/object is individually locked.
 */
export function canEditLayout(
  globalLock: boolean,
  metadata: TableMetadata
): boolean {
  if (isPlannerGloballyLocked(globalLock)) return false;
  return !isTableIndividuallyLocked(metadata);
}

/** @alias canEditLayout — table drag on canvas */
export function canMoveTable(
  globalLock: boolean,
  metadata: TableMetadata
): boolean {
  return canEditLayout(globalLock, metadata);
}

/** @alias canEditLayout — panel/canvas structural edits */
export function canEditTable(
  globalLock: boolean,
  metadata: TableMetadata
): boolean {
  return canEditLayout(globalLock, metadata);
}

/**
 * Seating management: assign guests, drag onto tables, unassign from detail panel.
 * Independent of global layout lock; only blocks non-table room objects.
 */
export function canAssignGuestToTable(metadata: TableMetadata): boolean {
  return !metadata.objectType;
}

/** @deprecated Use canAssignGuestToTable — global lock does not apply */
export function canDropGuestOnTable(
  _globalLock: boolean,
  metadata: TableMetadata
): boolean {
  return canAssignGuestToTable(metadata);
}
