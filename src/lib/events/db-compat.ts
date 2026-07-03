import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventType } from "@/types";

/** Canonical Romanian slugs → legacy English slugs stored before migration 039 */
export const CANONICAL_TO_LEGACY_EVENT_TYPE: Record<EventType, string> = {
  nunta: "wedding",
  cununie_civila: "civil_wedding",
  botez: "baptism",
  majorat: "major",
  zi_de_nastere: "birthday",
  aniversare: "anniversary",
  corporate: "corporate",
  eveniment_public: "public_event",
};

const NAME_FIELDS_038 = [
  "groom_first_name",
  "groom_last_name",
  "bride_first_name",
  "bride_last_name",
  "parent1_first_name",
  "parent1_last_name",
  "parent2_first_name",
  "parent2_last_name",
] as const;

const NAME_FIELDS_039 = ["child_first_name"] as const;

type DbError = { code?: string; message?: string };

function isSchemaMismatchError(error: DbError): boolean {
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "23514" ||
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("events_event_type_check") ||
    message.includes("Could not find") ||
    message.includes("column")
  );
}

function pickFields(
  source: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in source) picked[key] = source[key];
  }
  return picked;
}

function dedupePayloads(payloads: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const unique: Record<string, unknown>[] = [];
  for (const payload of payloads) {
    const key = JSON.stringify(payload);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(payload);
  }
  return unique;
}

export function buildEventWritePayloadVariants(
  eventType: EventType,
  fields: Record<string, unknown>
): Record<string, unknown>[] {
  const core: Record<string, unknown> = {
    title: fields.title,
    event_date: fields.event_date,
    venue: fields.venue,
    description: fields.description,
  };

  if (fields.user_id) {
    core.user_id = fields.user_id;
  }

  const name038 = pickFields(fields, NAME_FIELDS_038);
  const name039 = pickFields(fields, NAME_FIELDS_039);
  const legacyType = CANONICAL_TO_LEGACY_EVENT_TYPE[eventType];

  return dedupePayloads([
    { ...core, event_type: eventType, ...name038, ...name039 },
    { ...core, event_type: eventType, ...name038 },
    { ...core, event_type: legacyType, ...name038, ...name039 },
    { ...core, event_type: legacyType, ...name038 },
    { ...core, event_type: legacyType },
  ]);
}

export async function insertEventWithCompatibility(
  supabase: SupabaseClient,
  eventType: EventType,
  fields: Record<string, unknown>
) {
  const variants = buildEventWritePayloadVariants(eventType, fields);
  let lastError: DbError | null = null;

  for (const payload of variants) {
    const { data, error } = await supabase.from("events").insert(payload).select("id").single();
    if (!error) return { data, error: null };
    lastError = error;
    if (!isSchemaMismatchError(error)) break;
    console.warn("[insertEventWithCompatibility] retrying:", error.message);
  }

  if (lastError) {
    console.error("[insertEventWithCompatibility] failed:", lastError.message, lastError.code);
  }

  return { data: null, error: lastError };
}

export async function updateEventWithCompatibility(
  supabase: SupabaseClient,
  eventId: string,
  eventType: EventType,
  fields: Record<string, unknown>
) {
  const variants = buildEventWritePayloadVariants(eventType, fields);
  let lastError: DbError | null = null;

  for (const payload of variants) {
    const { error } = await supabase.from("events").update(payload).eq("id", eventId);
    if (!error) return { error: null };
    lastError = error;
    if (!isSchemaMismatchError(error)) break;
    console.warn("[updateEventWithCompatibility] retrying:", error.message);
  }

  if (lastError) {
    console.error("[updateEventWithCompatibility] failed:", lastError.message, lastError.code);
  }

  return { error: lastError };
}

/** Name fields persisted on events row (godparents are synced via guests table). */
export function eventNameFieldsForDb(
  nameFields: Record<string, string | null | undefined>
): Record<string, string | null> {
  const dbFields = { ...nameFields };
  delete dbFields.godparent1_name;
  delete dbFields.godparent2_name;
  return dbFields as Record<string, string | null>;
}
