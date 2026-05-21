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
        "glass-panel block p-6 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/8 active:scale-[0.99] animate-fade-in-up",
        isActive && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            {getEventTypeLabel(event.event_type)}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold leading-tight">{event.title}</h3>
        </div>
        {days !== null ? (
          <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium">
            {formatDaysUntil(days)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          {formattedDate ?? ro.events.detail.noDate}
        </p>
        {event.venue ? (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </p>
        ) : null}
      </div>

      {isActive ? (
        <span className="mt-4 inline-block text-xs font-medium text-primary">
          {ro.events.detail.active}
        </span>
      ) : null}
    </Link>
  );
}
