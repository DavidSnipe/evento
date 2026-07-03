import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";

import { getEventIllustration } from "@/components/dashboard/event-type-illustrations";
import { formatEventDate, formatDaysUntil, getDaysUntil } from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/types/events";

import { EventCardActions } from "./event-card-actions";

type EventCardProps = {
  event: EventRow;
  isActive?: boolean;
  index?: number;
};

export function EventCard({ event, isActive, index = 0 }: EventCardProps) {
  const days = getDaysUntil(event.event_date);
  const formattedDate = formatEventDate(event.event_date);
  const delay = `${index * 50}ms`;
  const Illustration = getEventIllustration(event.event_type);
  const hasCover = Boolean(event.cover_image_url);

  return (
    <div
      style={{ animationDelay: delay }}
      className={cn(
        "evento-card group/card relative overflow-hidden transition-all duration-250 ease-out animate-fade-in-up",
        isActive && "ring-2 ring-[var(--dash-accent)] ring-offset-2"
      )}
    >
      <EventCardActions
        eventId={event.id}
        className="absolute right-3 top-3 z-20"
      />

      <Link
        href={`/dashboard/events/${event.id}`}
        className="block overflow-hidden transition-all duration-250 ease-out active:scale-[0.99]"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[var(--dash-ivory)]">
          {hasCover ? (
            <Image
              src={event.cover_image_url!}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <Illustration className="h-full w-full" preserveAspectRatio="xMidYMid slice" />
          )}
          {days !== null ? (
            <span className="absolute right-3 top-12 z-10 rounded-full border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--dash-accent-text)] shadow-[var(--dash-shadow-sm)]">
              {formatDaysUntil(days)}
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="text-lg font-bold leading-tight text-[var(--dash-text)]">{event.title}</h3>

          <div className="mt-3 space-y-2 text-xs text-[var(--dash-text-secondary)]">
            <p className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />
              {formattedDate ?? ro.events.detail.noDate}
            </p>
            {event.venue ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />
                <span className="truncate">{event.venue}</span>
              </p>
            ) : null}
          </div>

          {isActive ? (
            <div className="mt-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--dash-sage)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dash-accent-text)]">
                {ro.events.detail.active}
              </span>
            </div>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
