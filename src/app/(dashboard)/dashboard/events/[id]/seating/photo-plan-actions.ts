"use server";

import { GoogleGenAI, Type } from "@google/genai";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import type { ExtractedFloorPlanElement } from "@/types/seating";

const GEMINI_MODEL = "gemini-2.5-flash";

const EXTRACTION_PROMPT = `You are an expert at reading event venue floor plans — both hand-drawn sketches and printed plans.

Your task: extract ALL elements from this floor plan image with PRECISE normalized positions.

═══════════════════════════════════════
STEP 1: IDENTIFY THE ROOM BOUNDARY
═══════════════════════════════════════
Find the outer walls or border of the venue. This defines your coordinate system:
- Top-left corner of room = (posX: 0.0, posY: 0.0)
- Bottom-right corner of room = (posX: 1.0, posY: 1.0)
- All positions are CENTER of each element, normalized to these room boundaries.

═══════════════════════════════════════
STEP 2: IDENTIFY ELEMENT TYPES
═══════════════════════════════════════

ROOM OBJECTS (large area elements, not for seating guests):
- Dance floor / Ring de dans / Pista: 
  - If CIRCULAR/OVAL shape → objectType: "dance_floor_round"
  - If SQUARE/RECTANGULAR shape → objectType: "dance_floor"
  - Typically in CENTER of room, large (widthNormalized: 0.25-0.45)
- Stage / Scenă / Podium:
  - If SEMICIRCULAR shape → objectType: "stage_semicircle", shape: "rectangular"
  - If RECTANGULAR shape → objectType: "stage", shape: "rectangular"
  - Typically at TOP (posY: 0.05-0.15) or BOTTOM of room
- DJ booth / DJ / Booth: objectType: "dj_booth" — small, usually in a corner
- Bar: objectType: "bar"
- Candy bar / Sweet table: objectType: "candy_bar"
- Photo booth: objectType: "photo_booth"
- Entrance / Intrare / Exit / Iesire: objectType: "entrance"

TABLES (elements for seating guests):
- Round/circular with number → shape: "round", elementType: "table"
- Rectangle with number → shape: "rectangular", elementType: "table"
- Long narrow rectangle → shape: "long_banquet"
- Heart-shaped OR labeled "Masa Mirilor"/"Bride Table"/"Head Table" → shape: "sweetheart", tableName: "Masa Mirilor"

═══════════════════════════════════════
STEP 3: EXTRACT PRECISE POSITIONS
═══════════════════════════════════════

For EACH element:
1. Find its CENTER point in the image
2. Calculate: posX_normalized = (center_x - room_left) / room_width
3. Calculate: posY_normalized = (center_y - room_top) / room_height
4. For room objects: also calculate widthNormalized and heightNormalized

CRITICAL: Tables must NEVER overlap room objects.
- If you detect a table that appears to be inside or very close to a room object: push its position to just outside the room object's boundary (add 0.05 normalized gap).
- Double-check: each table's position should be clearly OUTSIDE all room object bounding boxes.

═══════════════════════════════════════
STEP 4: EXTRACT LABELS AND CAPACITY
═══════════════════════════════════════

For each table:
- tableNumber: look for numbers ON the table shape or immediately adjacent (e.g. "5", "Masa 5", "Table 5" → tableNumber: 5)
- tableName: text labels that aren't numbers ("Masa Mirilor", "VIP", "Familia", "Head Table")
- capacity: number of seats if written ("8 pers", "10 locuri", "×8", "cap: 6" → capacity: 8)
- rawLabel: exact text string detected

═══════════════════════════════════════
STEP 5: ASSIGN CONFIDENCE
═══════════════════════════════════════
- "high": clearly visible, unambiguous shape, number legible
- "medium": visible but some uncertainty (overlapping elements, smudged text)
- "low": guessed from context (very faint, partially hidden, inferred from pattern)

═══════════════════════════════════════
TYPICAL WEDDING HALL LAYOUT (use as reference):
═══════════════════════════════════════
- Stage/Scenă: top center (posY: 0.05-0.12)
- DJ Booth: top corner (posX: 0.85-0.95, posY: 0.05-0.15)
- Bride's table / Masa Mirilor: center-top area, below stage (posY: 0.15-0.30)
- Dance floor / Ring: center of room (posX: 0.4-0.6, posY: 0.35-0.65)
- Guest tables: perimeter — left column, right column, bottom row
- Entrance / Intrare: bottom center (posY: 0.85-0.98)

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════
Return ONLY a valid JSON array of elements. No markdown, no explanation, no preamble.
Each element must have: elementType, shape, posX_normalized, posY_normalized, confidence.
Room objects must also have: objectType, widthNormalized, heightNormalized.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    elements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          elementType: {
            type: Type.STRING,
            description: '"table" for guest tables, "room_object" for fixed venue objects.',
          },
          shape: {
            type: Type.STRING,
            description:
              'Visual shape: "round", "rectangular", "square", "long_banquet", or "sweetheart".',
          },
          objectType: {
            type: Type.STRING,
            description:
              'For room_object only: dance_floor, dance_floor_round, stage, stage_semicircle, dj_booth, bar, candy_bar, photo_booth, entrance, sweet_table.',
          },
          tableNumber: {
            type: Type.NUMBER,
            description: "Numeric table label if detected (e.g. 5 from Masa 5).",
          },
          tableName: {
            type: Type.STRING,
            description: "Full table label if not a plain number (e.g. Masa Mirilor, VIP).",
          },
          capacity: {
            type: Type.NUMBER,
            description: "Seat count if written on the plan.",
          },
          posX_normalized: {
            type: Type.NUMBER,
            description: "Center X from 0 (left) to 1 (right) within room bounds.",
          },
          posY_normalized: {
            type: Type.NUMBER,
            description: "Center Y from 0 (top) to 1 (bottom) within room bounds.",
          },
          widthNormalized: {
            type: Type.NUMBER,
            description: "Optional width relative to room width (0–1).",
          },
          heightNormalized: {
            type: Type.NUMBER,
            description: "Optional height relative to room height (0–1).",
          },
          confidence: {
            type: Type.STRING,
            description: 'Legibility assessment: "high", "medium", or "low".',
          },
          rawLabel: {
            type: Type.STRING,
            description: "Exact text detected near this element.",
          },
        },
        required: ["elementType", "shape", "posX_normalized", "posY_normalized", "confidence"],
        propertyOrdering: [
          "elementType",
          "shape",
          "objectType",
          "tableNumber",
          "tableName",
          "capacity",
          "posX_normalized",
          "posY_normalized",
          "widthNormalized",
          "heightNormalized",
          "confidence",
          "rawLabel",
        ],
      },
    },
  },
  required: ["elements"],
  propertyOrdering: ["elements"],
} as const;

const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const ELEMENT_TYPES = new Set(["table", "room_object"]);
const SHAPES = new Set([
  "round",
  "rectangular",
  "square",
  "long_banquet",
  "sweetheart",
]);
const OBJECT_TYPES = new Set([
  "dance_floor",
  "dance_floor_round",
  "stage",
  "stage_semicircle",
  "dj_booth",
  "candy_bar",
  "photo_booth",
  "bar",
  "entrance",
  "sweet_table",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseExtractedFloorPlanElements(raw: unknown): ExtractedFloorPlanElement[] {
  const root =
    isRecord(raw) && Array.isArray(raw.elements)
      ? raw.elements
      : Array.isArray(raw)
        ? raw
        : null;

  if (!root) {
    throw new Error("Răspuns invalid de la serviciul AI.");
  }

  const elements: ExtractedFloorPlanElement[] = [];

  for (const item of root) {
    if (!isRecord(item)) continue;

    const elementTypeRaw =
      typeof item.elementType === "string" ? item.elementType.trim().toLowerCase() : "";
    const shapeRaw = typeof item.shape === "string" ? item.shape.trim().toLowerCase() : "";
    const confidenceRaw =
      typeof item.confidence === "string" ? item.confidence.trim().toLowerCase() : "";

    const posX = parseOptionalNumber(item.posX_normalized);
    const posY = parseOptionalNumber(item.posY_normalized);

    if (
      !ELEMENT_TYPES.has(elementTypeRaw) ||
      !SHAPES.has(shapeRaw) ||
      !CONFIDENCE_LEVELS.has(confidenceRaw) ||
      posX == null ||
      posY == null
    ) {
      continue;
    }

    const objectTypeRaw =
      typeof item.objectType === "string" ? item.objectType.trim().toLowerCase() : "";
    const objectType = OBJECT_TYPES.has(objectTypeRaw)
      ? (objectTypeRaw as NonNullable<ExtractedFloorPlanElement["objectType"]>)
      : undefined;

    const tableNumber = parseOptionalNumber(item.tableNumber);
    const tableName =
      typeof item.tableName === "string" && item.tableName.trim()
        ? item.tableName.trim()
        : undefined;
    const capacity = parseOptionalNumber(item.capacity);
    const widthNormalized = parseOptionalNumber(item.widthNormalized);
    const heightNormalized = parseOptionalNumber(item.heightNormalized);
    const rawLabel =
      typeof item.rawLabel === "string" && item.rawLabel.trim()
        ? item.rawLabel.trim()
        : undefined;

    elements.push({
      elementType: elementTypeRaw as ExtractedFloorPlanElement["elementType"],
      shape: shapeRaw as ExtractedFloorPlanElement["shape"],
      posX_normalized: clampNormalized(posX),
      posY_normalized: clampNormalized(posY),
      confidence: confidenceRaw as ExtractedFloorPlanElement["confidence"],
      ...(objectType ? { objectType } : {}),
      ...(tableNumber != null ? { tableNumber } : {}),
      ...(tableName ? { tableName } : {}),
      ...(capacity != null ? { capacity } : {}),
      ...(widthNormalized != null ? { widthNormalized: clampNormalized(widthNormalized) } : {}),
      ...(heightNormalized != null ? { heightNormalized: clampNormalized(heightNormalized) } : {}),
      ...(rawLabel ? { rawLabel } : {}),
    });
  }

  return elements;
}

function geminiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate") || message.includes("quota") || message.includes("429")) {
      return "Limita API a fost depășită. Încearcă din nou peste câteva minute.";
    }
    if (message.includes("api key") || message.includes("unauthorized") || message.includes("401")) {
      return "Cheia API Gemini nu este configurată corect.";
    }
  }
  return "Nu am putut analiza imaginea. Verifică conexiunea și încearcă din nou.";
}

export async function extractFloorPlanFromPhoto(
  eventId: string,
  imageBase64: string,
  mediaType: string
): Promise<{ elements?: ExtractedFloorPlanElement[]; error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return accessDenied;

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return { error: "Serviciul de scanare AI nu este configurat (GEMINI_API_KEY lipsește)." };
  }

  const normalizedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
  if (!normalizedBase64) {
    return { error: "Imaginea încărcată este goală sau invalidă." };
  }

  const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const mimeType = allowedMediaTypes.has(mediaType) ? mediaType : "image/jpeg";

  try {
    const ai = new GoogleGenAI({});

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            mimeType,
            data: normalizedBase64,
          },
        },
        EXTRACTION_PROMPT,
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return { error: "Modelul AI nu a returnat niciun rezultat pentru această imagine." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { error: "Răspunsul AI nu a putut fi interpretat. Încearcă o fotografie mai clară." };
    }

    const elements = parseExtractedFloorPlanElements(parsed);
    if (elements.length === 0) {
      return {
        error: "Nu s-au detectat elemente. Încearcă o altă fotografie.",
      };
    }

    return { elements };
  } catch (error) {
    console.error("[extractFloorPlanFromPhoto]", error);
    return { error: geminiErrorMessage(error) };
  }
}
