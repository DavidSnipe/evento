import {
  INVITATION_MEMBER_TYPES,
  INVITATION_STATUSES,
  RSVP_ATTENDANCE_STATUSES,
  type InvitationMemberType,
  type InvitationStatus,
  type RsvpAttendanceStatus,
} from "@/types/rsvp";

export type RsvpActionResult = { error?: string; success?: string };

export function parseInvitationStatus(value: string): InvitationStatus | null {
  return INVITATION_STATUSES.includes(value as InvitationStatus)
    ? (value as InvitationStatus)
    : null;
}

export function parseMemberType(value: string): InvitationMemberType | null {
  return INVITATION_MEMBER_TYPES.includes(value as InvitationMemberType)
    ? (value as InvitationMemberType)
    : null;
}

export function parseAttendanceStatus(value: string): RsvpAttendanceStatus | null {
  return RSVP_ATTENDANCE_STATUSES.includes(value as RsvpAttendanceStatus)
    ? (value as RsvpAttendanceStatus)
    : null;
}

export function requireDisplayName(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalPositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function isPlaceholderMemberType(type: InvitationMemberType): boolean {
  return type === "placeholder" || type === "unnamed_child";
}
