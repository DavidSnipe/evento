/** Collaborator role (owner is derived from events.user_id). */
export type CollaboratorRole = "editor" | "contributor" | "viewer";

export type EventAccessRole = "owner" | CollaboratorRole;

export type CollaboratorInviteStatus = "pending" | "accepted" | "declined";

export type EventCollaboratorRow = {
  id: string;
  event_id: string;
  email: string;
  user_id: string | null;
  role: CollaboratorRole;
  status: CollaboratorInviteStatus;
  invite_token: string;
  invited_by: string | null;
  invited_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Owner + collaborators for settings UI. */
export type EventCollaboratorView = EventCollaboratorRow & {
  isOwner?: false;
};

export type EventOwnerView = {
  id: "owner";
  event_id: string;
  email: string;
  user_id: string;
  role: "owner";
  status: "accepted";
  isOwner: true;
  displayName?: string | null;
};

export type EventMemberView = EventOwnerView | EventCollaboratorView;

export const COLLABORATOR_ROLES: CollaboratorRole[] = [
  "editor",
  "contributor",
  "viewer",
];

export const COLLABORATOR_INVITE_STATUSES: CollaboratorInviteStatus[] = [
  "pending",
  "accepted",
  "declined",
];

export type EventPermissions = {
  canView: boolean;
  canEditTimeline: boolean;
  canEditDaySchedule: boolean;
  canEditSeating: boolean;
  canEditGuests: boolean;
  canEditBudget: boolean;
  canEditVendors: boolean;
  canEditRsvp: boolean;
  canEditInvitation: boolean;
  canManageCollaborators: boolean;
  canDeleteEvent: boolean;
};

export type EventAccess = {
  role: EventAccessRole;
  permissions: EventPermissions;
  userId: string | null;
  isOwner: boolean;
};

export type EventActivityAction =
  | "task_created"
  | "task_completed"
  | "task_updated"
  | "table_moved"
  | "guest_confirmed"
  | "guest_created"
  | "invitation_updated"
  | "collaborator_invited"
  | "collaborator_accepted"
  | "collaborator_removed"
  | "collaborator_role_changed"
  | "day_schedule_updated";

export type EventActivityRow = {
  id: string;
  event_id: string;
  actor_user_id: string | null;
  action: EventActivityAction | string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CollaboratorInviteInput = {
  email: string;
  role: CollaboratorRole;
};
