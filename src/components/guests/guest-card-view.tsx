"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { RsvpPill } from "@/components/guests/rsvp-pill";
import { TagBadge } from "@/components/guests/tag-badge";
import type { GuestWithTable, RsvpStatus } from "@/types/guests";

type GuestCardViewProps = {
  guests: GuestWithTable[];
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onSelectGuest: (guest: GuestWithTable) => void;
  syncingIds: Set<string>;
};

// Generate gradient avatar colors from name
function getAvatarGradient(name: string): string {
  const gradients = [
    "from-rose-300 to-pink-400",
    "from-violet-300 to-purple-400",
    "from-sky-300 to-blue-400",
    "from-emerald-300 to-green-400",
    "from-amber-300 to-orange-400",
    "from-teal-300 to-cyan-400",
    "from-fuchsia-300 to-pink-400",
    "from-indigo-300 to-violet-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(firstName: string, lastName: string | null): string {
  const f = firstName.charAt(0).toUpperCase();
  const l = lastName ? lastName.charAt(0).toUpperCase() : "";
  return lastName ? `${l}${f}` : f;
}

export function GuestCardView({
  guests,
  onRsvpChange,
  onSelectGuest,
  syncingIds,
}: GuestCardViewProps) {
  if (guests.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Nu s-au găsit invitați cu filtrele selectate.
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {guests.map((guest, index) => (
        <GuestCard
          key={guest.id}
          guest={guest}
          index={index}
          isSyncing={syncingIds.has(guest.id)}
          onRsvpChange={onRsvpChange}
          onSelectGuest={onSelectGuest}
        />
      ))}
    </div>
  );
}

// ── Memoized Guest Card ──
type GuestCardProps = {
  guest: GuestWithTable;
  isSyncing: boolean;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onSelectGuest: (guest: GuestWithTable) => void;
  index: number;
};

const GuestCard = React.memo(
  function GuestCard({ guest, isSyncing, onRsvpChange, onSelectGuest, index }: GuestCardProps) {
    const fullName = guest.last_name ? `${guest.last_name} ${guest.first_name}` : guest.first_name;
    const gradient = getAvatarGradient(fullName);
    const initials = getInitials(guest.first_name, guest.last_name);

    const isTemp = guest.id.startsWith("temp-");

    const handleRsvpChangeCallback = useCallback(
      (s: RsvpStatus) => {
        onRsvpChange(guest.id, s);
      },
      [guest.id, onRsvpChange]
    );

    const handleCardClick = useCallback(() => {
      if (!isTemp) {
        onSelectGuest(guest);
      }
    }, [isTemp, guest, onSelectGuest]);

    if (process.env.NODE_ENV === "development") {
      console.log(`[GuestCard] Rendered guest: ${guest.first_name} ${guest.last_name || ""}`);
    }

    const shouldAnimate = index < 10;

    return (
      <div
        onClick={handleCardClick}
        style={shouldAnimate ? { animationDelay: `${index * 30}ms` } : undefined}
        className={cn(
          "group cursor-pointer rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-border/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]",
          shouldAnimate ? "animate-fade-in-up" : "opacity-100",
          isTemp && "pointer-events-none bg-gradient-to-r from-gray-50 via-pink-50/30 to-gray-50 bg-[length:200%_100%] animate-shimmer opacity-85",
          isSyncing && "animate-soft-pulse"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm",
                gradient
              )}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {fullName}
              </p>
              {guest.plus_one && (
                <p className="truncate text-[11px] text-muted-foreground">
                  +1 {guest.plus_one_name ?? ""}
                </p>
              )}
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <RsvpPill
              status={guest.rsvp_status}
              onChange={handleRsvpChangeCallback}
              readonly={isTemp}
              isSyncing={isSyncing}
            />
          </div>
        </div>

        {/* Tags */}
        {(guest.tags ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(guest.tags ?? []).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        {/* Bottom info */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          {guest.seating_tables && (
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-600">
              {guest.seating_tables.name}
            </span>
          )}
          {guest.group_name && (
            <span className="truncate">{guest.group_name}</span>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isSyncing === next.isSyncing &&
      prev.guest.id === next.guest.id &&
      prev.guest.first_name === next.guest.first_name &&
      prev.guest.last_name === next.guest.last_name &&
      prev.guest.rsvp_status === next.guest.rsvp_status &&
      prev.guest.table_id === next.guest.table_id &&
      prev.guest.tags?.join(",") === next.guest.tags?.join(",") &&
      prev.guest.subGuests?.length === next.guest.subGuests?.length
    );
  }
);
