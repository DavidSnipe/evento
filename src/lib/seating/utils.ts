import type { TableWithGuests } from "@/lib/seating/queries";

export interface TableMetadata {
  isLocked?: boolean;
  customShape?: "round" | "rectangular" | "square" | "long_banquet" | "sweetheart";
  objectType?: "dance_floor" | "dj_booth" | "stage" | "candy_bar" | "photo_booth" | "bar" | "entrance" | "sweet_table";
  /** Legacy pixel dimensions (kept in sync when saving meter fields) */
  width?: number;
  height?: number;
  /** Logical planner footprint in meters (incl. chair clearance for tables) */
  widthM?: number;
  heightM?: number;
  /** @deprecated Removed on save; use TABLE_FOOTPRINT_SPECS via resolveFootprintMeters */
  diameterM?: number;
  clearanceM?: number;
  rotation?: number; // 0, 90, 180, 270 deg
  userNotes?: string;
  notesText?: string;
}

export function parseMetadata(notes: string | null): TableMetadata {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (typeof parsed === "object" && parsed !== null) {
      // Check if metadata is nested inside a 'metadata' key, otherwise it's at root
      return parsed.metadata || parsed;
    }
  } catch {}
  return {};
}

export function getNotesText(notes: string | null): string {
  if (!notes) return "";
  try {
    const parsed = JSON.parse(notes);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed.userNotes ?? parsed.notesText ?? "";
    }
  } catch {
    return notes || "";
  }
  return "";
}

export function serializeNotes(currentNotes: string | null, newNotesText: string, newMetadata?: TableMetadata): string {
  let metadata: TableMetadata = {};
  try {
    if (currentNotes) {
      const parsed = JSON.parse(currentNotes);
      if (typeof parsed === "object" && parsed !== null) {
        metadata = parsed.metadata || parsed;
        // Clean out nested userNotes if present
        delete metadata.userNotes;
      }
    }
  } catch {}

  if (newMetadata) {
    metadata = { ...metadata, ...newMetadata };
  }

  return JSON.stringify({
    userNotes: newNotesText,
    ...metadata
  });
}

export function getTableOccupancy(table: TableWithGuests): {
  occupied: number;
  capacity: number;
  isFull: boolean;
} {
  const meta = parseMetadata(table.notes);
  if (meta.objectType) {
    return {
      occupied: 0,
      capacity: 0,
      isFull: false,
    };
  }

  let occupied = 0;
  for (const g of table.guests) {
    occupied += 1;
    // If it's a primary guest with a plus-one, add 1 only if the partner
    // does NOT have their own row at this table
    if (!g.parent_id && g.plus_one) {
      const hasCoupleRow = table.guests.some(
        (sub) => sub.parent_id === g.id && sub.relationship_type === "couple"
      );
      if (!hasCoupleRow) {
        occupied += 1;
      }
    }
  }

  return {
    occupied,
    capacity: table.capacity,
    isFull: occupied >= table.capacity,
  };
}


