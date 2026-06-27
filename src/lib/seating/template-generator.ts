import { TABLE_FOOTPRINT_SPECS } from "@/lib/seating/table-spatial";
import {
  metersToPixels,
  pixelsToMeters,
  snapPointPx,
} from "@/lib/seating/spatial";

export type TemplateWizardTemplate = "ring_round" | "ring_square" | "banquet";
export type TemplateWizardSpacing = "compact" | "normal" | "airy";

export type TemplateLayoutConfig = {
  template: TemplateWizardTemplate;
  guestsPerTable: number;
  spacing: TemplateWizardSpacing;
  totalConfirmedGuests: number;
};

export type TemplateWizardConfig = Omit<TemplateLayoutConfig, "totalConfirmedGuests">;

export type TemplateElement = {
  type: "table" | "room_object";
  name: string;
  shape: "round" | "rectangular" | "long_banquet" | "sweetheart";
  capacity?: number;
  objectType?: string;
  widthM?: number;
  heightM?: number;
  pos_x_m: number;
  pos_y_m: number;
  rotation?: number;
};

const SPACING_MULTIPLIERS: Record<TemplateWizardSpacing, number> = {
  compact: 1.0,
  normal: 1.3,
  airy: 1.6,
};

const ROUND_FOOTPRINT_M = TABLE_FOOTPRINT_SPECS.round.footprintWidthM;
const SWEETHEART_W_M = TABLE_FOOTPRINT_SPECS.sweetheart.footprintWidthM;
const SWEETHEART_H_M = TABLE_FOOTPRINT_SPECS.sweetheart.footprintHeightM;

function snapPositionMeters(xM: number, yM: number): { pos_x_m: number; pos_y_m: number } {
  const snapped = snapPointPx(metersToPixels(xM), metersToPixels(yM));
  return {
    pos_x_m: pixelsToMeters(snapped.x),
    pos_y_m: pixelsToMeters(snapped.y),
  };
}

function snapElement(element: TemplateElement): TemplateElement {
  const snapped = snapPositionMeters(element.pos_x_m, element.pos_y_m);
  return { ...element, ...snapped };
}

function centerHorizontally(roomWidthM: number, widthM: number): number {
  return roomWidthM / 2 - widthM / 2;
}

function topLeftFromCenter(
  centerXM: number,
  centerYM: number,
  widthM: number,
  heightM: number
): { pos_x_m: number; pos_y_m: number } {
  return {
    pos_x_m: centerXM - widthM / 2,
    pos_y_m: centerYM - heightM / 2,
  };
}

function maxTablesOnRing(radiusM: number, footprintM: number): number {
  if (radiusM <= 0) return 1;
  return Math.max(1, Math.floor((2 * Math.PI * radiusM) / footprintM));
}

function distributeColumnYPositions(
  count: number,
  topMarginM: number,
  bottomMarginM: number,
  roomHeightM: number,
  itemHeightM: number
): number[] {
  if (count <= 0) return [];
  const availableHeight = roomHeightM - topMarginM - bottomMarginM;
  const gap =
    count > 0 ? (availableHeight - count * itemHeightM) / (count + 1) : 0;
  return Array.from({ length: count }, (_, index) => {
    return topMarginM + gap * (index + 1) + itemHeightM * index;
  });
}

function buildRingRoundLayout(
  roomWidthM: number,
  roomHeightM: number,
  tableCount: number,
  guestsPerTable: number,
  spacing: TemplateWizardSpacing
): TemplateElement[] {
  const elements: TemplateElement[] = [];
  const centerX = roomWidthM / 2;
  const centerY = roomHeightM / 2;
  const ringSizeM = Math.min(roomWidthM, roomHeightM) * 0.18;
  const gapM = SPACING_MULTIPLIERS[spacing] * 1.5;
  const ringRadiusM = ringSizeM / 2;
  const tableCircleRadiusM = ringRadiusM + ROUND_FOOTPRINT_M + gapM;

  elements.push(
    snapElement({
      type: "room_object",
      name: "Ring de Dans",
      shape: "rectangular",
      objectType: "dance_floor",
      widthM: ringSizeM,
      heightM: ringSizeM,
      ...topLeftFromCenter(centerX, centerY, ringSizeM, ringSizeM),
    })
  );

  const stageWidthM = ringSizeM * 1.5;
  const stageHeightM = ringSizeM * 0.4;
  const ringTopM = centerY - ringSizeM / 2;
  elements.push(
    snapElement({
      type: "room_object",
      name: "Scenă",
      shape: "rectangular",
      objectType: "stage",
      widthM: stageWidthM,
      heightM: stageHeightM,
      pos_x_m: centerHorizontally(roomWidthM, stageWidthM),
      pos_y_m: ringTopM - 0.5 - stageHeightM,
    })
  );

  const ringBottomM = centerY + ringSizeM / 2;
  elements.push(
    snapElement({
      type: "table",
      name: "Masa Mirilor",
      shape: "sweetheart",
      capacity: 4,
      pos_x_m: centerHorizontally(roomWidthM, SWEETHEART_W_M),
      pos_y_m: ringBottomM + 0.5,
    })
  );

  if (tableCount <= 0) return elements;

  const singleRingCapacity = maxTablesOnRing(tableCircleRadiusM, ROUND_FOOTPRINT_M);
  const useTwoRings = tableCount > singleRingCapacity;
  const innerCount = useTwoRings ? Math.ceil(tableCount * 0.6) : tableCount;
  const outerCount = useTwoRings ? tableCount - innerCount : 0;
  const outerRadiusM = tableCircleRadiusM + ROUND_FOOTPRINT_M + gapM;

  const addRingTables = (count: number, radiusM: number, startIndex: number) => {
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const center = topLeftFromCenter(
        centerX + radiusM * Math.cos(angle),
        centerY + radiusM * Math.sin(angle),
        ROUND_FOOTPRINT_M,
        ROUND_FOOTPRINT_M
      );
      elements.push(
        snapElement({
          type: "table",
          name: `Masa ${startIndex + i + 1}`,
          shape: "round",
          capacity: guestsPerTable,
          ...center,
        })
      );
    }
  };

  addRingTables(innerCount, tableCircleRadiusM, 0);
  if (outerCount > 0) {
    addRingTables(outerCount, outerRadiusM, innerCount);
  }

  return elements;
}

function buildRingSquareLayout(
  roomWidthM: number,
  roomHeightM: number,
  tableCount: number,
  guestsPerTable: number
): TemplateElement[] {
  const elements: TemplateElement[] = [];
  const centerX = roomWidthM / 2;
  const centerY = roomHeightM / 2;
  const ringSizeM = Math.min(roomWidthM, roomHeightM) * 0.22;
  const tableWidthM = 2.0;
  const tableHeightM = 0.8;

  elements.push(
    snapElement({
      type: "room_object",
      name: "Ring de Dans",
      shape: "rectangular",
      objectType: "dance_floor",
      widthM: ringSizeM,
      heightM: ringSizeM,
      ...topLeftFromCenter(centerX, centerY, ringSizeM, ringSizeM),
    })
  );

  const stageWidthM = roomWidthM * 0.6;
  const stageHeightM = 2;
  elements.push(
    snapElement({
      type: "room_object",
      name: "Scenă",
      shape: "rectangular",
      objectType: "stage",
      widthM: stageWidthM,
      heightM: stageHeightM,
      pos_x_m: centerHorizontally(roomWidthM, stageWidthM),
      pos_y_m: 1,
    })
  );

  const ringBottomM = centerY + ringSizeM / 2;
  const southGapM = (roomHeightM - ringBottomM - SWEETHEART_H_M) / 2;
  elements.push(
    snapElement({
      type: "table",
      name: "Masa Mirilor",
      shape: "sweetheart",
      capacity: 4,
      pos_x_m: centerHorizontally(roomWidthM, SWEETHEART_W_M),
      pos_y_m: ringBottomM + Math.max(0.5, southGapM),
    })
  );

  if (tableCount <= 0) return elements;

  const ringLeftM = centerX - ringSizeM / 2;
  const ringRightM = centerX + ringSizeM / 2;
  const leftCount = Math.ceil(tableCount / 2);
  const rightCount = Math.floor(tableCount / 2);
  const leftX = ringLeftM - tableWidthM - 1.5;
  const rightX = ringRightM + 1.5;
  const topMarginM = 1;
  const bottomMarginM = 1;

  const leftYs = distributeColumnYPositions(
    leftCount,
    topMarginM,
    bottomMarginM,
    roomHeightM,
    tableHeightM
  );
  const rightYs = distributeColumnYPositions(
    rightCount,
    topMarginM,
    bottomMarginM,
    roomHeightM,
    tableHeightM
  );

  leftYs.forEach((yM, index) => {
    elements.push(
      snapElement({
        type: "table",
        name: `Masa ${index * 2 + 1}`,
        shape: "rectangular",
        capacity: guestsPerTable,
        widthM: tableWidthM,
        heightM: tableHeightM,
        pos_x_m: leftX,
        pos_y_m: yM,
        rotation: 0,
      })
    );
  });

  rightYs.forEach((yM, index) => {
    elements.push(
      snapElement({
        type: "table",
        name: `Masa ${index * 2 + 2}`,
        shape: "rectangular",
        capacity: guestsPerTable,
        widthM: tableWidthM,
        heightM: tableHeightM,
        pos_x_m: rightX,
        pos_y_m: yM,
        rotation: 0,
      })
    );
  });

  return elements;
}

function buildBanquetLayout(
  roomWidthM: number,
  roomHeightM: number,
  tableCount: number,
  guestsPerTable: number
): TemplateElement[] {
  const elements: TemplateElement[] = [];
  const stageWidthM = roomWidthM * 0.5;
  const stageHeightM = 2;

  elements.push(
    snapElement({
      type: "room_object",
      name: "Scenă",
      shape: "rectangular",
      objectType: "stage",
      widthM: stageWidthM,
      heightM: stageHeightM,
      pos_x_m: centerHorizontally(roomWidthM, stageWidthM),
      pos_y_m: 1,
    })
  );

  const stageBottomM = 1 + stageHeightM;
  elements.push(
    snapElement({
      type: "table",
      name: "Masa Mirilor",
      shape: "sweetheart",
      capacity: 4,
      pos_x_m: centerHorizontally(roomWidthM, SWEETHEART_W_M),
      pos_y_m: stageBottomM + 1,
    })
  );

  if (tableCount <= 0) return elements;

  const masaMirilorBottomM = stageBottomM + 1 + SWEETHEART_H_M;
  const startYM = masaMirilorBottomM + 2;
  const endYM = roomHeightM - 1;
  const tableWidthM = roomWidthM * 0.7;
  const tableHeightM = 1.0;
  const availableHeight = Math.max(0, endYM - startYM);
  const gap =
    tableCount > 0
      ? (availableHeight - tableCount * tableHeightM) / (tableCount + 1)
      : 0;
  const capacityFromWidth = Math.max(
    2,
    Math.round(tableWidthM / 0.5 / 2) * 2
  );
  const capacity = Math.max(guestsPerTable, capacityFromWidth);

  for (let i = 0; i < tableCount; i++) {
    const yM = startYM + gap * (i + 1) + tableHeightM * i;
    elements.push(
      snapElement({
        type: "table",
        name: `Masa ${i + 1}`,
        shape: "long_banquet",
        capacity,
        widthM: tableWidthM,
        heightM: tableHeightM,
        pos_x_m: centerHorizontally(roomWidthM, tableWidthM),
        pos_y_m: yM,
        rotation: 0,
      })
    );
  }

  return elements;
}

export function calculateTemplateLayout(
  config: TemplateLayoutConfig,
  roomWidthM: number,
  roomHeightM: number
): TemplateElement[] {
  const tableCount = Math.ceil(config.totalConfirmedGuests / config.guestsPerTable);

  switch (config.template) {
    case "ring_round":
      return buildRingRoundLayout(
        roomWidthM,
        roomHeightM,
        tableCount,
        config.guestsPerTable,
        config.spacing
      );
    case "ring_square":
      return buildRingSquareLayout(
        roomWidthM,
        roomHeightM,
        tableCount,
        config.guestsPerTable
      );
    case "banquet":
      return buildBanquetLayout(
        roomWidthM,
        roomHeightM,
        tableCount,
        config.guestsPerTable
      );
    default:
      return [];
  }
}
