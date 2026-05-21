export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";

export type TableShape = "round" | "rectangular" | "sweetheart";

export type GuestTag =
  | "vip"
  | "godparents"
  | "family"
  | "friends"
  | "kids"
  | "transport"
  | "accommodation"
  | "vegetarian"
  | "allergies";

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
  tags: string[];
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

export const GUEST_TAGS: {
  value: GuestTag;
  label: string;
  color: string;
  icon: string;
}[] = [
  { value: "vip", label: "VIP", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "✨" },
  { value: "godparents", label: "Nași", color: "bg-purple-100 text-purple-800 border-purple-200", icon: "💜" },
  { value: "family", label: "Familie", color: "bg-rose-100 text-rose-800 border-rose-200", icon: "👨‍👩‍👧" },
  { value: "friends", label: "Prieteni", color: "bg-sky-100 text-sky-800 border-sky-200", icon: "💙" },
  { value: "kids", label: "Copii", color: "bg-green-100 text-green-800 border-green-200", icon: "🧒" },
  { value: "transport", label: "Transport", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: "🚗" },
  { value: "accommodation", label: "Cazare", color: "bg-teal-100 text-teal-800 border-teal-200", icon: "🏨" },
  { value: "vegetarian", label: "Vegetarian", color: "bg-lime-100 text-lime-800 border-lime-200", icon: "🌿" },
  { value: "allergies", label: "Alergii", color: "bg-red-100 text-red-800 border-red-200", icon: "⚠️" },
];

export function getTagConfig(tag: string) {
  return GUEST_TAGS.find((t) => t.value === tag) ?? {
    value: tag as GuestTag,
    label: tag,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "🏷️",
  };
}
