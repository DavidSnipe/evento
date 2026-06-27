"use server";

import { GoogleGenAI, Type } from "@google/genai";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";

export type ExtractedGuest = {
  name: string;
  confidence: "high" | "medium" | "low";
  tableHint?: string;
  tagHints?: string[];
  rawLine?: string;
};

const GEMINI_MODEL = "gemini-2.5-flash";

const EXTRACTION_PROMPT = `You are reading a guest list image from a Romanian wedding or event.

Extract EVERY distinguishable name or guest entry from the image, even if handwriting is unclear. It is better to include an entry with low confidence than to skip it.

Rules:
- Romanian names may include diacritics (ă, â, î, ș, ț).
- Couples written together (joined by "&", "+", "și", or "si") must be ONE entry with the full combined name unchanged (e.g. "Popescu Andrei și Maria").
- If a table reference appears next to a name (e.g. "masa 5", "M5", "Masa 12", a circled number), put it in tableHint for that entry.
- If annotations appear near a name (VIP, Nași, Familie, Prieteni, Copii, Transport, Cazare, Vegetarian, Alergii, or similar), add them to tagHints.
- confidence must be "high" for clearly printed/legible text, "medium" for readable but uncertain handwriting, "low" for very unclear or guessed text.
- rawLine should contain the original text line as you read it from the image (for debugging).
- Return only the structured JSON object. No preamble, no commentary.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    guests: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Full guest name as written in the image.",
          },
          confidence: {
            type: Type.STRING,
            description: 'Legibility assessment: "high", "medium", or "low".',
          },
          tableHint: {
            type: Type.STRING,
            description: "Table number or name if written next to this guest.",
          },
          tagHints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Nearby annotations such as VIP, Nași, Vegetarian.",
          },
          rawLine: {
            type: Type.STRING,
            description: "Original text line as detected in the image.",
          },
        },
        required: ["name", "confidence"],
        propertyOrdering: ["name", "confidence", "tableHint", "tagHints", "rawLine"],
      },
    },
  },
  required: ["guests"],
  propertyOrdering: ["guests"],
} as const;

const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseExtractedGuests(raw: unknown): ExtractedGuest[] {
  const root = isRecord(raw) && Array.isArray(raw.guests) ? raw.guests : raw;
  if (!Array.isArray(root)) {
    throw new Error("Răspuns invalid de la serviciul AI.");
  }

  const guests: ExtractedGuest[] = [];

  for (const item of root) {
    if (!isRecord(item)) continue;

    const name = typeof item.name === "string" ? item.name.trim() : "";
    const confidence = typeof item.confidence === "string" ? item.confidence.trim().toLowerCase() : "";

    if (!name || !CONFIDENCE_LEVELS.has(confidence)) continue;

    const tableHint =
      typeof item.tableHint === "string" && item.tableHint.trim() ? item.tableHint.trim() : undefined;

    const tagHints = Array.isArray(item.tagHints)
      ? item.tagHints
          .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
          .map((tag) => tag.trim())
      : undefined;

    const rawLine =
      typeof item.rawLine === "string" && item.rawLine.trim() ? item.rawLine.trim() : undefined;

    guests.push({
      name,
      confidence: confidence as ExtractedGuest["confidence"],
      ...(tableHint ? { tableHint } : {}),
      ...(tagHints && tagHints.length > 0 ? { tagHints } : {}),
      ...(rawLine ? { rawLine } : {}),
    });
  }

  return guests;
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

export async function extractGuestsFromPhoto(
  eventId: string,
  imageBase64: string,
  mediaType: string
): Promise<{ guests?: ExtractedGuest[]; error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditGuests,
    "canEditGuests"
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

    const guests = parseExtractedGuests(parsed);
    if (guests.length === 0) {
      return {
        error: "Nu am detectat niciun nume în imagine. Încearcă o fotografie mai clară sau mai apropiată.",
      };
    }

    return { guests };
  } catch (error) {
    console.error("[extractGuestsFromPhoto]", error);
    return { error: geminiErrorMessage(error) };
  }
}
