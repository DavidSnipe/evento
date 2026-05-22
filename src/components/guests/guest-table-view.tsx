"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { createPortal } from "react-dom";
import { RsvpPill } from "@/components/guests/rsvp-pill";
import { TagBadge } from "@/components/guests/tag-badge";
import type { GuestWithTable, RsvpStatus, SeatingTableRow } from "@/types/guests";

type GuestTableViewProps = {
  guests: GuestWithTable[];
  tables: SeatingTableRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onTableChange: (guestId: string, tableId: string | null) => void;
  onDelete: (guestId: string) => void;
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

function getInitials(guest: GuestWithTable): string {
  const f = guest.first_name.charAt(0).toUpperCase();
  const subGuests = guest.subGuests ?? [];
  const partner = subGuests.find((s) => s.relationship_type === "couple");
  if (partner) {
    const pf = partner.first_name.charAt(0).toUpperCase();
    return `${f}+${pf}`;
  }
  const l = guest.last_name ? guest.last_name.charAt(0).toUpperCase() : "";
  return guest.last_name ? `${l}${f}` : f;
}

function formatGuestName(guest: GuestWithTable): { mainName: string; subtext?: string } {
  const fullName = guest.last_name ? `${guest.last_name} ${guest.first_name}` : guest.first_name;
  const subGuests = guest.subGuests ?? [];

  if (subGuests.length === 0) {
    return { mainName: fullName };
  }

  const partner = subGuests.find((s) => s.relationship_type === "couple");
  if (partner) {
    const partnerName = partner.last_name ? `${partner.last_name} ${partner.first_name}` : partner.first_name;
    if (guest.last_name && partner.last_name && guest.last_name.toLowerCase() === partner.last_name.toLowerCase()) {
      return { mainName: `${guest.last_name} ${guest.first_name} & ${partner.first_name}` };
    }
    return { mainName: `${fullName} & ${partnerName}` };
  }

  const familyMembers = subGuests.filter((s) => s.relationship_type === "family" || s.relationship_type === "child");
  if (familyMembers.length > 0) {
    const totalCount = 1 + familyMembers.length;
    if (guest.group_name && guest.group_name.toLowerCase().includes("familia")) {
      return {
        mainName: guest.group_name,
        subtext: `${fullName} + ${familyMembers.map((f) => f.first_name).join(", ")} (${totalCount} membri)`
      };
    }
    const familyName = guest.last_name ? `Familia ${guest.last_name}` : fullName;
    return {
      mainName: familyName,
      subtext: `${fullName} + ${familyMembers.map((f) => f.first_name).join(", ")} (${totalCount} membri)`
    };
  }

  return { mainName: fullName };
}

type TablePickerProps = {
  selectedTableId: string | null;
  tables: SeatingTableRow[];
  onChange: (tableId: string | null) => void;
  readonly?: boolean;
};

export function TablePicker({ selectedTableId, tables, onChange, readonly }: TablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: Math.max(8, Math.min(window.innerWidth - 184, rect.left + window.scrollX)),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    } else {
      setCoords(null);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={readonly}
        onClick={() => {
          if (!readonly) {
            if (!isOpen) updateCoords();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "inline-flex min-h-[44px] md:min-h-[32px] items-center gap-1.5 rounded-xl border border-border/40 px-3.5 md:px-3 py-1.5 md:py-1 text-xs font-medium transition-all duration-200",
          selectedTable
            ? "bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50 border-indigo-100/50"
            : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
          !readonly && "cursor-pointer hover:shadow-sm active:scale-95"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", selectedTable ? "bg-indigo-500" : "bg-muted-foreground/40")} />
        {selectedTable ? selectedTable.name : "Fără masă"}
      </button>

      {isOpen && mounted && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
            transition: "none",
          }}
          className="w-44 rounded-xl border border-border/40 bg-white/95 p-1 shadow-xl shadow-black/5 backdrop-blur-sm transition-none animate-scale-in origin-top-left"
        >
          <div className="p-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută masă..."
              className="h-8 w-full rounded-lg bg-muted/50 px-2.5 text-xs outline-none focus:bg-muted/80"
              autoFocus
            />
          </div>
          <div className="mt-1 max-h-40 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                !selectedTableId ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              Fără masă
            </button>
            {filteredTables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChange(t.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  t.id === selectedTableId ? "bg-indigo-50 text-indigo-700" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {t.name}
              </button>
            ))}
            {filteredTables.length === 0 && (
              <div className="py-2 text-center text-[10px] text-muted-foreground">
                Nicio masă găsită
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function GuestTableView({
  guests,
  tables,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRsvpChange,
  onTableChange,
  onDelete,
  onSelectGuest,
  syncingIds,
}: GuestTableViewProps) {
  const allSelected = guests.length > 0 && selectedIds.size === guests.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);

  // Directly toggle class on sticky header scroll event without triggering state re-renders
  useEffect(() => {
    const container = containerRef.current;
    const thead = theadRef.current;
    if (!container || !thead) return;

    const handleScroll = () => {
      if (container.scrollTop > 10) {
        thead.classList.add("backdrop-blur-md", "bg-white/90", "shadow-sm");
        thead.classList.remove("bg-white/95");
      } else {
        thead.classList.add("bg-white/95");
        thead.classList.remove("backdrop-blur-md", "bg-white/90", "shadow-sm");
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-border/60 max-h-[700px] overflow-y-auto"
    >
      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead
            ref={theadRef}
            className="sticky top-0 z-10 bg-white/95 border-b border-border/75 transition-all duration-200"
          >
            <tr>
              <th className="w-10 px-4 py-3.5 border-r border-border/75">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/75">
                Nume
              </th>
              <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/75">
                RSVP
              </th>
              <th className="hidden lg:table-cell px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/75">
                Tag-uri
              </th>
              <th className="hidden lg:table-cell px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/75">
                Masă
              </th>
              <th className="hidden xl:table-cell px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/75">
                Grup
              </th>
              <th className="w-10 px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/65">
            {guests.map((guest, index) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                tables={tables}
                index={index}
                isSelected={selectedIds.has(guest.id)}
                isSyncing={syncingIds.has(guest.id)}
                onToggleSelect={onToggleSelect}
                onRsvpChange={onRsvpChange}
                onTableChange={onTableChange}
                onDelete={onDelete}
                onClick={onSelectGuest}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-border/20">
        {guests.map((guest, index) => (
          <MobileGuestRow
            key={guest.id}
            guest={guest}
            index={index}
            isSelected={selectedIds.has(guest.id)}
            isSyncing={syncingIds.has(guest.id)}
            onToggleSelect={onToggleSelect}
            onRsvpChange={onRsvpChange}
            onClick={onSelectGuest}
          />
        ))}
      </div>

      {guests.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nu s-au găsit invitați cu filtrele selectate.
        </div>
      )}
    </div>
  );
}

// ── Desktop Row (Memoized for high-performance scale rendering) ──
type GuestRowProps = {
  guest: GuestWithTable;
  tables: SeatingTableRow[];
  isSelected: boolean;
  isSyncing: boolean;
  onToggleSelect: (id: string) => void;
  onRsvpChange: (id: string, status: RsvpStatus) => void;
  onTableChange: (id: string, tableId: string | null) => void;
  onDelete: (id: string) => void;
  onClick: (guest: GuestWithTable) => void;
  index: number;
};

const GuestRow = React.memo(
  function GuestRow({
    guest,
    tables,
    isSelected,
    isSyncing,
    onToggleSelect,
    onRsvpChange,
    onTableChange,
    onDelete,
    onClick,
    index,
  }: GuestRowProps) {
    const [showMenu, setShowMenu] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    const isTemp = guest.id.startsWith("temp-");

    useEffect(() => {
      setMounted(true);
    }, []);

    const updateCoords = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: Math.max(8, rect.right + window.scrollX - 144),
        });
      }
    };

    useEffect(() => {
      if (showMenu) {
        updateCoords();
        window.addEventListener("resize", updateCoords);
        window.addEventListener("scroll", updateCoords, true);
      } else {
        setCoords(null);
      }
      return () => {
        window.removeEventListener("resize", updateCoords);
        window.removeEventListener("scroll", updateCoords, true);
      };
    }, [showMenu]);

    const { mainName, subtext } = formatGuestName(guest);
    const initials = getInitials(guest);
    const gradient = getAvatarGradient(mainName);

    useEffect(() => {
      function handleClick(e: MouseEvent) {
        if (
          triggerRef.current?.contains(e.target as Node) ||
          menuRef.current?.contains(e.target as Node)
        ) {
          return;
        }
        setShowMenu(false);
      }
      if (showMenu) document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [showMenu]);

    const handleCheckboxChange = useCallback(() => {
      onToggleSelect(guest.id);
    }, [guest.id, onToggleSelect]);

    const handleRsvpPillChange = useCallback(
      (s: RsvpStatus) => {
        onRsvpChange(guest.id, s);
      },
      [guest.id, onRsvpChange]
    );

    const handleTablePickerChange = useCallback(
      (tableId: string | null) => {
        onTableChange(guest.id, tableId);
      },
      [guest.id, onTableChange]
    );

    const handleRowClick = useCallback(() => {
      if (!isTemp) {
        onClick(guest);
      }
    }, [isTemp, guest, onClick]);

    if (process.env.NODE_ENV === "development") {
      console.log(`[GuestRow] Rendered guest: ${guest.first_name} ${guest.last_name || ""}`);
    }

    const shouldAnimate = index < 10;

    return (
      <tr
        onClick={handleRowClick}
        style={shouldAnimate ? { animationDelay: `${index * 30}ms` } : undefined}
        className={cn(
          "group cursor-pointer transition-colors duration-200 border-b border-border/10 last:border-0",
          shouldAnimate ? "animate-fade-in-up" : "opacity-100",
          isSelected ? "bg-primary/5" : "even:bg-muted/5 odd:bg-transparent hover:bg-primary/[0.03]",
          isTemp && "pointer-events-none bg-gradient-to-r from-gray-50 via-pink-50/30 to-gray-50 bg-[length:200%_100%] animate-shimmer opacity-85",
          isSyncing && "animate-soft-pulse"
        ) }
      >
        <td className="px-4 py-2.5 border-r border-border/65" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isTemp}
            onChange={handleCheckboxChange}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-50"
          />
        </td>
        <td className="px-3 py-2.5 border-r border-border/65">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm",
                gradient
              )}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {mainName}
              </p>
              {subtext && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {subtext}
                </p>
              )}
              {!subtext && guest.plus_one && (
                <p className="truncate text-[11px] text-muted-foreground">
                  +1 {guest.plus_one_name ?? ""}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 border-r border-border/65" onClick={(e) => e.stopPropagation()}>
          <RsvpPill status={guest.rsvp_status} onChange={handleRsvpPillChange} readonly={isTemp} isSyncing={isSyncing} />
        </td>
        <td className="hidden lg:table-cell px-3 py-2.5 border-r border-border/65">
          <div className="flex flex-wrap gap-1">
            {(guest.tags ?? []).slice(0, 3).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
            {(guest.tags ?? []).length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{(guest.tags ?? []).length - 3}
              </span>
            )}
          </div>
        </td>
        <td className="hidden lg:table-cell px-3 py-2.5 border-r border-border/65" onClick={(e) => e.stopPropagation()}>
          <TablePicker
            selectedTableId={guest.table_id}
            tables={tables}
            onChange={handleTablePickerChange}
            readonly={isTemp}
          />
        </td>
        <td className="hidden xl:table-cell px-3 py-2.5 text-xs text-muted-foreground border-r border-border/65">
          {guest.group_name || "—"}
        </td>
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              disabled={isTemp}
              onClick={(e) => {
                e.stopPropagation();
                if (!showMenu) updateCoords();
                setShowMenu(!showMenu);
              }}
              className="rounded-lg p-1.5 text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 hover:bg-muted/50 hover:text-foreground disabled:opacity-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && mounted && coords && createPortal(
              <div
                ref={menuRef}
                style={{
                  position: "absolute",
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  zIndex: 99999,
                  transition: "none",
                }}
                className="w-36 rounded-xl border border-border/40 bg-white/95 p-1 shadow-xl shadow-black/5 backdrop-blur-sm transition-none animate-scale-in origin-top-right"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(guest);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/50"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editează
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(guest.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Șterge
                </button>
              </div>,
              document.body
            )}
          </div>
        </td>
      </tr>
    );
  },
  (prev, next) => {
    // Only re-render if guest row specific fields change
    const sameSubGuests =
      (!prev.guest.subGuests && !next.guest.subGuests) ||
      (!!prev.guest.subGuests && !!next.guest.subGuests &&
        prev.guest.subGuests.length === next.guest.subGuests.length &&
        prev.guest.subGuests.every((sg, i) => {
          const psg = next.guest.subGuests?.[i];
          return !!psg && sg.first_name === psg.first_name && sg.last_name === psg.last_name && sg.rsvp_status === psg.rsvp_status;
        }));

    return (
      prev.isSelected === next.isSelected &&
      prev.isSyncing === next.isSyncing &&
      prev.guest.id === next.guest.id &&
      prev.guest.first_name === next.guest.first_name &&
      prev.guest.last_name === next.guest.last_name &&
      prev.guest.rsvp_status === next.guest.rsvp_status &&
      prev.guest.table_id === next.guest.table_id &&
      (prev.guest.tags || []).join(",") === (next.guest.tags || []).join(",") &&
      sameSubGuests
    );
  }
);

// ── Mobile Row (Memoized for high-performance mobile devices) ──
type MobileGuestRowProps = {
  guest: GuestWithTable;
  isSelected: boolean;
  isSyncing: boolean;
  onToggleSelect: (id: string) => void;
  onRsvpChange: (id: string, status: RsvpStatus) => void;
  onClick: (guest: GuestWithTable) => void;
  index: number;
};

const MobileGuestRow = React.memo(
  function MobileGuestRow({
    guest,
    isSelected,
    isSyncing,
    onToggleSelect,
    onRsvpChange,
    onClick,
    index,
  }: MobileGuestRowProps) {
    const { mainName, subtext } = formatGuestName(guest);
    const initials = getInitials(guest);
    const gradient = getAvatarGradient(mainName);

    const isTemp = guest.id.startsWith("temp-");

    const handleCheckboxChange = useCallback(() => {
      onToggleSelect(guest.id);
    }, [guest.id, onToggleSelect]);

    const handleRsvpChangeCallback = useCallback(
      (s: RsvpStatus) => {
        onRsvpChange(guest.id, s);
      },
      [guest.id, onRsvpChange]
    );

    const handleRowClick = useCallback(() => {
      if (!isTemp) {
        onClick(guest);
      }
    }, [isTemp, guest, onClick]);

    if (process.env.NODE_ENV === "development") {
      console.log(`[MobileGuestRow] Rendered guest: ${guest.first_name} ${guest.last_name || ""}`);
    }

    const shouldAnimate = index < 10;

    return (
      <div
        onClick={handleRowClick}
        style={shouldAnimate ? { animationDelay: `${index * 30}ms` } : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-3 transition-colors duration-200 active:bg-muted/30",
          shouldAnimate ? "animate-fade-in-up" : "opacity-100",
          isSelected && "bg-primary/5",
          isTemp && "pointer-events-none bg-gradient-to-r from-gray-50 via-pink-50/30 to-gray-50 bg-[length:200%_100%] animate-shimmer opacity-85",
          isSyncing && "animate-soft-pulse"
        )}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isTemp}
            onChange={handleCheckboxChange}
            className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/30 disabled:opacity-50"
          />
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white shadow-sm",
            gradient
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{mainName}</p>
          <div className="mt-0.5 flex items-center gap-2">
            {subtext ? (
              <span className="truncate text-[11px] text-muted-foreground">{subtext}</span>
            ) : guest.plus_one ? (
              <span className="text-[11px] text-muted-foreground">
                +1 {guest.plus_one_name ?? ""}
              </span>
            ) : null}
            {guest.seating_tables && (
              <span className="text-[11px] text-indigo-600 font-medium">
                {guest.seating_tables.name}
              </span>
            )}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <RsvpPill status={guest.rsvp_status} onChange={handleRsvpChangeCallback} readonly={isTemp} isSyncing={isSyncing} />
        </div>
      </div>
    );
  },
  (prev, next) => {
    const sameSubGuests =
      (!prev.guest.subGuests && !next.guest.subGuests) ||
      (!!prev.guest.subGuests && !!next.guest.subGuests &&
        prev.guest.subGuests.length === next.guest.subGuests.length &&
        prev.guest.subGuests.every((sg, i) => {
          const psg = next.guest.subGuests?.[i];
          return !!psg && sg.first_name === psg.first_name && sg.last_name === psg.last_name && sg.rsvp_status === psg.rsvp_status;
        }));

    return (
      prev.isSelected === next.isSelected &&
      prev.isSyncing === next.isSyncing &&
      prev.guest.id === next.guest.id &&
      prev.guest.first_name === next.guest.first_name &&
      prev.guest.last_name === next.guest.last_name &&
      prev.guest.rsvp_status === next.guest.rsvp_status &&
      prev.guest.table_id === next.guest.table_id &&
      sameSubGuests
    );
  }
);
