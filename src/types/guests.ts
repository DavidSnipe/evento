export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";

export type TableShape = "round" | "rectangular" | "sweetheart";

export type GuestRow = {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  rsvp_status: RsvpStatus;
  plus_one: boolean;
  plus_one_name: string | null;
  group_name: string | null;
  dietary_notes: string | null;
  notes: string | null;
  table_id: string | null;
  seat_label: string | null;
  created_at: string;
  updated_at: string;
};

export type SeatingTableRow = {
  id: string;
  event_id: string;
  name: string;
  capacity: number;
  shape: TableShape;
  color_tag: string | null;
  notes: string | null;
  pos_x: number;
  pos_y: number;
  sort_order: number;
  created_at: string;
};

export type GuestWithTable = GuestRow & {
  seating_tables: { id: string; name: string } | null;
};

export const RSVP_STATUSES: RsvpStatus[] = [
  "pending",
  "accepted",
  "declined",
  "maybe",
];

export const TABLE_SHAPES: TableShape[] = [
  "round",
  "rectangular",
  "sweetheart",
];
