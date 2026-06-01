import crypto from "crypto";

/** URL-safe invite token (public RSVP identity; no auth required). */
export function generateInviteToken(byteLength = 16): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}
