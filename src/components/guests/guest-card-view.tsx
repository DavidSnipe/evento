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

type AvatarTheme = {
  bg: string;
  text: string;
};

// Generate premium gradient avatar colors from name
function getAvatarGradient(name: string): AvatarTheme {
  const gradients: AvatarTheme[] = [
    { bg: "from-[#FEF0F3] to-[#FCEAEF]", text: "text-[#B8516B] border border-[#FCE2E9]" }, // Blush / Rose
    { bg: "from-[#FAF3FB] to-[#F2DDF5]", text: "text-[#7030A0] border border-[#F2DDF5]" }, // Lavender
    { bg: "from-[#FFF9E6] to-[#FFEAA7]", text: "text-[#B8860B] border border-[#FCE49F]" }, // Gold
    { bg: "from-[#EEF6FC] to-[#D2E7F7]", text: "text-[#2B6CB0] border border-[#D2E7F7]" }, // Soft Blue
    { bg: "from-[#F2FAF3] to-[#D5EED8]", text: "text-[#2E7D32] border border-[#D5EED8]" }, // Soft Green
    { bg: "from-[#EDFAF8] to-[#CEF1ED]", text: "text-[#007A78] border border-[#CEF1ED]" }, // Teal
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
      <div className="py-16 text-center text-xs font-semibold text-text-subtle glass-panel border-dashed border-border-rose-18 p-8 rounded-[18px] bg-white/40">
        Nu s-au găsit invitați cu filtrele selectate.
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    const theme = getAvatarGradient(fullName);
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

    const shouldAnimate = index < 12;

    return (
      <div
        onClick={handleCardClick}
        style={shouldAnimate ? { animationDelay: `${index * 25}ms` } : undefined}
        className={cn(
          "group cursor-pointer rounded-[18px] bg-white/70 p-4 border border-border-rose-18 shadow-card transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-card-hover hover:border-border-rose-30 hover:-translate-y-0.5 active:scale-[0.98] focus-within:ring-2 focus-within:ring-[#B8516B]/20",
          shouldAnimate ? "animate-fade-in-up" : "opacity-100",
          isTemp && "pointer-events-none bg-gradient-to-r from-gray-50 via-pink-50/20 to-gray-50 bg-[length:200%_100%] animate-shimmer opacity-85",
          isSyncing && "animate-soft-pulse"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
                theme.bg, theme.text
              )}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground group-hover:text-[#B8516B] transition-colors duration-200">
                {fullName}
              </p>
              {guest.plus_one && (
                <p className="truncate text-[10px] font-medium text-text-secondary mt-0.5">
                  +1 {guest.plus_one_name ?? "Partener"}
                </p>
              )}
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
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
        {(guest.seating_tables || guest.group_name) && (
          <div className="mt-3.5 pt-3 border-t border-border-rose-18/30 flex items-center justify-between text-[9.5px] font-semibold text-text-subtle">
            {guest.seating_tables ? (
              <span className="inline-flex items-center rounded-[6px] bg-[#FEF0F3] px-1.5 py-0.5 text-[9px] font-bold text-[#B8516B] border border-[#FCEAEF] tracking-wide">
                Masa {guest.seating_tables.name}
              </span>
            ) : (
              <span className="text-[9px] font-medium text-text-faint">Fără masă</span>
            )}
            {guest.group_name && (
              <span className="truncate max-w-[120px] font-medium hover:text-[#B8516B] transition-colors" title={guest.group_name}>
                {guest.group_name}
              </span>
            )}
          </div>
        )}
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
