import type { GuestRow } from "@/types/guests";

/** Household-level invitation lifecycle (organizer + future public flow). */
export type InvitationStatus =
  | "draft"
  | "sent"
  | "opened"
  | "partial"
  | "completed"
  | "expired";

/** Member role within a household invitation. */
export type InvitationMemberType =
  | "adult"
  | "child"
  | "unnamed_child"
  | "placeholder";

/** Per-member RSVP attendance (maps to guests.rsvp_status when linked). */
export type RsvpAttendanceStatus =
  | "pending"
  | "confirmed"
  | "maybe"
  | "declined";

export type InvitationHouseholdRow = {
  id: string;
  event_id: string;
  invite_token: string;
  display_name: string;
  invitation_status: InvitationStatus;
  template_id: string | null;
  max_seats: number | null;
  notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SeatingGroupRow = {
  id: string;
  household_id: string;
  display_name: string;
  locked_together: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RsvpUnitRow = {
  id: string;
  household_id: string;
  display_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type InvitationMemberRow = {
  id: string;
  household_id: string;
  guest_id: string | null;
  display_name: string;
  member_type: InvitationMemberType;
  seating_group_id: string | null;
  rsvp_unit_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RsvpResponseRow = {
  id: string;
  invitation_member_id: string;
  attendance_status: RsvpAttendanceStatus;
  attending_civil: boolean;
  attending_religious: boolean;
  attending_party: boolean;
  menu_choice: string | null;
  allergies: string | null;
  notes: string | null;
  preferred_seating_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvitationMemberWithResponse = InvitationMemberRow & {
  rsvp_response: RsvpResponseRow | null;
  guest: Pick<
    GuestRow,
    "id" | "first_name" | "last_name" | "rsvp_status" | "table_id" | "parent_id"
  > | null;
};

/** Full household graph for organizer tools and future public RSVP page. */
export type InvitationHouseholdBundle = InvitationHouseholdRow & {
  members: InvitationMemberWithResponse[];
  rsvp_units: RsvpUnitRow[];
  seating_groups: SeatingGroupRow[];
};

export const INVITATION_STATUSES: InvitationStatus[] = [
  "draft",
  "sent",
  "opened",
  "partial",
  "completed",
  "expired",
];

export const INVITATION_MEMBER_TYPES: InvitationMemberType[] = [
  "adult",
  "child",
  "unnamed_child",
  "placeholder",
];

export const RSVP_ATTENDANCE_STATUSES: RsvpAttendanceStatus[] = [
  "pending",
  "confirmed",
  "maybe",
  "declined",
];
