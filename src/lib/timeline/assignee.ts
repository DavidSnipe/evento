const ASSIGNEE_PREFIX = "[[assignee:";

/** Encode assignee in notes without a schema change. */
export function encodeAssigneeInNotes(
  assignee: string | null | undefined,
  notes: string | null | undefined
): string | null {
  const cleanNotes = stripAssigneeFromNotes(notes);
  const trimmedAssignee = assignee?.trim();
  if (!trimmedAssignee) return cleanNotes;
  const block = `${ASSIGNEE_PREFIX}${trimmedAssignee}]]`;
  return cleanNotes ? `${block}\n${cleanNotes}` : block;
}

export function parseAssigneeFromNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/^\[\[assignee:([^\]]+)\]\]/);
  return match?.[1]?.trim() || null;
}

export function stripAssigneeFromNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const stripped = notes.replace(/^\[\[assignee:[^\]]+\]\]\n?/, "").trim();
  return stripped.length > 0 ? stripped : null;
}
