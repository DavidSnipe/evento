import type { RsvpStatus } from "@/types/guests";
import type { RsvpAttendanceStatus } from "@/types/rsvp";

/** Map RSVP response attendance to legacy per-guest rsvp_status column. */
export function attendanceToGuestRsvpStatus(
  status: RsvpAttendanceStatus
): RsvpStatus {
  switch (status) {
    case "confirmed":
      return "accepted";
    case "declined":
      return "declined";
    case "maybe":
      return "maybe";
    default:
      return "pending";
  }
}

/**
 * Derive household invitation_status from member responses.
 * Used after partial or full RSVP updates.
 */
export function deriveHouseholdInvitationStatus(
  statuses: RsvpAttendanceStatus[]
): "draft" | "partial" | "completed" {
  if (statuses.length === 0) return "draft";
  const answered = statuses.filter((s) => s !== "pending");
  if (answered.length === 0) return "draft";
  if (answered.length < statuses.length) return "partial";
  return "completed";
}
