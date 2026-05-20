import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/types/guests";

const styles: Record<RsvpStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
  maybe: "bg-amber-100 text-amber-700",
};

type RsvpBadgeProps = {
  status: RsvpStatus;
};

export function RsvpBadge({ status }: RsvpBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {ro.guests.rsvp[status]}
    </span>
  );
}
