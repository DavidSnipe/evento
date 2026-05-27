import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";

import { getEventTypeLabel } from "@/lib/events/config";
import { formatEventDate, formatDaysUntil, getDaysUntil } from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/types/events";

type EventCardProps = {
  event: EventRow;
  isActive?: boolean;
  index?: number;
};

export function EventCard({ event, isActive, index = 0 }: EventCardProps) {
  const days = getDaysUntil(event.event_date);
  const formattedDate = formatEventDate(event.event_date);
  const delay = `${index * 50}ms`;

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      style={{ animationDelay: delay }}
      className={cn(
        "glass-panel hover-lift block p-6 transition-all duration-250 ease-out active:scale-[0.99] animate-fade-in-up border",
        isActive 
          ? "border-[#B8516B] bg-gradient-to-br from-[#FEF0F3]/30 to-[#FCE8EE]/10 shadow-[0_4px_20px_rgba(184,81,107,0.12)]" 
          : "border-[rgba(210,170,185,0.22)] bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8516B]">
            {getEventTypeLabel(event.event_type)}
          </p>
          <h3 className="mt-1 font-serif text-lg font-bold leading-tight text-[#1A0E14]">{event.title}</h3>
        </div>
        {days !== null ? (
          <span className="shrink-0 rounded-full bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border border-[rgba(210,170,185,0.18)] px-3 py-1 text-[11px] font-semibold text-[#B8516B]">
            {formatDaysUntil(days)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 text-xs text-text-secondary">
        <p className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
          {formattedDate ?? ro.events.detail.noDate}
        </p>
        {event.venue ? (
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
            <span className="truncate">{event.venue}</span>
          </p>
        ) : null}
      </div>

      {isActive ? (
        <div className="mt-4 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-confirmed-green animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8516B]">
            {ro.events.detail.active}
          </span>
        </div>
      ) : null}
    </Link>
  );
}
