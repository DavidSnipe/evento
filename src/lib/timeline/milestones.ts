/**
 * Compute calendar date for a milestone relative to an event anchor date.
 * Uses fixed_date when set; otherwise subtracts months/weeks/days from anchor.
 */
export function computeMilestoneDate(
  anchorDateIso: string,
  milestone: {
    fixed_date: string | null;
    months_before: number | null;
    weeks_before: number | null;
    days_before: number | null;
  }
): string | null {
  if (milestone.fixed_date) return milestone.fixed_date;

  const hasOffset =
    milestone.months_before != null ||
    milestone.weeks_before != null ||
    milestone.days_before != null;
  if (!hasOffset) return null;

  const anchor = new Date(`${anchorDateIso}T12:00:00`);
  if (Number.isNaN(anchor.getTime())) return null;

  const result = new Date(anchor);

  if (milestone.months_before != null) {
    result.setMonth(result.getMonth() - milestone.months_before);
  }
  if (milestone.weeks_before != null) {
    result.setDate(result.getDate() - milestone.weeks_before * 7);
  }
  if (milestone.days_before != null) {
    result.setDate(result.getDate() - milestone.days_before);
  }

  return result.toISOString().slice(0, 10);
}

/** Resolve which anchor date to use per event segment (extensible for multi-date events). */
export function segmentAnchorDate(
  segment: "general" | "civil" | "religious" | "party",
  dates: {
    general: string | null;
    civil?: string | null;
    religious?: string | null;
    party?: string | null;
  }
): string | null {
  switch (segment) {
    case "civil":
      return dates.civil ?? dates.general;
    case "religious":
      return dates.religious ?? dates.general;
    case "party":
      return dates.party ?? dates.general;
    default:
      return dates.general;
  }
}
