/** Days until event date (negative = past). Null if no date set. */
export function getDaysUntil(eventDate: string | null): number | null {
  if (!eventDate) return null;

  const event = new Date(`${eventDate}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((event.getTime() - today.getTime()) / msPerDay);
}

export function formatEventDate(eventDate: string | null): string | null {
  if (!eventDate) return null;
  return new Date(`${eventDate}T12:00:00`).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDaysUntil(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Astăzi";
  if (days === 1) return "1 zi";
  if (days > 0) return `${days} zile`;
  if (days === -1) return "Ieri";
  return `Acum ${Math.abs(days)} zile`;
}
