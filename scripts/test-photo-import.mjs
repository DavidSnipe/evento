/**
 * One-off test script for photo guest extraction.
 * Usage: node scripts/test-photo-import.mjs
 * Requires GEMINI_API_KEY in environment or .env.local
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

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
          name: { type: Type.STRING },
          confidence: { type: Type.STRING },
          tableHint: { type: Type.STRING },
          tagHints: { type: Type.ARRAY, items: { type: Type.STRING } },
          rawLine: { type: Type.STRING },
        },
        required: ["name", "confidence"],
        propertyOrdering: ["name", "confidence", "tableHint", "tagHints", "rawLine"],
      },
    },
  },
  required: ["guests"],
  propertyOrdering: ["guests"],
};

async function extractFromFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");
  const ai = new GoogleGenAI({});
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { inlineData: { mimeType: "image/png", data: base64 } },
      EXTRACTION_PROMPT,
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
    },
  });
  return response.text;
}

async function main() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("GEMINI_API_KEY missing — add it to .env.local to run live API tests.");
    process.exit(1);
  }

  const files = ["list-a.png", "list-b.png", "list-c.png"].map((name) =>
    path.join(root, "test-photos", name)
  );

  for (const file of files) {
    console.log("\n===", path.basename(file), "===");
    const text = await extractFromFile(file);
    console.log(text);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
