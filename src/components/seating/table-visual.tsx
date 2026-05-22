"use client";

import { useState } from "react";
import {
  Heart,
  Crown,
  Lock,
  Music,
  Sliders,
  Mic,
  GlassWater,
  Cake,
  Camera,
  DoorOpen,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { TableWithGuests } from "@/lib/seating/queries";
import type { GuestWithTable } from "@/types/guests";
import { parseMetadata, getTableOccupancy } from "@/lib/seating/utils";

type TableVisualProps = {
  table: TableWithGuests;
  isSelected: boolean;
  isDropTarget: boolean;
  isHovered?: boolean;
  isValidDrop?: boolean;
  validationReason?: string;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  scale?: number;
};

interface VirtualGuest {
  id: string;
  first_name: string;
  last_name: string;
  parent_id?: string;
  isVirtual: boolean;
}

type VisualGuest = GuestWithTable | VirtualGuest;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getVisualGuests(table: TableWithGuests): VisualGuest[] {
  const list: VisualGuest[] = [];
  for (const g of table.guests) {
    list.push(g);
    if (!g.parent_id && g.plus_one) {
      const hasCoupleRow = table.guests.some(
        (sub) => sub.parent_id === g.id && sub.relationship_type === "couple"
      );
      if (!hasCoupleRow) {
        list.push({
          id: `virtual-plus-one-${g.id}`,
          first_name: "+1",
          last_name: "",
          parent_id: g.id,
          isVirtual: true,
        });
      }
    }
  }
  return list;
}

function getInitials(g: VisualGuest): string {
  if ("isVirtual" in g && g.isVirtual) return "+1";
  const f = g.first_name?.[0] ?? "";
  const l = g.last_name?.[0] ?? "";
  return g.last_name ? `${l}${f}`.toUpperCase() : f.toUpperCase() || "?";
}

/* ------------------------------------------------------------------ */
/*  Seat layout generators                                            */
/* ------------------------------------------------------------------ */

type SeatInfo = { guest: VisualGuest | null; x: number; y: number };

function roundSeats(table: TableWithGuests, radius: number): SeatInfo[] {
  const visualGuests = getVisualGuests(table);
  return Array.from({ length: table.capacity }, (_, i) => {
    const guest = visualGuests[i] ?? null;
    const angle = (360 / table.capacity) * i - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      guest,
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  });
}

function sweetheartSeats(table: TableWithGuests, radius: number): SeatInfo[] {
  const visualGuests = getVisualGuests(table);
  return Array.from({ length: table.capacity }, (_, i) => {
    const guest = visualGuests[i] ?? null;
    let angle = -90;
    if (table.capacity > 1) {
      const startAngle = -115;
      const endAngle = -65;
      angle = startAngle + ((endAngle - startAngle) / (table.capacity - 1)) * i;
    }
    const rad = (angle * Math.PI) / 180;
    return {
      guest,
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  });
}

function rectangularSeats(table: TableWithGuests): SeatInfo[] {
  const visualGuests = getVisualGuests(table);
  const half = Math.ceil(table.capacity / 2);
  const seats: SeatInfo[] = [];

  // top edge (y = -50%)
  for (let i = 0; i < half; i++) {
    const guest = visualGuests[i] ?? null;
    const x = half === 1 ? 0 : ((i + 0.5) / half) * 90 - 45; // spread -45..45%
    seats.push({ guest, x, y: -50 });
  }

  // bottom edge (y = 50%)
  for (let i = half; i < table.capacity; i++) {
    const guest = visualGuests[i] ?? null;
    const idx = i - half;
    const bottomCount = table.capacity - half;
    const x = bottomCount === 1 ? 0 : ((idx + 0.5) / bottomCount) * 90 - 45;
    seats.push({ guest, x, y: 50 });
  }

  return seats;
}

function squareSeats(table: TableWithGuests): SeatInfo[] {
  const visualGuests = getVisualGuests(table);
  const seats: SeatInfo[] = [];
  const capacity = table.capacity;
  
  // Distribute seats to 4 sides: top, right, bottom, left
  const sides: (VisualGuest | null)[][] = [[], [], [], []];
  for (let i = 0; i < capacity; i++) {
    sides[i % 4].push(visualGuests[i] ?? null);
  }

  // top side (y = -50%)
  sides[0].forEach((guest, idx) => {
    const count = sides[0].length;
    const x = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x, y: -50 });
  });

  // right side (x = 50%)
  sides[1].forEach((guest, idx) => {
    const count = sides[1].length;
    const y = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x: 50, y });
  });

  // bottom side (y = 50%)
  sides[2].forEach((guest, idx) => {
    const count = sides[2].length;
    const x = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x, y: 50 });
  });

  // left side (x = -50%)
  sides[3].forEach((guest, idx) => {
    const count = sides[3].length;
    const y = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x: -50, y });
  });

  return seats;
}

/* ------------------------------------------------------------------ */
/*  Seat dot renderer (absolute coordinates)                         */
/* ------------------------------------------------------------------ */

function Seat({ guest, x, y, isPercent }: SeatInfo & { isPercent?: boolean }) {
  return (
    <div
      className="absolute flex items-center justify-center pointer-events-auto"
      style={{
        width: 28,
        height: 28,
        left: isPercent ? `calc(50% + ${x}%)` : "50%",
        top: isPercent ? `calc(50% + ${y}%)` : "50%",
        transform: isPercent
          ? "translate(-50%, -50%)"
          : `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
    >
      {guest ? (
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/95 text-[10px] font-semibold text-primary-foreground shadow-md ring-2 ring-white hover:scale-115 transition-transform duration-200 cursor-help animate-in zoom-in-50 duration-300 ease-out"
          title={guest.last_name ? `${guest.last_name} ${guest.first_name}` : guest.first_name}
        >
          {getInitials(guest)}
        </span>
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 bg-white/70 shadow-sm" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Occupancy Badge                                                   */
/* ------------------------------------------------------------------ */

function OccupancyBadge({
  current,
  max,
  scale = 1.0,
}: {
  current: number;
  max: number;
  scale?: number;
}) {
  if (scale < 0.35) return null;
  const isFull = current >= max;
  const label = scale >= 0.8 ? ` ${ro.seating.tableCard.seats}` : "";
  return (
    <span
      className={cn(
        "mt-0.5 text-[10px] font-medium tracking-tight px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-100 transition-colors duration-300",
        isFull ? "text-destructive font-semibold bg-destructive/5" : "text-muted-foreground",
      )}
    >
      {current}/{max}{label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Room Object Icons                                                 */
/* ------------------------------------------------------------------ */

function getObjectIcon(type: string) {
  switch (type) {
    case "dance_floor":
      return Music;
    case "dj_booth":
      return Sliders;
    case "stage":
      return Mic;
    case "bar":
      return GlassWater;
    case "candy_bar":
      return Cake;
    case "sweet_table":
      return Cake;
    case "photo_booth":
      return Camera;
    case "entrance":
      return DoorOpen;
    default:
      return HelpCircle;
  }
}

function getObjectLabel(type: string): string {
  switch (type) {
    case "dance_floor":
      return "Ring de dans";
    case "dj_booth":
      return "DJ Booth";
    case "stage":
      return "Scenă";
    case "bar":
      return "Cocktail Bar";
    case "candy_bar":
      return "Candy Bar";
    case "sweet_table":
      return "Sweet Table";
    case "photo_booth":
      return "Cabina Foto";
    case "entrance":
      return "Intrare";
    default:
      return "Obiect Sală";
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

function getSimplifiedName(name: string): string {
  const match = name.match(/^Masa\s+(.+)$/i);
  return match ? match[1] : name;
}

export function TableVisual({
  table,
  isSelected,
  isDropTarget,
  isHovered = false,
  isValidDrop = true,
  validationReason,
  onClick,
  onDrop,
  scale = 1.0,
}: TableVisualProps) {
  const [isMouseHovered, setIsMouseHovered] = useState(false);
  const metadata = parseMetadata(table.notes);
  const isLocked = metadata.isLocked === true;
  const isRoomObject = !!metadata.objectType;
  
  const shape = metadata.customShape || table.shape;
  const isSweetheart = shape === "sweetheart";
  const isRound = shape === "round";
  const isRectangular = shape === "rectangular" || shape === "long_banquet";
  const isSquare = shape === "square";

  const { occupied, capacity } = getTableOccupancy(table);
  const isFull = occupied >= capacity;

  /* ---- drag-and-drop handlers ---- */
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!isRoomObject) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!isRoomObject) {
      onDrop(e);
    }
  }

  // Handle Room Object visual rendering
  if (isRoomObject) {
    const ObjectIcon = getObjectIcon(metadata.objectType!);
    const objectLabel = table.name || getObjectLabel(metadata.objectType!);
    const width = metadata.width || 180;
    const height = metadata.height || 100;
    const rotation = metadata.rotation || 0;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick();
        }}
        className={cn(
          "group relative flex items-center justify-center transition-all duration-300 border-2 select-none",
          "bg-gradient-to-br from-slate-50/90 to-slate-100/90 border-slate-200 shadow-md backdrop-blur-sm",
          "hover:scale-[1.02] hover:shadow-lg hover:border-slate-300",
          isSelected && "ring-2 ring-primary border-primary/50 scale-[1.02] shadow-lg",
          metadata.objectType === "dance_floor" && "from-amber-50/50 to-pink-50/50 border-dashed border-pink-200 shadow-sm",
          metadata.objectType === "stage" && "from-slate-100 to-slate-200 border-double border-slate-400",
          metadata.objectType === "entrance" && "bg-emerald-50/70 border-emerald-200 border-dashed",
          isLocked && "cursor-default hover:scale-100"
        )}
        style={{
          width,
          height,
          transform: `rotate(${rotation}deg)`,
          borderRadius: metadata.customShape === "round" ? "9999px" : "16px"
        }}
      >
        {/* Lock indicator */}
        {isLocked && (
          <div className="absolute right-2 top-2 rounded-full bg-slate-200/80 p-1 text-slate-500 shadow-sm">
            <Lock className="h-3 w-3" />
          </div>
        )}

        <div 
          className="flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-transform duration-300 ease-out"
          style={{
            transform: `scale(${Math.min(1.5, Math.max(0.6, 0.9 / scale))})`,
          }}
        >
          <ObjectIcon className={cn(
            "h-6 w-6 text-slate-500/70 group-hover:text-slate-600 transition-colors",
            metadata.objectType === "dance_floor" && "text-pink-400/90 group-hover:text-pink-500",
            metadata.objectType === "entrance" && "text-emerald-500",
            metadata.objectType === "stage" && "text-amber-500"
          )} />
          <span className="font-serif text-xs font-semibold text-slate-700 tracking-wide line-clamp-2">
            {objectLabel}
          </span>
        </div>
      </div>
    );
  }

  // Sizing and styling variables for tables
  let dimensions = "h-40 w-40 rounded-full";
  if (isSweetheart) dimensions = "h-44 w-44 rounded-full";
  if (isRectangular) dimensions = shape === "long_banquet" ? "h-32 w-80 rounded-2xl" : "h-32 w-48 rounded-2xl";
  if (isSquare) dimensions = "h-36 w-36 rounded-xl";

  const rotation = metadata.rotation || 0;

  const showFeedback = isHovered || (isDropTarget && isMouseHovered);

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
      onMouseEnter={() => {
        if (isDropTarget) setIsMouseHovered(true);
      }}
      onMouseLeave={() => {
        setIsMouseHovered(false);
      }}
      className={cn(
        /* base */
        "group relative flex cursor-pointer flex-col items-center justify-center transition-all duration-300 select-none",
        dimensions,

        /* glass surface */
        "border bg-white/95 shadow-md backdrop-blur-sm border-border/80",

        /* hover effect if not locked and not showing feedback */
        !isLocked && !showFeedback && "hover:scale-[1.04] hover:shadow-lg hover:border-primary/20",

        /* selected state (only if not showing active feedback) */
        isSelected && !showFeedback && "scale-105 ring-2 ring-primary shadow-xl border-primary/50 z-20",

        /* drop target guest assignment preview (only if not hovered/showing feedback) */
        isDropTarget && !showFeedback && "ring-2 ring-accent border-dashed border-accent animate-pulse scale-[1.02]",

        /* active droppable/undroppable feedback */
        showFeedback && isValidDrop && "ring-4 ring-emerald-500 border-emerald-400 bg-emerald-50/5 hover:scale-[1.04] shadow-[0_0_20px_5px_rgba(16,185,129,0.4)] scale-105 z-20",
        showFeedback && !isValidDrop && "ring-4 ring-rose-500 border-rose-400 bg-rose-50/5 hover:scale-[1.02] shadow-[0_0_20px_5px_rgba(244,63,94,0.4)] scale-102 z-20 cursor-not-allowed",

        /* full occupancy styling */
        isFull && !isSelected && !isDropTarget && "bg-pink-50/10 border-pink-200/50 shadow-inner",

        /* sweetheart custom gold style */
        isSweetheart && "border-amber-300/80 shadow-[0_0_24px_4px_rgba(217,179,112,0.15)] bg-gradient-to-br from-amber-50/30 via-white to-white",
        
        isLocked && "cursor-default hover:scale-100"
      )}
      style={{
        transform: `rotate(${rotation}deg)`
      }}
    >
      {/* Invalid Drop Tooltip */}
      {showFeedback && !isValidDrop && validationReason && (
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
          style={{
            transform: `translate(-50%, 0) rotate(${-rotation}deg)`,
          }}
        >
          {validationReason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-rose-600" />
        </div>
      )}
      {/* Crown decoration for sweetheart table */}
      {isSweetheart && (
        <Crown
          className="absolute -top-4.5 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-sm animate-bounce"
          size={20}
          style={{ animationDuration: "3s" }}
        />
      )}

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute right-2 top-2 rounded-full bg-slate-100/90 p-1 text-slate-400 shadow-sm border border-slate-200/50">
          <Lock className="h-3 w-3" />
        </div>
      )}

      {/* Seat dots with correct coordinates and scale */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 ease-in-out"
        style={{
          opacity: scale < 0.5 ? 0 : 1,
          display: scale < 0.4 ? "none" : "block"
        }}
      >
        {isSweetheart ? (
          <>
            {sweetheartSeats(table, 82).map((seat, i) => (
              <Seat key={i} {...seat} />
            ))}
          </>
        ) : isRound ? (
          <>
            {roundSeats(table, 74).map((seat, i) => (
              <Seat key={i} {...seat} />
            ))}
          </>
        ) : isSquare ? (
          <>
            {squareSeats(table).map((seat, i) => (
              <Seat key={i} {...seat} isPercent />
            ))}
          </>
        ) : (
          <>
            {rectangularSeats(table).map((seat, i) => (
              <Seat key={i} {...seat} isPercent />
            ))}
          </>
        )}
      </div>

      {/* Center label */}
      <div 
        className="z-10 flex flex-col items-center gap-0.5 pointer-events-none px-3 transition-transform duration-300 ease-out"
        style={{
          transform: `scale(${Math.min(1.5, Math.max(0.6, 0.9 / scale))})`,
        }}
      >
        {isSweetheart && (
          <Heart
            className="mb-0.5 fill-amber-300/40 text-amber-500 animate-pulse"
            size={16}
            style={{ animationDuration: "2s" }}
          />
        )}
        <span
          className={cn(
            "font-serif text-sm font-semibold leading-tight text-center text-slate-800 transition-colors duration-300",
            isSweetheart && "text-amber-700 font-bold",
          )}
        >
          {scale < 0.5 ? getSimplifiedName(table.name) : table.name}
        </span>
        <OccupancyBadge current={occupied} max={capacity} scale={scale} />
      </div>
    </div>
  );
}
