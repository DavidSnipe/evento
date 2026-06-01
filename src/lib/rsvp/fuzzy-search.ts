/** Normalize for Romanian-friendly search (strip diacritics). */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

/** 0 = exact, 1 = prefix, 2 = substring, 3 = fuzzy token, 99 = no match */
export function matchRank(haystack: string, query: string): number {
  const h = normalizeSearchText(haystack);
  const q = normalizeSearchText(query);
  if (!q || !h) return 99;
  if (h === q) return 0;
  if (h.startsWith(q)) return 1;
  if (h.includes(q)) return 2;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 99;

  let fuzzyHits = 0;
  for (const token of tokens) {
    if (token.length < 3) {
      if (h.includes(token)) fuzzyHits++;
      continue;
    }
    const words = h.split(/\s+/);
    const bestDist = Math.min(
      ...words.map((w) => levenshtein(w, token)),
      levenshtein(h.slice(0, Math.min(h.length, token.length + 2)), token)
    );
    const threshold = token.length <= 4 ? 1 : 2;
    if (bestDist <= threshold || h.includes(token)) fuzzyHits++;
  }

  if (fuzzyHits === tokens.length) return 3;
  return 99;
}
