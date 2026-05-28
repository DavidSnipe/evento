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
import {
  getFootprintVisualScale,
  getRoundTableVisualScale,
  getTableFootprintPx,
  RECT_TABLE_VISUAL_H_PX,
  RECT_TABLE_VISUAL_W_PX,
  ROUND_TABLE_VISUAL_PX,
  SQUARE_TABLE_VISUAL_PX,
  VISUAL_RENDER_SCALE,
} from "@/lib/seating/table-spatial";
import { parseMetadata, getTableOccupancy } from "@/lib/seating/utils";
import { getDisplayRotationDeg } from "@/lib/seating/table-rotation";

/** LOD thresholds — match Figma export (SeatingCanvas.tsx) */
const LOD = {
  showArc: (zoom: number) => zoom >= 0.7,
  showCount: (zoom: number) => zoom >= 0.88,
  showSeats: (zoom: number) => zoom >= 1.1,
  showRoomLabel: (zoom: number) => zoom >= 0.42,
  showRoom: (zoom: number) => zoom >= 0.35,
};

const FIGMA_TABLE_SCALE = VISUAL_RENDER_SCALE;

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
  collisionWarning?: boolean;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  scale?: number;
};

type SvgSeat = { x: number; y: number; filled: boolean };

function squareSeatPositions(
  capacity: number,
  occupied: number,
  cx: number,
  cy: number,
  seatDist: number,
  spread: number
): SvgSeat[] {
  const sides: number[][] = [[], [], [], []];
  for (let i = 0; i < capacity; i++) sides[i % 4].push(i);

  const out: SvgSeat[] = [];
  const place = (indices: number[], side: 0 | 1 | 2 | 3) => {
    const count = indices.length;
    indices.forEach((guestIdx, idx) => {
      const t = count === 1 ? 0.5 : (idx + 0.5) / count;
      const along = (t - 0.5) * spread;
      let x = cx;
      let y = cy;
      if (side === 0) {
        x += along;
        y -= seatDist;
      } else if (side === 1) {
        x += seatDist;
        y += along;
      } else if (side === 2) {
        x += along;
        y += seatDist;
      } else {
        x -= seatDist;
        y += along;
      }
      out.push({ x, y, filled: guestIdx < occupied });
    });
  };
  place(sides[0], 0);
  place(sides[1], 1);
  place(sides[2], 2);
  place(sides[3], 3);
  return out;
}

function rectSeatPositions(
  capacity: number,
  occupied: number,
  cx: number,
  cy: number,
  seatDist: number,
  spread: number
): SvgSeat[] {
  const half = Math.ceil(capacity / 2);
  const out: SvgSeat[] = [];
  for (let i = 0; i < half; i++) {
    const t = half === 1 ? 0.5 : (i + 0.5) / half;
    const along = (t - 0.5) * spread;
    out.push({ x: cx + along, y: cy - seatDist, filled: i < occupied });
  }
  for (let i = half; i < capacity; i++) {
    const idx = i - half;
    const bottomCount = capacity - half;
    const t = bottomCount === 1 ? 0.5 : (idx + 0.5) / bottomCount;
    const along = (t - 0.5) * spread;
    out.push({ x: cx + along, y: cy + seatDist, filled: i < occupied });
  }
  return out;
}

function emptySeatFill(glowing: boolean, collision: boolean): string {
  if (collision) return "#EDD0D8";
  if (glowing) return "#FCEAEF";
  return "#F0D8DF";
}

function getTableSurfaceStyle(
  glowing: boolean,
  rejected: boolean,
  isSelected: boolean,
  full: boolean,
  collision = false
) {
  const tableBodyColor = glowing
    ? "#FEF0F3"
    : rejected
      ? "#FFF5F5"
      : collision
        ? "#FCE8ED"
        : full
          ? "#FEF2F5"
          : isSelected
            ? "#FEF5F7"
            : "#FDF8F9";
  const boxShadow = glowing
    ? "0 0 20px rgba(184,81,107,0.4)"
    : rejected
      ? "0 0 15px rgba(255,59,48,0.3)"
      : collision
        ? "0 0 14px rgba(194,88,108,0.18)"
        : isSelected
          ? "0 0 15px rgba(184,81,107,0.2)"
          : "0 4px 12px rgba(180,100,120,0.1)";
  const stroke = glowing
    ? "#C2556A"
    : rejected
      ? "#FF3B30"
      : collision
        ? "rgba(194,85,105,0.52)"
        : isSelected
          ? "#B8516B"
          : "rgba(210,170,185,0.45)";
  return { tableBodyColor, boxShadow, stroke };
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
  collision = false,
}: {
  tableId: string;
  tableNumber: string;
  occupied: number;
  capacity: number;
  zoom: number;
  isSelected: boolean;
  glowing: boolean;
  rejected: boolean;
  collision?: boolean;
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
  const { tableBodyColor, boxShadow, stroke } = getTableSurfaceStyle(
    glowing,
    rejected,
    isSelected,
    full,
    collision
  );

  const gradId = `tg_${tableId}`;

  return (
    <div
      className="planner-table-figma-root"
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
              fill={
                seat.filled ? "#C2556A" : emptySeatFill(glowing, collision)
              }
              stroke="white"
              strokeWidth={1.5 * tableScale}
              className={seat.filled ? undefined : "planner-table-seat-empty"}
              style={{ transition: "fill 0.3s ease" }}
            />
          ))}
        <circle cx={cx} cy={cy + 1} r={R + 1} fill="rgba(180,100,120,0.06)" />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth={glowing || isSelected || collision ? 1.75 : 1.5}
          className="planner-table-surface"
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

function SquareFigmaTable({
  tableId,
  tableNumber,
  occupied,
  capacity,
  zoom,
  isSelected,
  glowing,
  rejected,
  collision = false,
}: {
  tableId: string;
  tableNumber: string;
  occupied: number;
  capacity: number;
  zoom: number;
  isSelected: boolean;
  glowing: boolean;
  rejected: boolean;
  collision?: boolean;
}) {
  const tableScale = FIGMA_TABLE_SCALE;
  const full = occupied >= capacity;
  const svgSize = Math.round(116 * tableScale);
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const half = 33 * tableScale;
  const seatDist = 48 * tableScale;
  const spread = 72 * tableScale;
  const r_seat = 5.5 * tableScale;
  const corner = 10 * tableScale;

  const baseFontSize = zoom < 0.7 ? 14 : zoom < 1 ? 17 : 20;
  const numberFontSize = baseFontSize * tableScale;
  const subFontSize = 9 * tableScale;
  const showSeats = LOD.showSeats(zoom);
  const showCount = LOD.showCount(zoom);

  const seats = squareSeatPositions(capacity, occupied, cx, cy, seatDist, spread);
  const { tableBodyColor, boxShadow, stroke } = getTableSurfaceStyle(
    glowing,
    rejected,
    isSelected,
    full,
    collision
  );
  const gradId = `sq_${tableId}`;

  return (
    <div
      className="planner-table-figma-root"
      style={{
        width: svgSize,
        height: svgSize,
        borderRadius: corner + 4,
        boxShadow,
        transition: "box-shadow 0.28s ease, transform 0.2s ease",
        transform: glowing ? "scale(1.06)" : undefined,
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
              fill={
                seat.filled ? "#C2556A" : emptySeatFill(glowing, collision)
              }
              stroke="white"
              strokeWidth={1.5 * tableScale}
              className={seat.filled ? undefined : "planner-table-seat-empty"}
            />
          ))}
        <rect
          x={cx - half - 1}
          y={cy - half}
          width={half * 2 + 2}
          height={half * 2 + 2}
          rx={corner}
          fill="rgba(180,100,120,0.06)"
        />
        <rect
          x={cx - half}
          y={cy - half}
          width={half * 2}
          height={half * 2}
          rx={corner}
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth={glowing || isSelected || collision ? 1.75 : 1.5}
          className="planner-table-surface"
        />
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
      </svg>
    </div>
  );
}

function RectFigmaTable({
  tableId,
  tableNumber,
  occupied,
  capacity,
  zoom,
  isSelected,
  glowing,
  rejected,
  collision = false,
}: {
  tableId: string;
  tableNumber: string;
  occupied: number;
  capacity: number;
  zoom: number;
  isSelected: boolean;
  glowing: boolean;
  rejected: boolean;
  collision?: boolean;
}) {
  const tableScale = FIGMA_TABLE_SCALE;
  const full = occupied >= capacity;
  const svgW = Math.round(116 * tableScale);
  const svgH = Math.round(58 * tableScale);
  const cx = svgW / 2;
  const cy = svgH / 2;
  const halfW = 45 * tableScale;
  const halfH = 16 * tableScale;
  const seatDist = 26 * tableScale;
  const spread = 80 * tableScale;
  const r_seat = 5.5 * tableScale;
  const corner = 8 * tableScale;

  const baseFontSize = zoom < 0.7 ? 14 : zoom < 1 ? 17 : 20;
  const numberFontSize = baseFontSize * tableScale;
  const subFontSize = 9 * tableScale;
  const showSeats = LOD.showSeats(zoom);
  const showCount = LOD.showCount(zoom);

  const seats = rectSeatPositions(capacity, occupied, cx, cy, seatDist, spread);
  const { tableBodyColor, boxShadow, stroke } = getTableSurfaceStyle(
    glowing,
    rejected,
    isSelected,
    full,
    collision
  );
  const gradId = `rc_${tableId}`;

  return (
    <div
      className="planner-table-figma-root"
      style={{
        width: svgW,
        height: svgH,
        borderRadius: corner + 4,
        boxShadow,
        transition: "box-shadow 0.28s ease, transform 0.2s ease",
        transform: glowing ? "scale(1.06)" : undefined,
      }}
    >
      <svg
        width={svgW}
        height={svgH}
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
              fill={
                seat.filled ? "#C2556A" : emptySeatFill(glowing, collision)
              }
              stroke="white"
              strokeWidth={1.5 * tableScale}
              className={seat.filled ? undefined : "planner-table-seat-empty"}
            />
          ))}
        <rect
          x={cx - halfW - 1}
          y={cy - halfH}
          width={halfW * 2 + 2}
          height={halfH * 2 + 2}
          rx={corner}
          fill="rgba(180,100,120,0.06)"
        />
        <rect
          x={cx - halfW}
          y={cy - halfH}
          width={halfW * 2}
          height={halfH * 2}
          rx={corner}
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth={glowing || isSelected || collision ? 1.75 : 1.5}
          className="planner-table-surface"
        />
        <text
          x={cx}
          y={showCount && occupied > 0 ? cy - 5 * tableScale : cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={zoom >= 1.1 ? 15 * tableScale : numberFontSize}
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
            y={cy + numberFontSize * 0.55}
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
      </svg>
    </div>
  );
}

function FootprintScaledTable({
  footprintWidthPx,
  footprintHeightPx,
  visualWidthPx,
  visualHeightPx,
  visualScale,
  rotation,
  isLocked,
  showFeedback,
  isValidDrop,
  validationReason,
  collisionWarning = false,
  onClick,
  onDragOver,
  onDrop,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  footprintWidthPx: number;
  footprintHeightPx: number;
  visualWidthPx: number;
  visualHeightPx: number;
  visualScale: number;
  rotation: number;
  isLocked: boolean;
  showFeedback: boolean;
  isValidDrop: boolean;
  validationReason?: string;
  collisionWarning?: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "table-visual-collision-host group relative flex cursor-pointer items-center justify-center select-none rounded-sm transition-shadow duration-150",
        isLocked && "cursor-default",
        collisionWarning && "table-visual-collision-active"
      )}
      style={{
        width: footprintWidthPx,
        height: footprintHeightPx,
        transform: `rotate(${rotation}deg)`,
      }}
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
      <div
        className="flex items-center justify-center"
        style={{
          width: visualWidthPx,
          height: visualHeightPx,
          transform: `scale(${visualScale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
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
  collisionWarning = false,
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
  const footprint = getTableFootprintPx(metadata, shape);

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
    const width = Math.round(footprint.widthPx * VISUAL_RENDER_SCALE);
    const height = Math.round(footprint.heightPx * VISUAL_RENDER_SCALE);
    const rotation = getDisplayRotationDeg(metadata, shape);
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
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
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
          size={Math.round((showLabel ? 13 : 11) * VISUAL_RENDER_SCALE)}
          color={cfg.color}
          strokeWidth={1.8}
          fill={`${cfg.color}22`}
        />
        {showLabel && (
          <span
            style={{
              fontSize: 8.5 * VISUAL_RENDER_SCALE,
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
    const width = Math.round(footprint.widthPx * VISUAL_RENDER_SCALE);
    const height = Math.round(footprint.heightPx * VISUAL_RENDER_SCALE);
    const rotation = getDisplayRotationDeg(metadata, shape);
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
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
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
              ? Math.round((isLarge ? 18 : 13) * VISUAL_RENDER_SCALE)
              : Math.round((isLarge ? 14 : 11) * VISUAL_RENDER_SCALE)
          }
          color={cfg.color}
          strokeWidth={isLarge ? 1.5 : 1.8}
          fill={objectType === "dance_floor" ? `${cfg.color}22` : "none"}
        />
        {showLabel && (
          <span
            style={{
              fontSize: (isLarge ? 10 : 8.5) * VISUAL_RENDER_SCALE,
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

  const rotation = getDisplayRotationDeg(metadata, shape);
  const showFeedback = isHovered || (isDropTarget && isMouseHovered);
  const glowing = showFeedback && isValidDrop;
  const rejected = showFeedback && !isValidDrop;
  const collision =
    collisionWarning && !glowing && !rejected;
  const tableNumber = getSimplifiedName(table.name);

  const footprintW = footprint.footprintWidthPx;
  const footprintH = footprint.footprintHeightPx;
  const mouseHandlers = {
    onMouseEnter: () => {
      if (isDropTarget) setIsMouseHovered(true);
    },
    onMouseLeave: () => setIsMouseHovered(false),
  };
  const figmaProps = {
    tableId: table.id,
    tableNumber,
    occupied,
    capacity,
    zoom: scale,
    isSelected,
    glowing,
    rejected,
    collision,
  };

  if (isRound) {
    const visualScale = getRoundTableVisualScale(footprintW, ROUND_TABLE_VISUAL_PX);
    return (
      <FootprintScaledTable
        footprintWidthPx={footprintW}
        footprintHeightPx={footprintH}
        visualWidthPx={ROUND_TABLE_VISUAL_PX}
        visualHeightPx={ROUND_TABLE_VISUAL_PX}
        visualScale={visualScale}
        rotation={rotation}
        isLocked={isLocked}
        showFeedback={showFeedback}
        isValidDrop={isValidDrop}
        validationReason={validationReason}
        collisionWarning={collisionWarning}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        {...mouseHandlers}
      >
        <RoundFigmaTable {...figmaProps} />
      </FootprintScaledTable>
    );
  }

  if (isSquare) {
    const visualScale = getFootprintVisualScale(
      footprintW,
      footprintH,
      SQUARE_TABLE_VISUAL_PX,
      SQUARE_TABLE_VISUAL_PX
    );
    return (
      <FootprintScaledTable
        footprintWidthPx={footprintW}
        footprintHeightPx={footprintH}
        visualWidthPx={SQUARE_TABLE_VISUAL_PX}
        visualHeightPx={SQUARE_TABLE_VISUAL_PX}
        visualScale={visualScale}
        rotation={rotation}
        isLocked={isLocked}
        showFeedback={showFeedback}
        isValidDrop={isValidDrop}
        validationReason={validationReason}
        collisionWarning={collisionWarning}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        {...mouseHandlers}
      >
        <SquareFigmaTable {...figmaProps} />
      </FootprintScaledTable>
    );
  }

  if (isRectangular) {
    const visualScale = getFootprintVisualScale(
      footprintW,
      footprintH,
      RECT_TABLE_VISUAL_W_PX,
      RECT_TABLE_VISUAL_H_PX
    );
    return (
      <FootprintScaledTable
        footprintWidthPx={footprintW}
        footprintHeightPx={footprintH}
        visualWidthPx={RECT_TABLE_VISUAL_W_PX}
        visualHeightPx={RECT_TABLE_VISUAL_H_PX}
        visualScale={visualScale}
        rotation={rotation}
        isLocked={isLocked}
        showFeedback={showFeedback}
        isValidDrop={isValidDrop}
        validationReason={validationReason}
        collisionWarning={collisionWarning}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        {...mouseHandlers}
      >
        <RectFigmaTable {...figmaProps} />
      </FootprintScaledTable>
    );
  }

  return null;
}
