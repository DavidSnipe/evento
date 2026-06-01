import type { PublicInvitationContent } from "@/lib/rsvp/invitation-content";
import type { InvitationContentDraft } from "@/types/invitation";

export function defaultsToDraftFromEvent(
  base: PublicInvitationContent,
  eventTitle: string
): InvitationContentDraft {
  return {
    coupleNames: base.coupleNames,
    parentsLine: base.parentsLine,
    godparentsLine: base.godparentsLine,
    invitationText: base.invitationText,
    closingMessage: "Vă așteptăm cu drag!",
    eventTitle,
    dateIso: base.dateIso,
    venue: base.venue,
    dressCode: base.dressCode,
    accommodationInfo: null,
    transportInfo: null,
    additionalNotes: null,
    schedule: base.schedule.map((item, i) => ({
      ...item,
      kind:
        i === 0 && base.eventType === "wedding"
          ? "religious"
          : i === 1 && base.eventType === "wedding"
            ? "party"
            : "other",
    })),
  };
}
