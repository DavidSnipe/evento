import {
  COLLABORATOR_ROLES,
  type CollaboratorInviteInput,
  type CollaboratorRole,
} from "@/types/collaboration";

export type CollaborationActionResult = {
  error?: string;
  success?: boolean;
  id?: string;
  inviteUrl?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCollaboratorEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseCollaboratorRole(value: string): CollaboratorRole | null {
  return COLLABORATOR_ROLES.includes(value as CollaboratorRole)
    ? (value as CollaboratorRole)
    : null;
}

export function validateCollaboratorInviteInput(
  input: CollaboratorInviteInput
): string | null {
  const email = normalizeCollaboratorEmail(input.email);
  if (!email || !EMAIL_RE.test(email)) return "Adresa de email este invalidă.";
  if (!parseCollaboratorRole(input.role)) return "Rol invalid.";
  return null;
}
