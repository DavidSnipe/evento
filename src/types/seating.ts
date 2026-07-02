import type { TableShape } from "@/types/guests";

export const CURRENT_PLAN_SNAPSHOT_NAME = "Plan curent";

export type ExtractedFloorPlanElement = {
  elementType: "table" | "room_object";
  shape: "round" | "rectangular" | "square" | "long_banquet" | "sweetheart";
  objectType?:
    | "dance_floor"
    | "dance_floor_round"
    | "dj_booth"
    | "stage"
    | "stage_semicircle"
    | "candy_bar"
    | "photo_booth"
    | "bar"
    | "entrance"
    | "sweet_table";
  tableNumber?: number;
  tableName?: string;
  capacity?: number;
  posX_normalized: number;
  posY_normalized: number;
  widthNormalized?: number;
  heightNormalized?: number;
  confidence: "high" | "medium" | "low";
  rawLabel?: string;
};

export interface SnapshotTable {
  /** Original seating_tables.id (reference only, not reused on activate) */
  id: string;
  name: string;
  shape: TableShape | string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  sort_order: number;
  /** Full metadata JSON string (widthM, heightM, rotation, objectType, etc.) */
  notes: string;
  color_tag?: string | null;
}

export interface SeatingLayoutSnapshot {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  tables_json: SnapshotTable[];
  room_width_m: number;
  room_height_m: number;
  /** guestId → tableName */
  guest_assignments_json: Record<string, string>;
  thumbnail_data_url?: string | null;
  is_current_plan: boolean;
}
