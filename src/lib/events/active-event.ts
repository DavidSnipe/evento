import { cookies } from "next/headers";

export const ACTIVE_EVENT_COOKIE = "evento_active_event";

export async function getActiveEventId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_EVENT_COOKIE)?.value ?? null;
}

export async function setActiveEventId(eventId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_EVENT_COOKIE, eventId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveEventId() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_EVENT_COOKIE);
}
