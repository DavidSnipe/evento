import type {
  CollaboratorRole,
  EventAccess,
  EventAccessRole,
  EventPermissions,
} from "@/types/collaboration";
import { COLLABORATOR_ROLES } from "@/types/collaboration";

const ROLE_RANK: Record<EventAccessRole, number> = {
  owner: 4,
  editor: 3,
  contributor: 2,
  viewer: 1,
};

export function hasMinRole(
  role: EventAccessRole | null | undefined,
  minimum: EventAccessRole
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function permissionsForRole(role: EventAccessRole): EventPermissions {
  const isOwner = role === "owner";
  const editorPlus = hasMinRole(role, "editor");
  const contributorPlus = hasMinRole(role, "contributor");

  return {
    canView: true,
    canEditTimeline: contributorPlus,
    canEditDaySchedule: contributorPlus,
    canEditSeating: contributorPlus,
    canEditGuests: contributorPlus,
    canEditBudget: editorPlus,
    canEditVendors: editorPlus,
    canEditRsvp: editorPlus,
    canEditInvitation: editorPlus,
    canManageCollaborators: isOwner,
    canDeleteEvent: isOwner,
  };
}

export function buildEventAccess(
  role: EventAccessRole | null,
  userId: string | null
): EventAccess | null {
  if (!role) return null;
  return {
    role,
    permissions: permissionsForRole(role),
    userId,
    isOwner: role === "owner",
  };
}

export function canEditTimeline(access: EventAccess | null): boolean {
  return access?.permissions.canEditTimeline ?? false;
}

export function canEditDaySchedule(access: EventAccess | null): boolean {
  return access?.permissions.canEditDaySchedule ?? false;
}

export function canEditSeating(access: EventAccess | null): boolean {
  return access?.permissions.canEditSeating ?? false;
}

export function canEditGuests(access: EventAccess | null): boolean {
  return access?.permissions.canEditGuests ?? false;
}

export function canEditBudget(access: EventAccess | null): boolean {
  return access?.permissions.canEditBudget ?? false;
}

export function canEditVendors(access: EventAccess | null): boolean {
  return access?.permissions.canEditVendors ?? false;
}

export function canEditRsvp(access: EventAccess | null): boolean {
  return access?.permissions.canEditRsvp ?? false;
}

export function canEditInvitation(access: EventAccess | null): boolean {
  return access?.permissions.canEditInvitation ?? false;
}

export function canManageCollaborators(access: EventAccess | null): boolean {
  return access?.permissions.canManageCollaborators ?? false;
}

export function canDeleteEvent(access: EventAccess | null): boolean {
  return access?.permissions.canDeleteEvent ?? false;
}

export function canAssignCollaboratorRole(
  access: EventAccess | null,
  role: CollaboratorRole
): boolean {
  if (!canManageCollaborators(access)) return false;
  return COLLABORATOR_ROLES.includes(role);
}
