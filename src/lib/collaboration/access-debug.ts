type AccessLogPayload = {
  decision: "granted" | "denied";
  source: string;
  eventId: string;
  userId?: string | null;
  userEmail?: string | null;
  role?: string | null;
  collaboratorStatus?: string | null;
  reason?: string;
  error?: string;
};

function accessDebugEnabled(): boolean {
  return (
    process.env.EVENTO_ACCESS_DEBUG === "true" ||
    process.env.NODE_ENV === "development"
  );
}

export function logAccessDecision(payload: AccessLogPayload): void {
  if (!accessDebugEnabled()) return;

  console.info(
    "[evento:access]",
    JSON.stringify({
      ...payload,
      at: new Date().toISOString(),
    })
  );
}
