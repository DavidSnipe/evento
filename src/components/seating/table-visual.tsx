"use client";

import { Heart, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { TableWithGuests } from "@/lib/seating/queries";
import type { GuestWithTable } from "@/types/guests";

type TableVisualProps = {
  table: TableWithGuests;
  isSelected: boolean;
  isDropTarget: boolean;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getInitials(g: GuestWithTable): string {
  const f = g.first_name?.[0] ?? "";
  const l = g.last_name?.[0] ?? "";
  return g.last_name ? `${l}${f}`.toUpperCase() : f.toUpperCase() || "?";
}

/* ------------------------------------------------------------------ */
/*  Seat layout generators                                            */
/* ------------------------------------------------------------------ */

type SeatInfo = { guest: GuestWithTable | null; x: number; y: number };

function roundSeats(table: TableWithGuests, radius: number): SeatInfo[] {
  return Array.from({ length: table.capacity }, (_, i) => {
    const guest = table.guests[i] ?? null;
    const angle = (360 / table.capacity) * i - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      guest,
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  });
}

function rectangularSeats(table: TableWithGuests): SeatInfo[] {
  const half = Math.ceil(table.capacity / 2);
  const seats: SeatInfo[] = [];

  // top edge
  for (let i = 0; i < half; i++) {
    const guest = table.guests[i] ?? null;
    const x = ((i + 1) / (half + 1)) * 100 - 50; // spread -50..50 %
    seats.push({ guest, x, y: -50 });
  }

  // bottom edge
  for (let i = half; i < table.capacity; i++) {
    const guest = table.guests[i] ?? null;
    const idx = i - half;
    const bottomCount = table.capacity - half;
    const x = ((idx + 1) / (bottomCount + 1)) * 100 - 50;
    seats.push({ guest, x, y: 50 });
  }

  return seats;
}

/* ------------------------------------------------------------------ */
/*  Individual seat dot                                               */
/* ------------------------------------------------------------------ */

function Seat({ guest, x, y }: SeatInfo) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
    >
      {guest ? (
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 text-[10px] font-semibold text-primary-foreground shadow-sm ring-1 ring-white/60"
          title={guest.last_name ? `${guest.last_name} ${guest.first_name}` : guest.first_name}
        >
          {getInitials(guest)}
        </span>
      ) : (
        <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 bg-white/60" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rectangular seat (uses percentage-based positioning)              */
/* ------------------------------------------------------------------ */

function RectSeat({ guest, x, y }: SeatInfo) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        left: `calc(50% + ${x}%)`,
        top: `calc(50% + ${y}%)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {guest ? (
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 text-[10px] font-semibold text-primary-foreground shadow-sm ring-1 ring-white/60"
          title={guest.last_name ? `${guest.last_name} ${guest.first_name}` : guest.first_name}
        >
          {getInitials(guest)}
        </span>
      ) : (
        <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 bg-white/60" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Occupancy label                                                   */
/* ------------------------------------------------------------------ */

function OccupancyBadge({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const isFull = current >= max;
  return (
    <span
      className={cn(
        "mt-0.5 text-[10px] font-medium",
        isFull ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {current}/{max} {ro.seating.tableCard.seats}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function TableVisual({
  table,
  isSelected,
  isDropTarget,
  onClick,
  onDrop,
}: TableVisualProps) {
  const isFull = table.guests.length >= table.capacity;
  const isSweetheart = table.shape === "sweetheart";
  const isRound = table.shape === "round";
  const isRectangular = table.shape === "rectangular";

  /* ---- drag-and-drop handlers ---- */
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    onDrop(e);
  }

  /* ---- table surface ---- */
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        /* base */
        "group relative flex cursor-pointer flex-col items-center justify-center transition-all duration-300 select-none",

        /* shapes */
        isRound && "h-40 w-40 rounded-full",
        isRectangular && "h-32 w-48 rounded-2xl",
        isSweetheart && "h-44 w-44 rounded-full",

        /* glass surface */
        "border bg-white/80 shadow-md backdrop-blur-sm",

        /* default border */
        !isSelected && !isDropTarget && "border-border",

        /* hover */
        "hover:scale-[1.04] hover:shadow-lg",

        /* selected */
        isSelected &&
          "scale-105 ring-2 ring-primary shadow-lg border-primary/40",

        /* drop target */
        isDropTarget &&
          "ring-2 ring-accent border-dashed border-accent animate-pulse",

        /* full table — subtle red tint */
        isFull && !isSelected && !isDropTarget && "bg-destructive/5 border-destructive/30",

        /* sweetheart special glow */
        isSweetheart &&
          "border-amber-300/60 shadow-[0_0_24px_4px_rgba(210,170,100,0.18)]",
      )}
    >
      {/* ---- Sweetheart crown ---- */}
      {isSweetheart && (
        <Crown
          className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow"
          size={22}
        />
      )}

      {/* ---- Seat dots ---- */}
      {isRound || isSweetheart ? (
        <>
          {roundSeats(table, isSweetheart ? 78 : 70).map((seat, i) => (
            <Seat key={i} {...seat} />
          ))}
        </>
      ) : (
        <>
          {rectangularSeats(table).map((seat, i) => (
            <RectSeat key={i} {...seat} />
          ))}
        </>
      )}

      {/* ---- Center label ---- */}
      <div className="z-10 flex flex-col items-center gap-0.5 pointer-events-none">
        {isSweetheart && (
          <Heart
            className="mb-0.5 fill-amber-400/50 text-amber-500"
            size={16}
          />
        )}
        <span
          className={cn(
            "font-serif text-sm font-semibold leading-tight text-center",
            isSweetheart && "text-gradient-gold",
          )}
        >
          {table.name}
        </span>
        <OccupancyBadge current={table.guests.length} max={table.capacity} />
      </div>
    </div>
  );
}
