"use client";

import { useState } from "react";
import {
  Heart,
  Lock,
  Sliders,
  Mic,
  GlassWater,
  Camera,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableWithGuests } from "@/lib/seating/queries";
import type { GuestWithTable } from "@/types/guests";
import { parseMetadata, getTableOccupancy } from "@/lib/seating/utils";

/** LOD thresholds — match Figma export (SeatingCanvas.tsx) */
const LOD = {
  showArc: (zoom: number) => zoom >= 0.7,
  showCount: (zoom: number) => zoom >= 0.88,
  showSeats: (zoom: number) => zoom >= 1.1,
  showRoomLabel: (zoom: number) => zoom >= 0.42,
  showRoom: (zoom: number) => zoom >= 0.35,
};

/** Global visual scale vs Figma export base (user-requested 1.5x) */
const VISUAL_SCALE = 1.5;
const FIGMA_TABLE_SCALE = VISUAL_SCALE;

/** Figma SeatingCanvas ROOM_CONFIG — exact values */
const ROOM_CONFIG: Record<
  string,
  { gradient: string; border: string; color: string; Icon: React.ElementType; glow: string }
> = {
  stage: {
    gradient: "linear-gradient(145deg,#FDF0F4,#F8E4EC)",
    border: "rgba(210,155,178,0.35)",
    color: "#9A6878",
    Icon: Mic,
    glow: "rgba(200,130,155,0.1)",
  },
  dj_booth: {
    gradient: "linear-gradient(145deg,#F8F3F5,#F2EAEE)",
    border: "rgba(200,170,182,0.3)",
    color: "#8A7078",
    Icon: Sliders,
    glow: "rgba(180,140,158,0.08)",
  },
  dance_floor: {
    gradient: "linear-gradient(145deg,#FEF2F6,#FCEAEF)",
    border: "rgba(210,160,178,0.4)",
    color: "#B8516B",
    Icon: Heart,
    glow: "rgba(184,81,107,0.12)",
  },
  bar: {
    gradient: "linear-gradient(145deg,#F8F0F2,#F2E8EC)",
    border: "rgba(200,165,178,0.3)",
    color: "#9A6070",
    Icon: GlassWater,
    glow: "rgba(180,120,140,0.08)",
  },
  photo_booth: {
    gradient: "linear-gradient(145deg,#F5F0F4,#EFE8EE)",
    border: "rgba(195,165,180,0.3)",
    color: "#8A6878",
    Icon: Camera,
    glow: "rgba(170,130,150,0.08)",
  },
  couple: {
    gradient: "linear-gradient(145deg,#FEF0F4,#FCE8EE)",
    border: "rgba(210,158,178,0.45)",
    color: "#B8516B",
    Icon: Star,
    glow: "rgba(184,81,107,0.14)",
  },
};

function getFigmaRoomConfig(type: string) {
  return ROOM_CONFIG[type] ?? ROOM_CONFIG.stage;
}

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

type SeatInfo = { guest: VisualGuest | null; x: number; y: number };

function rectangularSeats(table: TableWithGuests): SeatInfo[] {
  const visualGuests = getVisualGuests(table);
  const half = Math.ceil(table.capacity / 2);
  const seats: SeatInfo[] = [];

  // top edge (y = -62%)
  for (let i = 0; i < half; i++) {
    const guest = visualGuests[i] ?? null;
    const x = half === 1 ? 0 : ((i + 0.5) / half) * 90 - 45; // spread -45..45%
    seats.push({ guest, x, y: -62 });
  }

  // bottom edge (y = 62%)
  for (let i = half; i < table.capacity; i++) {
    const guest = visualGuests[i] ?? null;
    const idx = i - half;
    const bottomCount = table.capacity - half;
    const x = bottomCount === 1 ? 0 : ((idx + 0.5) / bottomCount) * 90 - 45;
    seats.push({ guest, x, y: 62 });
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

  // top side (y = -62%)
  sides[0].forEach((guest, idx) => {
    const count = sides[0].length;
    const x = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x, y: -62 });
  });

  // right side (x = 62%)
  sides[1].forEach((guest, idx) => {
    const count = sides[1].length;
    const y = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x: 62, y });
  });

  // bottom side (y = 62%)
  sides[2].forEach((guest, idx) => {
    const count = sides[2].length;
    const x = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x, y: 62 });
  });

  // left side (x = -62%)
  sides[3].forEach((guest, idx) => {
    const count = sides[3].length;
    const y = count === 1 ? 0 : ((idx + 0.5) / count) * 80 - 40;
    seats.push({ guest, x: -62, y });
  });

  return seats;
}

/* ------------------------------------------------------------------ */
/*  Seat dot renderer (absolute coordinates)                         */
/* ------------------------------------------------------------------ */

function Seat({ guest, x, y, isPercent }: SeatInfo & { isPercent?: boolean }) {
  const occupied = !!guest;
  const r = 5.5 * VISUAL_SCALE;
  return (
    <div
      className="absolute flex items-center justify-center pointer-events-auto"
      style={{
        width: r * 2 + 3,
        height: r * 2 + 3,
        left: isPercent ? `calc(50% + ${x}%)` : "50%",
        top: isPercent ? `calc(50% + ${y}%)` : "50%",
        transform: isPercent
          ? "translate(-50%, -50%)"
          : `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
    >
      <svg width={r * 2 + 3} height={r * 2 + 3} overflow="visible">
        <circle
          cx={(r * 2 + 3) / 2}
          cy={(r * 2 + 3) / 2}
          r={r}
          fill={occupied ? "#C2556A" : "#F0D8DF"}
          stroke="white"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
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

/** Round table — pixel-perfect copy of Figma SeatingCanvas TableComponent */
function RoundFigmaTable({
  tableId,
  tableNumber,
  occupied,
  capacity,
  zoom,
  isSelected,
  glowing,
  rejected,
}: {
  tableId: string;
  tableNumber: string;
  occupied: number;
  capacity: number;
  zoom: number;
  isSelected: boolean;
  glowing: boolean;
  rejected: boolean;
}) {
  const tableScale = FIGMA_TABLE_SCALE;
  const full = occupied >= capacity;
  const svgSize = Math.round(116 * tableScale);
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const R = 33 * tableScale;
  const R_seat = 48 * tableScale;
  const r_seat = 5.5 * tableScale;

  const baseFontSize = zoom < 0.7 ? 14 : zoom < 1 ? 17 : 20;
  const numberFontSize = baseFontSize * tableScale;
  const subFontSize = 9 * tableScale;
  const showSeats = LOD.showSeats(zoom);
  const showArc = LOD.showArc(zoom);
  const showCount = LOD.showCount(zoom);

  const seats = Array.from({ length: capacity }, (_, i) => {
    const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
    return {
      x: cx + R_seat * Math.cos(angle),
      y: cy + R_seat * Math.sin(angle),
      filled: i < occupied,
    };
  });

  const dashArray = 2 * Math.PI * R;
  const dashOffset = dashArray * (1 - occupied / capacity);
  const tableBodyColor = glowing
    ? "#FEF0F3"
    : full
      ? "#FEF2F5"
      : isSelected
        ? "#FEF5F7"
        : "#FDF8F9";

  const boxShadow = glowing
    ? "0 0 20px rgba(184,81,107,0.4)"
    : rejected
      ? "0 0 15px rgba(255,59,48,0.3)"
      : isSelected
        ? "0 0 15px rgba(184,81,107,0.2)"
        : "0 4px 12px rgba(180,100,120,0.1)";

  const gradId = `tg_${tableId}`;

  return (
    <div
      style={{
        width: svgSize,
        height: svgSize,
        borderRadius: "50%",
        boxShadow,
        transition: "box-shadow 0.28s ease, transform 0.2s ease",
        transform: glowing ? "scale(1.1)" : undefined,
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        overflow="visible"
        shapeRendering="geometricPrecision"
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id={gradId} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor={tableBodyColor} />
          </radialGradient>
        </defs>
        {showSeats &&
          seats.map((seat, i) => (
            <circle
              key={i}
              cx={seat.x}
              cy={seat.y}
              r={r_seat}
              fill={seat.filled ? "#C2556A" : glowing ? "#FCEAEF" : "#F0D8DF"}
              stroke="white"
              strokeWidth={1.5 * tableScale}
              style={{ transition: "fill 0.3s ease" }}
            />
          ))}
        <circle cx={cx} cy={cy + 1} r={R + 1} fill="rgba(180,100,120,0.06)" />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill={`url(#${gradId})`}
          stroke={
            glowing
              ? "#C2556A"
              : rejected
                ? "#FF3B30"
                : isSelected
                  ? "#B8516B"
                  : "rgba(210,170,185,0.45)"
          }
          strokeWidth={glowing || isSelected ? 2 : 1.5}
        />
        {showArc && occupied > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={R - 4 * tableScale}
            fill="none"
            stroke={full ? "rgba(184,81,107,0.35)" : "rgba(184,81,107,0.18)"}
            strokeWidth={2}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        )}
        <text
          x={cx}
          y={showCount && occupied > 0 ? cy - 6 * tableScale : cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={zoom >= 1.1 ? 16 * tableScale : numberFontSize}
          fontFamily="var(--font-playfair), Playfair Display, Georgia, serif"
          fontWeight={600}
          fill={isSelected ? "#B8516B" : "#1A0E14"}
          letterSpacing="-0.5"
        >
          {tableNumber}
        </text>
        {showCount && occupied > 0 && (
          <text
            x={cx}
            y={cy + numberFontSize * 0.58}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={subFontSize}
            fontFamily="Inter, sans-serif"
            fill={full ? "#B8516B" : "#C4A8B4"}
            fontWeight={600}
            letterSpacing="0.02em"
          >
            {occupied}/{capacity}
          </text>
        )}
        {glowing && (
          <circle
            cx={cx}
            cy={cy}
            r={R + 8 * tableScale}
            fill="none"
            stroke="#C2556A"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.6}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: "spin 6s linear infinite",
            }}
          />
        )}
      </svg>
    </div>
  );
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
  const baseFontSize = scale < 0.7 ? 14 : scale < 1 ? 17 : 20;

  /* ---- drag-and-drop handlers ---- */
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!isRoomObject) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  // Handle Sweetheart / couple table (Figma couple style)
  if (isSweetheart) {
    const cfg = ROOM_CONFIG.couple;
    const width = Math.round(170 * VISUAL_SCALE);
    const height = Math.round(88 * VISUAL_SCALE);
    const rotation = metadata.rotation || 0;
    const showLabel = LOD.showRoomLabel(scale);

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick();
        }}
        onDragOver={handleDragOver}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(e);
        }}
        className={cn(
          "group relative flex select-none items-center justify-center",
          isSelected && "ring-2 ring-[#B8516B]/30",
          isLocked && "cursor-default"
        )}
        style={{
          width,
          height,
          transform: `rotate(${rotation}deg)`,
          borderRadius: 12,
          background: cfg.gradient,
          border: `1.5px solid ${cfg.border}`,
          boxShadow: `0 2px 12px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.7)`,
          gap: showLabel ? 4 : 0,
        }}
      >
        {isLocked && (
          <div className="absolute right-2 top-2 rounded-full bg-slate-200/80 p-0.5 text-slate-500 shadow-sm">
            <Lock className="h-2.5 w-2.5" />
          </div>
        )}
        <Star
          size={Math.round((showLabel ? 13 : 11) * VISUAL_SCALE)}
          color={cfg.color}
          strokeWidth={1.8}
          fill={`${cfg.color}22`}
        />
        {showLabel && (
          <span
            style={{
              fontSize: 8.5 * VISUAL_SCALE,
              fontWeight: 650,
              color: cfg.color,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            {table.name}
          </span>
        )}
      </div>
    );
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!isRoomObject) {
      onDrop(e);
    }
  }

  // Handle Room Object visual rendering (Figma RoomObjectItem)
  if (isRoomObject) {
    if (!LOD.showRoom(scale)) return null;

    const objectType = metadata.objectType!;
    const cfg = getFigmaRoomConfig(objectType);
    const Icon = cfg.Icon;
    const objectLabel = table.name || getObjectLabel(objectType);
    const width = Math.round((metadata.width || 220) * VISUAL_SCALE);
    const height = Math.round((metadata.height || 120) * VISUAL_SCALE);
    const rotation = metadata.rotation || 0;
    const isLarge = objectType === "dance_floor";
    const showLabel = LOD.showRoomLabel(scale);

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick();
        }}
        className={cn(
          "group relative select-none",
          isLocked && "cursor-default"
        )}
        style={{
          width,
          height,
          transform: `rotate(${rotation}deg)`,
          background: cfg.gradient,
          border: `1.5px solid ${cfg.border}`,
          borderRadius: isLarge ? 18 : 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: showLabel ? 4 : 0,
          boxShadow: `0 2px 12px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.7)`,
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {isLocked && (
          <div className="absolute right-2 top-2 rounded-full bg-slate-200/80 p-1 text-slate-500 shadow-sm">
            <Lock className="h-3 w-3" />
          </div>
        )}
        <Icon
          size={
            showLabel
              ? Math.round((isLarge ? 18 : 13) * VISUAL_SCALE)
              : Math.round((isLarge ? 14 : 11) * VISUAL_SCALE)
          }
          color={cfg.color}
          strokeWidth={isLarge ? 1.5 : 1.8}
          fill={objectType === "dance_floor" ? `${cfg.color}22` : "none"}
        />
        {showLabel && (
          <span
            style={{
              fontSize: (isLarge ? 10 : 8.5) * VISUAL_SCALE,
              fontWeight: 650,
              color: cfg.color,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            {objectLabel}
          </span>
        )}
      </div>
    );
  }

  const rotation = metadata.rotation || 0;
  const showFeedback = isHovered || (isDropTarget && isMouseHovered);
  const glowing = showFeedback && isValidDrop;
  const rejected = showFeedback && !isValidDrop;
  const tableNumber = getSimplifiedName(table.name);

  // Round tables — Figma TableComponent (SVG)
  if (isRound) {
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
        onMouseLeave={() => setIsMouseHovered(false)}
        className={cn(
          "group relative flex cursor-pointer items-center justify-center select-none",
          isLocked && "cursor-default"
        )}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {showFeedback && !isValidDrop && validationReason && (
          <div
            className="absolute -top-12 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-lg duration-150"
            style={{ transform: `translate(-50%, 0) rotate(${-rotation}deg)` }}
          >
            {validationReason}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-rose-600" />
          </div>
        )}
        {isLocked && (
          <div className="absolute right-0 top-0 z-10 rounded-full border border-slate-200/50 bg-slate-100/90 p-1 text-slate-400 shadow-sm">
            <Lock className="h-3 w-3" />
          </div>
        )}
        <RoundFigmaTable
          tableId={table.id}
          tableNumber={tableNumber}
          occupied={occupied}
          capacity={capacity}
          zoom={scale}
          isSelected={isSelected}
          glowing={glowing}
          rejected={rejected}
        />
      </div>
    );
  }

  // Non-round tables (rectangular / square) — scaled to match round table footprint
  const rectW = Math.round((shape === "long_banquet" ? 384 : 256) * VISUAL_SCALE);
  const rectH = Math.round(160 * VISUAL_SCALE);
  const squareSize = Math.round(176 * VISUAL_SCALE);

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
        "group relative flex cursor-pointer flex-col items-center justify-center transition-all duration-300 select-none border",
        isLocked && "cursor-default hover:scale-100"
      )}
      style={{
        width: isSquare ? squareSize : rectW,
        height: isSquare ? squareSize : rectH,
        transform: `rotate(${rotation}deg)`,
        borderRadius: isRectangular ? "16px" : "12px",
        background: isSelected
          ? "linear-gradient(145deg, #FEF0F4, #FCE8EE)"
          : "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(252,246,249,0.90))",
        border: isSelected
          ? "2px solid rgba(184,81,107,0.45)"
          : "1.5px solid rgba(210,160,178,0.30)",
        boxShadow: isSelected
          ? "0 0 15px rgba(184,81,107,0.2)"
          : "0 4px 12px rgba(180,100,120,0.1)",
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

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute right-2 top-2 rounded-full bg-slate-100/90 p-1 text-slate-400 shadow-sm border border-slate-200/50">
          <Lock className="h-3 w-3" />
        </div>
      )}

      {/* Seat dots — rectangular / square */}
      {LOD.showSeats(scale) && (
        <div className="absolute inset-0 pointer-events-none">
          {isSquare
            ? squareSeats(table).map((seat, i) => <Seat key={i} {...seat} isPercent />)
            : rectangularSeats(table).map((seat, i) => <Seat key={i} {...seat} isPercent />)}
        </div>
      )}

      {/* Center label */}
      <div className="z-10 flex flex-col items-center gap-0.5 pointer-events-none px-3">
        <span
          style={{
            fontSize: LOD.showCount(scale) ? 16 * VISUAL_SCALE : baseFontSize * VISUAL_SCALE,
            fontWeight: 600,
            color: isSelected ? "#B8516B" : "#1A0E14",
            fontFamily: "var(--font-playfair), Playfair Display, Georgia, serif",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          {tableNumber}
        </span>
        {LOD.showCount(scale) && occupied > 0 && (
          <span
            style={{
              fontSize: 9 * VISUAL_SCALE,
              fontWeight: 600,
              color: isFull ? "#B8516B" : "#C4A8B4",
              fontFamily: "Inter, sans-serif",
              marginTop: 1,
              letterSpacing: "0.02em",
            }}
          >
            {occupied}/{capacity}
          </span>
        )}
      </div>

      {/* Drop hover active feedback overlay */}
      {glowing && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: isRectangular ? '16px' : '12px',
          background: 'rgba(192,100,130,0.12)',
          border: '2px dashed rgba(192,100,130,0.55)',
          pointerEvents: 'none',
          animation: 'pulseRose 0.8s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}
