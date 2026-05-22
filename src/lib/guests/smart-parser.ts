/**
 * Smart Guest Text Parser
 * Parses free-form Romanian text into structured guest data.
 * Detects couples, families, groups, and guest counts.
 */

export type ParsedGuest = {
  id: string;
  firstName: string;
  lastName: string;
  type: "single" | "couple" | "family" | "group";
  count: number;
  plusOneName: string | null;
  groupName: string | null;
  tags: string[];
  confidence: "high" | "medium" | "low";
  originalText: string;
};

let idCounter = 0;
function nextId(): string {
  return `parsed-${Date.now()}-${++idCounter}`;
}

/**
 * Main entry point: parse a block of text into ParsedGuest[].
 * Each line is treated as a separate entry.
 */
export function parseGuestText(text: string): ParsedGuest[] {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedGuest[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    results.push(...parsed);
  }

  return results;
}

function parseLine(line: string): ParsedGuest[] {
  // Remove numbering like "1.", "1)", "1 -", etc.
  const cleaned = line.replace(/^\d+[\.\)\-\s]+/, "").trim();
  if (!cleaned) return [];

  // Detect godparents (nași/nasi)
  const isGodparents = /\bn[aă][sș]i\b/i.test(cleaned);
  const isFamily = /\bfamilia\b|\bfam\.?\b/i.test(cleaned);
  const isCouple = /\s[+și]+\s/i.test(cleaned) || /\s(și|si)\s/i.test(cleaned);
  const countMatch = cleaned.match(/(\d+)\s*(?:persoan[eă]|pers\.?|invita[tț]i|oameni)/i);
  const count = countMatch ? parseInt(countMatch[1], 10) : null;

  // Extract tags
  const tags: string[] = [];
  if (isGodparents) tags.push("godparents", "vip");
  if (isFamily) tags.push("family");
  if (/\bcopii?\b|\bkids?\b/i.test(cleaned)) tags.push("kids");
  if (/\bvip\b/i.test(cleaned)) tags.push("vip");
  if (/\btransport\b/i.test(cleaned)) tags.push("transport");
  if (/\bcazar[eă]\b/i.test(cleaned)) tags.push("accommodation");
  if (/\bvegetarian\b/i.test(cleaned)) tags.push("vegetarian");
  if (/\balerg/i.test(cleaned)) tags.push("allergies");
  if (/\bprieten/i.test(cleaned)) tags.push("friends");

  // Clean the name from detected keywords
  const namePart = cleaned
    .replace(/\b(familia|fam\.?)\b/gi, "")
    .replace(/\bn[aă][sș]i\b/gi, "")
    .replace(/(\d+)\s*(?:persoan[eă]|pers\.?|invita[tț]i|oameni)/gi, "")
    .replace(/\b(vip|transport|cazar[eă]|vegetarian|copii?|prieten[ie]?)\b/gi, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // COUPLE: "Maria + Andrei" or "Maria și Andrei"
  if (isCouple) {
    const parts = namePart.split(/\s*(?:[+]|și|si)\s*/i).filter(Boolean);
    if (parts.length === 2) {
      const [a, b] = parts.map((p) => p.trim());
      const [aFirst, aLast] = splitName(a);
      const [bFirst, bLast] = splitName(b);
      
      // Create as one entry with plus-one
      return [{
        id: nextId(),
        firstName: aFirst,
        lastName: aLast || bLast, // share last name if one is missing
        type: "couple",
        count: 2,
        plusOneName: `${bFirst}${bLast ? ` ${bLast}` : aLast ? ` ${aLast}` : ""}`,
        groupName: null,
        tags: tags.length > 0 ? tags : ["friends"],
        confidence: "high",
        originalText: line,
      }];
    }
  }

  // FAMILY: "Familia Popescu - 4 persoane"
  if (isFamily) {
    const [firstName, lastName] = splitName(namePart);
    const familyCount = count ?? 4; // default family size
    
    return [{
      id: nextId(),
      firstName: firstName || "Familia",
      lastName,
      type: "family",
      count: familyCount,
      plusOneName: familyCount > 1 ? `+${familyCount - 1} membri` : null,
      groupName: `Familia ${lastName || firstName}`,
      tags: tags.includes("family") ? tags : [...tags, "family"],
      confidence: count ? "high" : "medium",
      originalText: line,
    }];
  }

  // GODPARENTS: "Nași - 2 persoane"
  if (isGodparents && !namePart) {
    return [{
      id: nextId(),
      firstName: "Nași",
      lastName: "",
      type: "couple",
      count: count ?? 2,
      plusOneName: count && count > 1 ? `+${count - 1}` : null,
      groupName: "Nași",
      tags,
      confidence: count ? "high" : "medium",
      originalText: line,
    }];
  }

  // GROUP with count: "Colegi birou - 6 persoane"
  if (count && count > 1) {
    const [firstName, lastName] = splitName(namePart);
    return [{
      id: nextId(),
      firstName: firstName || "Grup",
      lastName,
      type: "group",
      count,
      plusOneName: `+${count - 1} persoane`,
      groupName: namePart || null,
      tags,
      confidence: "medium",
      originalText: line,
    }];
  }

  // SINGLE GUEST: "Maria Popescu"
  const [firstName, lastName] = splitName(namePart || cleaned);
  if (!firstName) return [];

  return [{
    id: nextId(),
    firstName,
    lastName,
    type: "single",
    count: 1,
    plusOneName: null,
    groupName: null,
    tags,
    confidence: namePart ? "high" : "low",
    originalText: line,
  }];
}

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts.slice(1).join(" "), parts[0]];
}
