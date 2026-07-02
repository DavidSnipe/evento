"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { revalidatePath } from "next/cache";

import { denyUnlessEventPermission } from "@/lib/events/assert-event-access";
import { createClient } from "@/lib/supabase/server";
import type { GuestRow, SeatingTableRow } from "@/types/guests";

function revalidateSeating(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

const GEMINI_MODEL = "gemini-2.5-flash";

const SEATING_PROMPT = `You are an expert wedding seating planner. Assign unassigned guest parties to available tables for a Romanian wedding event.

RULES (must follow):
1. Never exceed table capacity (occupied + party size <= capacity)
2. Keep each party together at the same table (do not split parties)
3. Do not reassign already-seated guests
4. Prioritize keeping guests with the same group_name at the same or adjacent tables
5. Seat Nași (godparents, tags includes 'godparents') at prominent tables (low table numbers or first available)
6. Keep VIP guests (tags includes 'vip') together if possible
7. Keep family groups (same group_name) together
8. Seat children (relationship_type 'child') at tables with their family party

OPTIMIZATION GOALS (best effort):
- Distribute evenly across tables (avoid leaving one table with 1 guest and another with 7)
- Group guests with similar tags together when tables allow
- Keep couples and families at the same table (already enforced by party rule)

Return a JSON object with:
- 'assignments': array of { 'guestId': primaryGuestId, 'tableId': tableId } for each party placed
- 'unassigned': array of guestIds that could not be placed (no table has enough space)
- 'reasoning': 1-2 sentence summary of the strategy applied

Assign ALL parties if possible. If a party cannot fit anywhere, include in 'unassigned'.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          guestId: { type: Type.STRING },
          tableId: { type: Type.STRING },
        },
        required: ["guestId", "tableId"],
        propertyOrdering: ["guestId", "tableId"],
      },
    },
    unassigned: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    reasoning: { type: Type.STRING },
  },
  required: ["assignments", "unassigned", "reasoning"],
  propertyOrdering: ["assignments", "unassigned", "reasoning"],
} as const;

type PartyMemberPayload = {
  id: string;
  name: string;
  relationship: string;
};

type UnassignedPartyPayload = {
  id: string;
  name: string;
  partySize: number;
  groupName: string;
  tags: string[];
  relationshipType: string;
  partyMembers: PartyMemberPayload[];
};

type TablePayload = {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  available: number;
  shape: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatGuestName(guest: GuestRow): string {
  const first = guest.first_name.trim();
  const last = guest.last_name?.trim();
  if (last) return `${last} ${first}`;
  return first;
}

function isSeatingTable(table: SeatingTableRow): boolean {
  try {
    if (table.notes) {
      const meta = JSON.parse(table.notes);
      const actualMeta = meta.metadata || meta;
      if (actualMeta.objectType) return false;
      if (actualMeta.customShape === "sweetheart") return false;
    }
  } catch {
    /* ignore malformed notes */
  }
  if (table.shape === "sweetheart") return false;
  return true;
}

function calculatePartySize(party: GuestRow[]): number {
  let size = 0;
  for (const member of party) {
    size += 1;
    if (!member.parent_id && member.plus_one) {
      const hasCouple = party.some(
        (sub) => sub.parent_id === member.id && sub.relationship_type === "couple"
      );
      if (!hasCouple) size += 1;
    }
  }
  return size;
}

function calculateTableOccupancy(tableGuests: GuestRow[]): number {
  let occupied = 0;
  for (const g of tableGuests) {
    occupied += 1;
    if (!g.parent_id && g.plus_one) {
      const hasCoupleRow = tableGuests.some(
        (sub) => sub.parent_id === g.id && sub.relationship_type === "couple"
      );
      if (!hasCoupleRow) occupied += 1;
    }
  }
  return occupied;
}

function buildAlreadySeatedSummary(
  seatingTables: SeatingTableRow[],
  allGuests: GuestRow[]
): string {
  const lines: string[] = [];

  for (const table of seatingTables) {
    const tableGuests = allGuests.filter((g) => g.table_id === table.id);
    if (tableGuests.length === 0) continue;

    const primaries = tableGuests.filter((g) => !g.parent_id);
    const entries: string[] = [];

    for (const primary of primaries) {
      const party = [primary, ...allGuests.filter((sub) => sub.parent_id === primary.id)];
      const size = calculatePartySize(party);
      const rel = primary.relationship_type || "guest";
      entries.push(`${formatGuestName(primary)} (${rel}, ${size} seats)`);
    }

    for (const guest of tableGuests) {
      if (guest.parent_id) continue;
      if (primaries.some((p) => p.id === guest.id)) continue;
      entries.push(`${formatGuestName(guest)} (guest, 1 seat)`);
    }

    if (entries.length > 0) {
      lines.push(`${table.name}: ${entries.join(", ")}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No guests seated yet.";
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
  return "Nu am putut genera repartizarea AI. Verifică conexiunea și încearcă din nou.";
}

function parseAiSeatingResponse(raw: unknown): {
  assignments: { guestId: string; tableId: string }[];
  unassigned: string[];
  reasoning: string;
} {
  if (!isRecord(raw)) {
    throw new Error("Răspuns invalid de la serviciul AI.");
  }

  const assignments: { guestId: string; tableId: string }[] = [];
  if (Array.isArray(raw.assignments)) {
    for (const item of raw.assignments) {
      if (!isRecord(item)) continue;
      const guestId = typeof item.guestId === "string" ? item.guestId.trim() : "";
      const tableId = typeof item.tableId === "string" ? item.tableId.trim() : "";
      if (guestId && tableId) {
        assignments.push({ guestId, tableId });
      }
    }
  }

  const unassigned: string[] = [];
  if (Array.isArray(raw.unassigned)) {
    for (const id of raw.unassigned) {
      if (typeof id === "string" && id.trim()) {
        unassigned.push(id.trim());
      }
    }
  }

  const reasoning =
    typeof raw.reasoning === "string" && raw.reasoning.trim()
      ? raw.reasoning.trim()
      : "Repartizare generată automat.";

  return { assignments, unassigned, reasoning };
}

export async function aiAutoSeatGuests(eventId: string): Promise<{
  assignments?: { guestId: string; tableId: string }[];
  unassigned?: string[];
  reasoning?: string;
  error?: string;
}> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return accessDenied;

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return { error: "Serviciul de repartizare AI nu este configurat (GEMINI_API_KEY lipsește)." };
  }

  const supabase = await createClient();

  const [tablesRes, guestsRes] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("guests")
      .select("*")
      .eq("event_id", eventId)
      .neq("rsvp_status", "declined")
      .order("first_name", { ascending: true }),
  ]);

  const allTables = (tablesRes.data ?? []) as SeatingTableRow[];
  const allGuests = (guestsRes.data ?? []) as GuestRow[];

  const seatingTables = allTables.filter(isSeatingTable);

  if (seatingTables.length === 0) {
    return { error: "Nu există mese disponibile." };
  }

  const occupancyMap = new Map<string, number>();
  for (const table of seatingTables) {
    const tableGuests = allGuests.filter((g) => g.table_id === table.id);
    occupancyMap.set(table.id, calculateTableOccupancy(tableGuests));
  }

  const unassignedPrimary = allGuests.filter((g) => !g.table_id && !g.parent_id);

  if (unassignedPrimary.length === 0) {
    return { error: "Toți invitații sunt deja asignați." };
  }

  const partyMap = new Map<string, GuestRow[]>();
  for (const primary of unassignedPrimary) {
    partyMap.set(primary.id, [
      primary,
      ...allGuests.filter((sub) => sub.parent_id === primary.id),
    ]);
  }

  const partySizeMap = new Map<string, number>();
  for (const [id, party] of partyMap) {
    partySizeMap.set(id, calculatePartySize(party));
  }

  const unassignedParties: UnassignedPartyPayload[] = unassignedPrimary.map((primary) => {
    const party = partyMap.get(primary.id)!;
    const members = party
      .filter((m) => m.id !== primary.id)
      .map((m) => ({
        id: m.id,
        name: formatGuestName(m),
        relationship: m.relationship_type || "guest",
      }));

    return {
      id: primary.id,
      name: formatGuestName(primary),
      partySize: partySizeMap.get(primary.id) ?? 1,
      groupName: party.find((m) => m.group_name)?.group_name || "",
      tags: primary.tags ?? [],
      relationshipType: primary.relationship_type || "guest",
      partyMembers: members,
    };
  });

  const tablesPayload: TablePayload[] = seatingTables
    .map((table) => {
      const occupied = occupancyMap.get(table.id) ?? 0;
      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        occupied,
        available: Math.max(0, table.capacity - occupied),
        shape: table.shape,
      };
    })
    .filter((table) => table.available > 0);

  const alreadySeatedSummary = buildAlreadySeatedSummary(seatingTables, allGuests);

  if (tablesPayload.length === 0) {
    return { error: "Nu există locuri disponibile." };
  }

  const fullPrompt = `${SEATING_PROMPT}

TABLES (only tables with remaining capacity):
${JSON.stringify(tablesPayload, null, 2)}

UNASSIGNED PARTIES (primary guest + their party):
${JSON.stringify(unassignedParties, null, 2)}

ALREADY SEATED (for context — don't reassign these):
${alreadySeatedSummary}`;

  let aiResult: ReturnType<typeof parseAiSeatingResponse>;
  try {
    const ai = new GoogleGenAI({});

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: fullPrompt }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return { error: "Modelul AI nu a returnat niciun rezultat." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { error: "Răspunsul AI nu a putut fi interpretat. Încearcă din nou." };
    }

    aiResult = parseAiSeatingResponse(parsed);
  } catch (error) {
    console.error("[aiAutoSeatGuests]", error);
    return { error: geminiErrorMessage(error) };
  }

  const unassignedPartyIds = new Set(partyMap.keys());
  const tableIds = new Set(seatingTables.map((t) => t.id));
  const assignedPrimaryIds = new Set<string>();
  const finalAssignments: { guestId: string; tableId: string }[] = [];
  const simulatedOccupancy = new Map(occupancyMap);

  for (const { guestId, tableId } of aiResult.assignments) {
    if (assignedPrimaryIds.has(guestId)) continue;
    if (!unassignedPartyIds.has(guestId)) continue;
    if (!tableIds.has(tableId)) continue;

    const party = partyMap.get(guestId)!;
    const size = partySizeMap.get(guestId) ?? calculatePartySize(party);
    const table = seatingTables.find((t) => t.id === tableId);
    if (!table) continue;

    const occupied = simulatedOccupancy.get(tableId) ?? 0;
    if (table.capacity - occupied < size) continue;

    assignedPrimaryIds.add(guestId);
    for (const member of party) {
      finalAssignments.push({ guestId: member.id, tableId });
    }
    simulatedOccupancy.set(tableId, occupied + size);
  }

  const unassigned = [...unassignedPartyIds].filter((id) => !assignedPrimaryIds.has(id));

  for (const id of aiResult.unassigned) {
    if (unassignedPartyIds.has(id) && !assignedPrimaryIds.has(id) && !unassigned.includes(id)) {
      unassigned.push(id);
    }
  }

  return {
    assignments: finalAssignments,
    unassigned,
    reasoning: aiResult.reasoning,
  };
}

export async function commitAiSeatAssignments(
  eventId: string,
  assignments: { guestId: string; tableId: string }[]
): Promise<{ count: number; error?: string }> {
  const accessDenied = await denyUnlessEventPermission(
    eventId,
    (p) => p.canEditSeating,
    "canEditSeating"
  );
  if (accessDenied) return { count: 0, error: accessDenied.error };

  if (assignments.length === 0) {
    return { count: 0 };
  }

  const supabase = await createClient();
  const guestIds = [...new Set(assignments.map((a) => a.guestId))];
  const tableIds = [...new Set(assignments.map((a) => a.tableId))];

  const [guestsRes, tablesRes] = await Promise.all([
    supabase.from("guests").select("id").eq("event_id", eventId).in("id", guestIds),
    supabase
      .from("seating_tables")
      .select("id")
      .eq("event_id", eventId)
      .in("id", tableIds),
  ]);

  if (guestsRes.error || tablesRes.error) {
    return { count: 0, error: "Nu am putut valida asignările." };
  }

  const validGuestIds = new Set((guestsRes.data ?? []).map((g) => g.id));
  const validTableIds = new Set((tablesRes.data ?? []).map((t) => t.id));

  const validAssignments = assignments.filter(
    (a) => validGuestIds.has(a.guestId) && validTableIds.has(a.tableId)
  );

  if (validAssignments.length === 0) {
    return { count: 0, error: "Nicio asignare validă de salvat." };
  }

  const results = await Promise.all(
    validAssignments.map((a) =>
      supabase
        .from("guests")
        .update({ table_id: a.tableId })
        .eq("id", a.guestId)
        .eq("event_id", eventId)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { count: 0, error: "Nu am putut salva asignările." };
  }

  revalidateSeating(eventId);
  return { count: validAssignments.length };
}
