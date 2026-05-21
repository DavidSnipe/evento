"use client";

import { cn } from "@/lib/utils";
import { MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { RsvpPill } from "@/components/guests/rsvp-pill";
import { TagBadge } from "@/components/guests/tag-badge";
import type { GuestWithTable, RsvpStatus } from "@/types/guests";

type GuestTableViewProps = {
  guests: GuestWithTable[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onDelete: (guestId: string) => void;
  onSelectGuest: (guest: GuestWithTable) => void;
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
  return `${f}${l}`;
}

export function GuestTableView({
  guests,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRsvpChange,
  onDelete,
  onSelectGuest,
}: GuestTableViewProps) {
  const allSelected = guests.length > 0 && selectedIds.size === guests.length;

  return (
    <div className="overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-border/30">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nume
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                RSVP
              </th>
              <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tag-uri
              </th>
              <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Masă
              </th>
              <th className="hidden xl:table-cell px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grup
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {guests.map((guest) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                isSelected={selectedIds.has(guest.id)}
                onToggleSelect={() => onToggleSelect(guest.id)}
                onRsvpChange={(s) => onRsvpChange(guest.id, s)}
                onDelete={() => onDelete(guest.id)}
                onClick={() => onSelectGuest(guest)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-border/20">
        {guests.map((guest) => (
          <MobileGuestRow
            key={guest.id}
            guest={guest}
            isSelected={selectedIds.has(guest.id)}
            onToggleSelect={() => onToggleSelect(guest.id)}
            onRsvpChange={(s) => onRsvpChange(guest.id, s)}
            onClick={() => onSelectGuest(guest)}
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

// ── Desktop Row ──
function GuestRow({
  guest,
  isSelected,
  onToggleSelect,
  onRsvpChange,
  onDelete,
  onClick,
}: {
  guest: GuestWithTable;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRsvpChange: (s: RsvpStatus) => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fullName = `${guest.first_name} ${guest.last_name ?? ""}`.trim();
  const gradient = getAvatarGradient(fullName);
  const initials = getInitials(guest.first_name, guest.last_name);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <tr
      className={cn(
        "group cursor-pointer transition-colors",
        isSelected ? "bg-primary/5" : "hover:bg-muted/30"
      )}
    >
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
        />
      </td>
      <td className="px-3 py-2.5" onClick={onClick}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm",
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
      </td>
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <RsvpPill status={guest.rsvp_status} onChange={onRsvpChange} />
      </td>
      <td className="hidden lg:table-cell px-3 py-2.5" onClick={onClick}>
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
      <td className="hidden lg:table-cell px-3 py-2.5" onClick={onClick}>
        {guest.seating_tables ? (
          <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {guest.seating_tables.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="hidden xl:table-cell px-3 py-2.5 text-xs text-muted-foreground" onClick={onClick}>
        {guest.group_name || "—"}
      </td>
      <td className="px-3 py-2.5">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-lg p-1.5 text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 hover:bg-muted/50 hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
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
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Șterge
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Mobile Row ──
function MobileGuestRow({
  guest,
  isSelected,
  onToggleSelect,
  onRsvpChange,
  onClick,
}: {
  guest: GuestWithTable;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRsvpChange: (s: RsvpStatus) => void;
  onClick: () => void;
}) {
  const fullName = `${guest.first_name} ${guest.last_name ?? ""}`.trim();
  const gradient = getAvatarGradient(fullName);
  const initials = getInitials(guest.first_name, guest.last_name);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted/30",
        isSelected && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/30"
      />
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm",
          gradient
        )}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {guest.plus_one && (
            <span className="text-[11px] text-muted-foreground">
              +1 {guest.plus_one_name ?? ""}
            </span>
          )}
          {guest.seating_tables && (
            <span className="text-[11px] text-indigo-600">{guest.seating_tables.name}</span>
          )}
        </div>
        {(guest.tags ?? []).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {(guest.tags ?? []).slice(0, 2).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <RsvpPill status={guest.rsvp_status} onChange={onRsvpChange} />
      </div>
    </div>
  );
}
