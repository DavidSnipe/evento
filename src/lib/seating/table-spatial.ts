/**

 * Table / room-object dimensions in meters and pixel footprints.

 * Single source of truth for planner entity sizing (collision, layout, minimap).

 */



import type { TableMetadata } from "@/lib/seating/utils";

import {

  metersToPixels,

  PIXELS_PER_METER,

  STORAGE_PIXELS_PER_METER,

} from "@/lib/seating/spatial";



/** Figma-style render boost (visual only, not logical meters) */

export const VISUAL_RENDER_SCALE = 1.5;



/** Figma SVG outer extent (table + chairs) before footprint scaling */

export const ROUND_TABLE_VISUAL_PX = Math.round(116 * VISUAL_RENDER_SCALE);



/** Standard planner table shapes with official sizing */

export type PlannerTableShape =

  | "round"

  | "square"

  | "rectangular"

  | "long_banquet"

  | "sweetheart";



/** Physical = tabletop surface; footprint = full space including chair clearance */

export type TableFootprintSpec = {

  physicalWidthM: number;

  physicalHeightM: number;

  footprintWidthM: number;

  footprintHeightM: number;

};



/**

 * Official table sizing standards (meters).

 * widthM/heightM in stored metadata always mean footprint dimensions.

 */

export const TABLE_FOOTPRINT_SPECS: Record<PlannerTableShape, TableFootprintSpec> =

  {

    round: {

      physicalWidthM: 2,

      physicalHeightM: 2,

      footprintWidthM: 3,

      footprintHeightM: 3,

    },

    square: {

      physicalWidthM: 2,

      physicalHeightM: 2,

      footprintWidthM: 3,

      footprintHeightM: 3,

    },

    rectangular: {

      physicalWidthM: 2,

      physicalHeightM: 1,

      footprintWidthM: 2,

      footprintHeightM: 2,

    },

    long_banquet: {

      physicalWidthM: 3,

      physicalHeightM: 1,

      footprintWidthM: 3,

      footprintHeightM: 2,

    },

    sweetheart: {

      physicalWidthM: 1.7,

      physicalHeightM: 0.88,

      footprintWidthM: 1.7,

      footprintHeightM: 0.88,

    },

  };



/** @deprecated Use TABLE_FOOTPRINT_SPECS.round.footprintWidthM */

export const ROUND_TABLE_FOOTPRINT_M =

  TABLE_FOOTPRINT_SPECS.round.footprintWidthM;



/** Default room object sizes in meters (footprint = widthM × heightM) */

export const OBJECT_PRESETS_M: Record<

  string,

  { widthM: number; heightM: number; shape?: "round" | "rectangular" }

> = {

  dance_floor: { widthM: 3.2, heightM: 3.2, shape: "round" },

  stage: { widthM: 3.2, heightM: 1.2, shape: "rectangular" },

  dj_booth: { widthM: 1.6, heightM: 0.8, shape: "rectangular" },

  bar: { widthM: 1.8, heightM: 1, shape: "rectangular" },

  candy_bar: { widthM: 1.8, heightM: 1, shape: "rectangular" },

  photo_booth: { widthM: 1.6, heightM: 1, shape: "rectangular" },

  entrance: { widthM: 1.6, heightM: 0.5, shape: "rectangular" },

  sweet_table: { widthM: 2, heightM: 1, shape: "rectangular" },

};



export type FootprintMeters = {

  /** Logical planner footprint width (meters), incl. chair clearance where applicable */

  widthM: number;

  heightM: number;

  /** Tabletop / surface only — for future inner bounds & guides */

  physicalWidthM?: number;

  physicalHeightM?: number;

  /** @deprecated Legacy fields; ignored for standard table shapes */

  diameterM?: number;

  clearanceM?: number;

};



export type FootprintPixels = {

  widthPx: number;

  heightPx: number;

  footprintWidthPx: number;

  footprintHeightPx: number;

  physicalWidthPx?: number;

  physicalHeightPx?: number;

};



function specToFootprintMeters(spec: TableFootprintSpec): FootprintMeters {

  return {

    widthM: spec.footprintWidthM,

    heightM: spec.footprintHeightM,

    physicalWidthM: spec.physicalWidthM,

    physicalHeightM: spec.physicalHeightM,

  };

}



export function getTableShapeFootprintSpec(

  shape: string

): TableFootprintSpec | undefined {

  if (shape in TABLE_FOOTPRINT_SPECS) {

    return TABLE_FOOTPRINT_SPECS[shape as PlannerTableShape];

  }

  return undefined;

}



function resolveStandardTableShape(

  meta: TableMetadata,

  shape?: string

): PlannerTableShape | null {

  const customShape = meta.customShape ?? shape;

  if (!customShape) {

    if (shape === "round") return "round";

    if (shape === "rectangular") return "rectangular";

    return null;

  }

  if (customShape in TABLE_FOOTPRINT_SPECS) {

    return customShape as PlannerTableShape;

  }

  return null;

}



function legacyPixelsToFootprintMeters(

  meta: TableMetadata

): FootprintMeters | null {

  if (meta.width == null || meta.height == null) return null;

  return {

    widthM: meta.width / STORAGE_PIXELS_PER_METER,

    heightM: meta.height / STORAGE_PIXELS_PER_METER,

  };

}



/**

 * Resolve logical footprint in meters (canonical for tables, objects, collision).

 */

export function resolveFootprintMeters(

  meta: TableMetadata,

  shape?: string

): FootprintMeters {

  if (meta.objectType) {

    const preset = OBJECT_PRESETS_M[meta.objectType];

    if (preset) {

      return { widthM: preset.widthM, heightM: preset.heightM };

    }

    return { widthM: 2, heightM: 1 };

  }



  const tableShape = resolveStandardTableShape(meta, shape);

  if (tableShape) {

    return specToFootprintMeters(TABLE_FOOTPRINT_SPECS[tableShape]);

  }



  if (meta.widthM != null && meta.heightM != null) {

    return {

      widthM: meta.widthM,

      heightM: meta.heightM,

      physicalWidthM: meta.diameterM ?? undefined,

      physicalHeightM: undefined,

    };

  }



  const legacy = legacyPixelsToFootprintMeters(meta);

  if (legacy) {

    return legacy;

  }



  return specToFootprintMeters(TABLE_FOOTPRINT_SPECS.rectangular);

}



export function footprintMetersToPixels(

  fp: FootprintMeters,

  ppm: number = PIXELS_PER_METER

): FootprintPixels {

  const footprintWidthPx = metersToPixels(fp.widthM, ppm);

  const footprintHeightPx = metersToPixels(fp.heightM, ppm);



  return {

    widthPx: footprintWidthPx,

    heightPx: footprintHeightPx,

    footprintWidthPx,

    footprintHeightPx,

    physicalWidthPx:

      fp.physicalWidthM != null

        ? metersToPixels(fp.physicalWidthM, ppm)

        : undefined,

    physicalHeightPx:

      fp.physicalHeightM != null

        ? metersToPixels(fp.physicalHeightM, ppm)

        : undefined,

  };

}



export function getTableFootprintPx(

  meta: TableMetadata,

  shape?: string,

  ppm: number = PIXELS_PER_METER

): FootprintPixels {

  return footprintMetersToPixels(resolveFootprintMeters(meta, shape), ppm);

}



/** Future collision / layout: axis-aligned footprint bounds from top-left position */

export function getFootprintBoundsPx(

  posX: number,

  posY: number,

  footprint: FootprintPixels

): { left: number; top: number; right: number; bottom: number } {

  return {

    left: posX,

    top: posY,

    right: posX + footprint.footprintWidthPx,

    bottom: posY + footprint.footprintHeightPx,

  };

}



/** Future: inner tabletop bounds centered in footprint (aisles, alignment guides) */

export function getPhysicalBoundsPx(

  posX: number,

  posY: number,

  footprint: FootprintPixels

): { left: number; top: number; right: number; bottom: number } | null {

  if (

    footprint.physicalWidthPx == null ||

    footprint.physicalHeightPx == null

  ) {

    return null;

  }

  const padX = (footprint.footprintWidthPx - footprint.physicalWidthPx) / 2;

  const padY = (footprint.footprintHeightPx - footprint.physicalHeightPx) / 2;

  return {

    left: posX + padX,

    top: posY + padY,

    right: posX + padX + footprint.physicalWidthPx,

    bottom: posY + padY + footprint.physicalHeightPx,

  };

}



export function withMeterDimensions(

  meta: TableMetadata,

  fp: FootprintMeters

): TableMetadata {

  const next: TableMetadata = {

    ...meta,

    widthM: fp.widthM,

    heightM: fp.heightM,

    width: metersToPixels(fp.widthM, STORAGE_PIXELS_PER_METER),

    height: metersToPixels(fp.heightM, STORAGE_PIXELS_PER_METER),

  };

  delete next.diameterM;

  delete next.clearanceM;

  return next;

}



export function defaultTableMetadataForShape(

  customShape: PlannerTableShape | string,

  extra: Partial<TableMetadata> = {}

): TableMetadata {

  const spec = getTableShapeFootprintSpec(customShape);

  const base = { customShape: customShape as TableMetadata["customShape"], ...extra };

  if (!spec) {

    return withMeterDimensions(base, resolveFootprintMeters(base, customShape));

  }

  return withMeterDimensions(base, specToFootprintMeters(spec));

}



export function defaultRoundTableMetadata(): TableMetadata {

  return defaultTableMetadataForShape("round");

}



/** Square uses the same Figma art board as round (scaled to footprint) */
export const SQUARE_TABLE_VISUAL_PX = ROUND_TABLE_VISUAL_PX;

/** 2:1 Figma art board for rectangular / banquet tables */
export const RECT_TABLE_VISUAL_W_PX = ROUND_TABLE_VISUAL_PX;
export const RECT_TABLE_VISUAL_H_PX = Math.round(58 * VISUAL_RENDER_SCALE);

export function getFootprintVisualScale(
  footprintWidthPx: number,
  footprintHeightPx: number = footprintWidthPx,
  baseWidthPx: number = ROUND_TABLE_VISUAL_PX,
  baseHeightPx: number = baseWidthPx
): number {
  if (baseWidthPx <= 0 || baseHeightPx <= 0) return 1;
  return Math.min(
    footprintWidthPx / baseWidthPx,
    footprintHeightPx / baseHeightPx
  );
}

export function getRoundTableVisualScale(
  footprintWidthPx: number,
  visualBasePx: number = ROUND_TABLE_VISUAL_PX
): number {
  return getFootprintVisualScale(
    footprintWidthPx,
    footprintWidthPx,
    visualBasePx,
    visualBasePx
  );
}



export function defaultObjectMetadata(

  objectType: string

): TableMetadata {

  const preset = OBJECT_PRESETS_M[objectType] ?? { widthM: 2, heightM: 1 };

  return withMeterDimensions(

    { objectType: objectType as TableMetadata["objectType"] },

    { widthM: preset.widthM, heightM: preset.heightM }

  );

}



export function serializeTableMetadata(

  meta: TableMetadata,

  shape?: string

): string {

  const fp = resolveFootprintMeters(meta, shape ?? meta.customShape);

  return JSON.stringify(withMeterDimensions(meta, fp));

}



export function patchMeterDimensions(

  meta: TableMetadata,

  patch: Partial<FootprintMeters>,

  shape?: string

): TableMetadata {

  const fp = {

    ...resolveFootprintMeters(meta, shape ?? meta.customShape),

    ...patch,

  };

  return withMeterDimensions({ ...meta, ...patch }, fp);

}


