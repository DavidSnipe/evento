import type { TableWithGuests } from "@/lib/seating/queries";

export function getTableOccupancy(table: TableWithGuests): {
  occupied: number;
  capacity: number;
  isFull: boolean;
} {
  const occupied = table.guests.reduce(
    (sum, g) => sum + 1 + (g.plus_one ? 1 : 0),
    0
  );
  return {
    occupied,
    capacity: table.capacity,
    isFull: occupied >= table.capacity,
  };
}
