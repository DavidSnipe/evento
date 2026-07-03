import type { PublicInvitationContent } from "@/lib/rsvp/invitation-content";
import { isWeddingType, normalizeEventType } from "@/lib/events/event-types";
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
    schedule: base.schedule.map((item, i) => {
      const normalized = normalizeEventType(base.eventType);
      const wedding = normalized ? isWeddingType(normalized) : false;
      return {
        ...item,
        kind:
          i === 0 && wedding
            ? "religious"
            : i === 1 && wedding
              ? "party"
              : "other",
      };
    }),
  };
}
