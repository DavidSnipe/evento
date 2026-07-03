"use client";

import Image from "next/image";
import Link from "next/link";

import { EventCardActions } from "@/components/events/event-card-actions";
import {
  getEventCoverImage,
  getEventTypeEmoji,
  getEventTypeLabel,
} from "@/lib/events/event-types";
import type { EventListStats } from "@/lib/events/queries";
import { formatEventDate, getDaysUntil } from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/types/events";

type EventCardProps = {
  event: EventRow;
  stats?: EventListStats;
  isActive?: boolean;
  index?: number;
  onEdit?: (event: EventRow) => void;
};

function formatBudgetCompact(value: number): string {
  if (value >= 1000) {
    const compact = value / 1000;
    const formatted = compact >= 10 ? Math.round(compact) : Number(compact.toFixed(1));
    return `${formatted}k RON`;
  }
  if (value <= 0) return "0 RON";
  return `${value.toLocaleString("ro-RO")} RON`;
}

function formatDaysPill(days: number): string {
  if (days === 0) return "Astăzi";
  if (days === 1) return "1 zi";
  if (days > 0) return `${days} zile`;
  if (days === -1) return "Ieri";
  return `${Math.abs(days)} zile`;
}

export function EventCard({ event, stats, isActive, index = 0, onEdit }: EventCardProps) {
  const days = getDaysUntil(event.event_date);
  const formattedDate = formatEventDate(event.event_date);
  const delay = `${index * 50}ms`;
  const coverSrc = getEventCoverImage(event.event_type, event.cover_image_url);
  const typeLabel = getEventTypeLabel(event.event_type);
  const typeEmoji = getEventTypeEmoji(event.event_type);

  const guestsCount = stats?.guestsCount ?? 0;
  const tablesCount = stats?.tablesCount ?? 0;
  const budgetSpent = stats?.budgetSpent ?? 0;

  return (
    <div
      style={{ animationDelay: delay }}
      className={cn(
        "evento-card group/card relative flex flex-col overflow-hidden transition-all duration-250 ease-out animate-fade-in-up",
        isActive && "ring-2 ring-[var(--dash-accent)] ring-offset-2"
      )}
    >
      <Link
        href={`/dashboard/events/${event.id}`}
        className="relative block h-[180px] w-full overflow-hidden rounded-t-[16px] bg-[var(--dash-ivory)] transition-all duration-250 ease-out active:scale-[0.99]"
      >
        <Image
          src={coverSrc}
          alt={event.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.45) 100%)",
          }}
        />
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[var(--dash-text)] shadow-sm">
          <span aria-hidden>{typeEmoji}</span>
          {typeLabel}
        </span>
        {days !== null ? (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {formatDaysPill(days)}
          </span>
        ) : null}
      </Link>

      <div className="relative p-4">
        <div className="absolute right-3 top-3 z-20">
          <EventCardActions
            eventId={event.id}
            onEdit={onEdit ? () => onEdit(event) : undefined}
            className="bg-white/80 opacity-100 shadow-sm backdrop-blur-sm"
          />
        </div>

        <Link href={`/dashboard/events/${event.id}`} className="block pr-10">
          <h3 className="text-base font-semibold leading-tight text-[var(--dash-text)] truncate">
            {event.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[var(--dash-text-secondary)]">
            <span>{formattedDate ?? ro.events.detail.noDate}</span>
            {isActive ? (
              <span className="inline-flex items-center rounded-full bg-[var(--dash-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dash-accent-text)]">
                {ro.events.detail.active}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-[var(--dash-text-muted)]">
            {guestsCount} {ro.events.card.guests} · {tablesCount} {ro.events.card.tables} ·{" "}
            {formatBudgetCompact(budgetSpent)} {ro.events.card.budget}
          </p>
        </Link>
      </div>
    </div>
  );
}
