import crypto from "crypto";

/** URL-safe slug for /rsvp/{slug} */
export function generateRsvpSlug(byteLength = 6): string {
  return crypto.randomBytes(byteLength).toString("hex");
}
