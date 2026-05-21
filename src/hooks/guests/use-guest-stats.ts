import { useMemo } from "react";
import type { GuestWithTable, RsvpStatus } from "@/types/guests";

export function useGuestStats(localGuests: GuestWithTable[]) {
  return useMemo(() => {
    let total = 0;
    let accepted = 0;
    let pending = 0;
    let declined = 0;
    let seated = 0;

    const countGuest = (g: { rsvp_status: RsvpStatus; table_id: string | null }) => {
      total++;
      if (g.rsvp_status === "accepted") accepted++;
      else if (g.rsvp_status === "pending") pending++;
      else if (g.rsvp_status === "declined") declined++;
      if (g.table_id) seated++;
    };

    localGuests.forEach((g) => {
      countGuest(g);
      g.subGuests?.forEach((sub) => {
        countGuest(sub);
      });
    });

    return { total, accepted, pending, declined, seated };
  }, [localGuests]);
}
