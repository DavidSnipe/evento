import {
  OBJECT_PRESETS_M,
  TABLE_FOOTPRINT_SPECS,
} from "@/lib/seating/table-spatial";
import { metersToPixels, pixelsToMeters, snapPointPx } from "@/lib/seating/spatial";
import type { TemplateElement } from "@/lib/seating/template-generator";
import type { ExtractedFloorPlanElement } from "@/types/seating";

export type ReviewFloorPlanElement = ExtractedFloorPlanElement & {
  id: string;
  label: string;
};

const OBJECT_LABELS: Record<NonNullable<ExtractedFloorPlanElement["objectType"]>, string> = {
  dance_floor: "Ring de Dans",
  dance_floor_round: "Ring de Dans (rotund)",
  stage: "Scenă",
  stage_semicircle: "Scenă (semicerc)",
  dj_booth: "DJ Booth",
  bar: "Cocktail Bar",
  candy_bar: "Candy Bar",
  photo_booth: "Cabina Foto",
  entrance: "Intrare",
  sweet_table: "Sweet Table",
};

function snapTopLeftMeters(xM: number, yM: number): { pos_x_m: number; pos_y_m: number } {
  const snapped = snapPointPx(metersToPixels(xM), metersToPixels(yM));
  return {
    pos_x_m: pixelsToMeters(snapped.x),
    pos_y_m: pixelsToMeters(snapped.y),
  };
}

function resolveFootprintMeters(
  element: ExtractedFloorPlanElement,
  roomWidthM: number,
  roomHeightM: number
): { widthM: number; heightM: number } {
  if (element.widthNormalized != null && element.heightNormalized != null) {
    return {
      widthM: element.widthNormalized * roomWidthM,
      heightM: element.heightNormalized * roomHeightM,
    };
  }

  if (element.widthNormalized != null) {
    const widthM = element.widthNormalized * roomWidthM;
    return { widthM, heightM: widthM * 0.5 };
  }

  if (element.heightNormalized != null) {
    const heightM = element.heightNormalized * roomHeightM;
    return { widthM: heightM * 2, heightM };
  }

  if (element.elementType === "room_object" && element.objectType) {
    const preset = OBJECT_PRESETS_M[element.objectType];
    if (preset) {
      return { widthM: preset.widthM, heightM: preset.heightM };
    }
  }

  const spec = TABLE_FOOTPRINT_SPECS[element.shape];
  if (spec) {
    return { widthM: spec.footprintWidthM, heightM: spec.footprintHeightM };
  }

  return { widthM: 2, heightM: 2 };
}

export function resolveFloorPlanElementName(
  element: ExtractedFloorPlanElement,
  index: number
): string {
  if (element.elementType === "room_object") {
    if (element.tableName?.trim()) return element.tableName.trim();
    if (element.objectType && OBJECT_LABELS[element.objectType]) {
      return OBJECT_LABELS[element.objectType];
    }
    return "Obiect sală";
  }

  if (element.tableName?.trim()) return element.tableName.trim();
  if (element.tableNumber != null) return `Masa ${element.tableNumber}`;
  return `Masa ${index + 1}`;
}

export function toReviewElements(elements: ExtractedFloorPlanElement[]): ReviewFloorPlanElement[] {
  return elements.map((element, index) => ({
    ...element,
    id: `import-${Date.now()}-${index}`,
    label: resolveFloorPlanElementName(element, index),
  }));
}

export function createEmptyReviewElement(): ReviewFloorPlanElement {
  return {
    id: `import-manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    elementType: "table",
    shape: "round",
    posX_normalized: 0.5,
    posY_normalized: 0.5,
    confidence: "medium",
    capacity: 8,
    label: "Masa nouă",
  };
}

export function reviewElementToExtracted(element: ReviewFloorPlanElement): ExtractedFloorPlanElement {
  const label = element.label.trim();
  const masaMatch = label.match(/^masa\s+(\d+)$/i);
  const { id, label: _ignoredLabel, ...rest } = element;
  void id;
  void _ignoredLabel;
  return {
    ...rest,
    tableName: label || undefined,
    tableNumber: masaMatch ? Number(masaMatch[1]) : rest.tableNumber,
  };
}

export function floorPlanElementsToTemplateElements(
  elements: ExtractedFloorPlanElement[],
  roomWidthM: number,
  roomHeightM: number
): TemplateElement[] {
  return elements.map((element, index) => {
    const { widthM, heightM } = resolveFootprintMeters(element, roomWidthM, roomHeightM);

    const centerX = element.posX_normalized * roomWidthM;
    const centerY = element.posY_normalized * roomHeightM;
    const topLeftX = centerX - widthM / 2;
    const topLeftY = centerY - heightM / 2;
    const snapped = snapTopLeftMeters(topLeftX, topLeftY);

    const templateShape: TemplateElement["shape"] = element.shape;

    const base: TemplateElement = {
      type: element.elementType === "room_object" ? "room_object" : "table",
      name: resolveFloorPlanElementName(element, index),
      shape: templateShape,
      pos_x_m: snapped.pos_x_m,
      pos_y_m: snapped.pos_y_m,
      widthM,
      heightM,
    };

    if (element.elementType === "room_object" && element.objectType) {
      return {
        ...base,
        objectType: element.objectType,
        capacity: 1,
      };
    }

    return {
      ...base,
      capacity: element.capacity ?? 8,
    };
  });
}

export function previewFootprintNormalized(
  element: ExtractedFloorPlanElement,
  roomWidthM: number,
  roomHeightM: number
): {
  width: number;
  height: number;
} {
  const { widthM, heightM } = resolveFootprintMeters(element, roomWidthM, roomHeightM);
  return {
    width: Math.max(0.03, Math.min(0.4, widthM / roomWidthM)),
    height: Math.max(0.03, Math.min(0.4, heightM / roomHeightM)),
  };
}

const TABLE_RADIUS_NORMALIZED = 0.045;
const COLLISION_GAP = 0.025;
const ROOM_OBJECT_DEFAULT_WIDTH_N = 0.2;
const ROOM_OBJECT_DEFAULT_HEIGHT_N = 0.15;
const POSITION_CLAMP_MIN = 0.04;
const POSITION_CLAMP_MAX = 0.96;

export type NormalizedCollisionBBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function getRoomObjectFootprintNormalized(
  element: ExtractedFloorPlanElement,
  roomWidthM?: number,
  roomHeightM?: number
): { width: number; height: number } {
  if (element.widthNormalized != null && element.heightNormalized != null) {
    return { width: element.widthNormalized, height: element.heightNormalized };
  }

  if (roomWidthM != null && roomHeightM != null) {
    const { widthM, heightM } = resolveFootprintMeters(element, roomWidthM, roomHeightM);
    return {
      width: element.widthNormalized ?? widthM / roomWidthM,
      height: element.heightNormalized ?? heightM / roomHeightM,
    };
  }

  return {
    width: element.widthNormalized ?? ROOM_OBJECT_DEFAULT_WIDTH_N,
    height: element.heightNormalized ?? ROOM_OBJECT_DEFAULT_HEIGHT_N,
  };
}

function getRoomObjectBBox(
  element: ExtractedFloorPlanElement,
  roomWidthM?: number,
  roomHeightM?: number
): NormalizedCollisionBBox {
  const { width, height } = getRoomObjectFootprintNormalized(element, roomWidthM, roomHeightM);
  return {
    left: element.posX_normalized - width / 2,
    right: element.posX_normalized + width / 2,
    top: element.posY_normalized - height / 2,
    bottom: element.posY_normalized + height / 2,
  };
}

function getTableCollisionRadiusNormalized(
  table: ExtractedFloorPlanElement,
  roomWidthM?: number,
  roomHeightM?: number
): number {
  if (roomWidthM != null && roomHeightM != null) {
    const { width, height } = previewFootprintNormalized(table, roomWidthM, roomHeightM);
    return Math.max(width, height) / 2;
  }

  if (table.widthNormalized != null && table.heightNormalized != null) {
    return Math.max(table.widthNormalized, table.heightNormalized) / 2;
  }

  return TABLE_RADIUS_NORMALIZED;
}

function isCircularRoomObject(element: ExtractedFloorPlanElement): boolean {
  return element.objectType === "dance_floor_round";
}

export function getRoomObjectCollisionBboxWithMargin(
  element: ExtractedFloorPlanElement,
  roomWidthM?: number,
  roomHeightM?: number
): NormalizedCollisionBBox {
  const bbox = getRoomObjectBBox(element, roomWidthM, roomHeightM);
  const margin = TABLE_RADIUS_NORMALIZED + COLLISION_GAP;
  return {
    left: bbox.left - margin,
    right: bbox.right + margin,
    top: bbox.top - margin,
    bottom: bbox.bottom + margin,
  };
}

function isInsideOrTouchingBBox(
  tx: number,
  ty: number,
  bbox: NormalizedCollisionBBox,
  tableRadius: number
): boolean {
  const margin = tableRadius + COLLISION_GAP;
  return (
    tx > bbox.left - margin &&
    tx < bbox.right + margin &&
    ty > bbox.top - margin &&
    ty < bbox.bottom + margin
  );
}

function isInsideOrTouchingCircle(
  tx: number,
  ty: number,
  cx: number,
  cy: number,
  objectRadius: number,
  tableRadius: number
): boolean {
  const dx = tx - cx;
  const dy = ty - cy;
  const minDist = objectRadius + tableRadius + COLLISION_GAP;
  return dx * dx + dy * dy < minDist * minDist;
}

function pushOutsideBBox(
  tx: number,
  ty: number,
  bbox: NormalizedCollisionBBox,
  tableRadius: number
): { x: number; y: number } {
  const margin = tableRadius + COLLISION_GAP;

  const dLeft = Math.abs(tx - bbox.left);
  const dRight = Math.abs(tx - bbox.right);
  const dTop = Math.abs(ty - bbox.top);
  const dBottom = Math.abs(ty - bbox.bottom);

  const minDist = Math.min(dLeft, dRight, dTop, dBottom);

  if (minDist === dLeft) return { x: bbox.left - margin, y: ty };
  if (minDist === dRight) return { x: bbox.right + margin, y: ty };
  if (minDist === dTop) return { x: tx, y: bbox.top - margin };
  return { x: tx, y: bbox.bottom + margin };
}

function pushOutsideCircle(
  tx: number,
  ty: number,
  cx: number,
  cy: number,
  objectRadius: number,
  tableRadius: number
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const targetDist = objectRadius + tableRadius + COLLISION_GAP;
  return {
    x: cx + (dx / dist) * targetDist,
    y: cy + (dy / dist) * targetDist,
  };
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(POSITION_CLAMP_MIN, Math.min(POSITION_CLAMP_MAX, x)),
    y: Math.max(POSITION_CLAMP_MIN, Math.min(POSITION_CLAMP_MAX, y)),
  };
}

function resolveTableAgainstRoomObjects(
  x: number,
  y: number,
  tableRadius: number,
  roomObjects: ExtractedFloorPlanElement[],
  roomWidthM?: number,
  roomHeightM?: number
): { x: number; y: number; corrected: boolean } {
  let nextX = x;
  let nextY = y;
  let corrected = false;

  for (const obj of roomObjects) {
    if (isCircularRoomObject(obj)) {
      const { width, height } = getRoomObjectFootprintNormalized(obj, roomWidthM, roomHeightM);
      const objectRadius = Math.max(width, height) / 2;

      if (
        isInsideOrTouchingCircle(
          nextX,
          nextY,
          obj.posX_normalized,
          obj.posY_normalized,
          objectRadius,
          tableRadius
        )
      ) {
        const pushed = pushOutsideCircle(
          nextX,
          nextY,
          obj.posX_normalized,
          obj.posY_normalized,
          objectRadius,
          tableRadius
        );
        nextX = pushed.x;
        nextY = pushed.y;
        corrected = true;
      }
      continue;
    }

    const bbox = getRoomObjectBBox(obj, roomWidthM, roomHeightM);
    if (isInsideOrTouchingBBox(nextX, nextY, bbox, tableRadius)) {
      const pushed = pushOutsideBBox(nextX, nextY, bbox, tableRadius);
      nextX = pushed.x;
      nextY = pushed.y;
      corrected = true;
    }
  }

  return { x: nextX, y: nextY, corrected };
}

export function resolveImportedElementPositions(
  elements: ExtractedFloorPlanElement[],
  roomWidthM?: number,
  roomHeightM?: number
): { elements: ExtractedFloorPlanElement[]; correctedCount: number } {
  const roomObjects = elements.filter((e) => e.elementType === "room_object");
  const tables = elements.filter((e) => e.elementType === "table");

  if (roomObjects.length === 0) {
    return { elements, correctedCount: 0 };
  }

  let correctedCount = 0;
  const MAX_ITERATIONS = 10;

  const correctedTables = tables.map((table) => {
    const tableRadius = getTableCollisionRadiusNormalized(table, roomWidthM, roomHeightM);
    let x = table.posX_normalized;
    let y = table.posY_normalized;
    let corrected = false;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const beforeX = x;
      const beforeY = y;
      const resolved = resolveTableAgainstRoomObjects(
        x,
        y,
        tableRadius,
        roomObjects,
        roomWidthM,
        roomHeightM
      );
      x = resolved.x;
      y = resolved.y;
      if (resolved.corrected) corrected = true;

      if (Math.hypot(x - beforeX, y - beforeY) < 0.0001) break;
    }

    const clamped = clampPosition(x, y);
    x = clamped.x;
    y = clamped.y;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const beforeX = x;
      const beforeY = y;
      const resolved = resolveTableAgainstRoomObjects(
        x,
        y,
        tableRadius,
        roomObjects,
        roomWidthM,
        roomHeightM
      );
      x = resolved.x;
      y = resolved.y;
      if (resolved.corrected) corrected = true;
      if (Math.hypot(x - beforeX, y - beforeY) < 0.0001) break;
    }

    const reclamped = clampPosition(x, y);
    x = reclamped.x;
    y = reclamped.y;

    if (corrected) correctedCount++;

    return { ...table, posX_normalized: x, posY_normalized: y };
  });

  return {
    elements: [...roomObjects, ...correctedTables],
    correctedCount,
  };
}
