import { patchMeterDimensions } from "@/lib/seating/table-spatial";
import { normalizeTableRotation } from "@/lib/seating/table-rotation";
import { serializeNotes, type TableMetadata } from "@/lib/seating/utils";

function parseNotesMeta(notes: string | null): TableMetadata {
  try {
    if (!notes) return {};
    const parsed = JSON.parse(notes);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed.metadata || parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

export function buildMetadataNotesUpdate(
  currentNotes: string | null,
  notesText: string,
  updates: Partial<TableMetadata>,
  tableShape: string
): string {
  const currentMeta = parseNotesMeta(currentNotes);
  const merged =
    updates.widthM != null ||
    updates.heightM != null ||
    updates.width != null ||
    updates.height != null
      ? patchMeterDimensions(
          { ...currentMeta, ...updates },
          {
            ...(updates.widthM != null ? { widthM: updates.widthM } : {}),
            ...(updates.heightM != null ? { heightM: updates.heightM } : {}),
          },
          currentMeta.customShape ?? tableShape
        )
      : { ...currentMeta, ...updates };
  const normalized = normalizeTableRotation(merged, tableShape);
  return serializeNotes(currentNotes, notesText, normalized);
}
