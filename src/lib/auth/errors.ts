import { ro } from "@/lib/i18n/ro";

/** Map Supabase auth error messages to Romanian */
export function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return ro.auth.errors.invalidCredentials;
  }
  if (lower.includes("email not confirmed")) {
    return ro.auth.errors.emailNotConfirmed;
  }
  if (lower.includes("user already registered")) {
    return ro.auth.errors.userExists;
  }
  if (lower.includes("password") && lower.includes("weak")) {
    return ro.auth.errors.weakPassword;
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return ro.auth.errors.rateLimit;
  }

  return message;
}
