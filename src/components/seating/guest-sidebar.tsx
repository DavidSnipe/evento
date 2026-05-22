"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { GuestWithTable } from "@/types/guests";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FilterMode = "all" | "unassigned" | "assigned";

type GuestSidebarProps = {
  guests: GuestWithTable[];
  selectedGuestId: string | null;
  onSelectGuest: (guestId: string | null) => void;
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function guestName(g: GuestWithTable) {
  return g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
}

function getInitials(g: GuestWithTable): string {
  const f = g.first_name?.[0] ?? "";
  const l = g.last_name?.[0] ?? "";
  return g.last_name ? `${l}${f}`.toUpperCase() : f.toUpperCase() || "?";
}

function getColor(name: string | null): string {
  if (!name) return "bg-muted";
  const colors = [
    "bg-pink-100 text-pink-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ------------------------------------------------------------------ */
/*  Filter pills config                                                */
/* ------------------------------------------------------------------ */

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: "all", label: ro.seating.filters.all },
  { key: "unassigned", label: ro.seating.filters.unassigned },
  { key: "assigned", label: ro.seating.filters.assigned },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GuestSidebar({
  guests,
  selectedGuestId,
  onSelectGuest,
  className,
}: GuestSidebarProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  /* ---------- derived ---------- */

  const filtered = guests.filter((g) => {
    // filter mode
    if (filter === "unassigned" && g.table_id) return false;
    if (filter === "assigned" && !g.table_id) return false;

    // search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const name = guestName(g).toLowerCase();
      const group = (g.group_name ?? "").toLowerCase();
      if (!name.includes(q) && !group.includes(q)) return false;
    }

    return true;
  });

  return (
    <aside
      className={cn(
        "glass-panel flex max-h-[calc(100vh-10rem)] w-full flex-col overflow-hidden rounded-2xl",
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="space-y-3 border-b border-border/40 p-4 pb-3">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ro.seating.search.placeholder}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {FILTERS.map(({ key, label }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            );
          })}

          {/* Count badge */}
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* ── Guest list ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search.trim()
                ? `Niciun invitat pentru „${search.trim()}"`
                : ro.guests.emptyTitle}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((guest) => {
              const isSelected = guest.id === selectedGuestId;
              const isAssigned = !!guest.table_id;
              const initials = getInitials(guest);
              const avatarColor = getColor(guest.group_name);

              return (
                <li key={guest.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("guestId", guest.id);
                    }}
                    onClick={() =>
                      onSelectGuest(isSelected ? null : guest.id)
                    }
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all cursor-grab active:cursor-grabbing",
                      isSelected
                        ? "bg-accent/20 ring-2 ring-accent shadow-sm"
                        : "hover:bg-muted/50",
                    )}
                  >
                    {/* Initials avatar */}
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        avatarColor,
                      )}
                    >
                      {initials}
                    </span>

                    {/* Name + group */}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {guestName(guest)}
                        </span>
                        {guest.plus_one && (
                          <span className="shrink-0 rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-pink-600">
                            +1
                          </span>
                        )}
                      </span>
                      {guest.group_name && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {guest.group_name}
                        </span>
                      )}
                    </span>

                    {/* Assignment dot */}
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full transition-colors",
                        isAssigned ? "bg-emerald-500" : "bg-gray-300",
                      )}
                      title={
                        isAssigned
                          ? guest.seating_tables?.name ?? ro.seating.filters.assigned
                          : ro.seating.filters.unassigned
                      }
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
