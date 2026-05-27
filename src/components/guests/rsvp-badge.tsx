import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/types/guests";

const styles: Record<RsvpStatus, string> = {
  pending: "bg-[#FFF4E5] text-[#D97706] border border-[#FFE3B9]",
  accepted: "bg-[#E8F8EE] text-[#34C759] border border-[#C6F1D5]",
  declined: "bg-[#FFF0F0] text-[#FF3B30] border border-[#FFD2D2]",
  maybe: "bg-[#FEF7E7] text-[#B8860B] border-[#FDE68A]",
};

type RsvpBadgeProps = {
  status: RsvpStatus;
  className?: string;
};

export function RsvpBadge({ status, className }: RsvpBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[7px] px-2 py-0.5 text-[10.5px] font-semibold tracking-wide transition-all",
        styles[status],
        className
      )}
    >
      {ro.guests.rsvp[status]}
    </span>
  );
}
