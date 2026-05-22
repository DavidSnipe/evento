"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  CornerDownRight,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { GuestWithTable, RsvpStatus } from "@/types/guests";
import { GUEST_TAGS } from "@/types/guests";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FilterMode = "all" | "unassigned" | "assigned";
type SortOption = "last_name" | "first_name" | "rsvp" | "table" | "family";

type GuestSidebarProps = {
  guests: GuestWithTable[];
  selectedGuestId: string | null;
  onSelectGuest: (guestId: string | null) => void;
  onDragStart?: (guestId: string) => void;
  onDragEnd?: () => void;
  className?: string;
  headerAction?: React.ReactNode;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function guestName(g: GuestWithTable) {
  // Traditional Romanian display: Last Name first
  return g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
}

function getInitials(g: GuestWithTable): string {
  const f = g.first_name?.[0] ?? "";
  const l = g.last_name?.[0] ?? "";
  return g.last_name ? `${l}${f}`.toUpperCase() : f.toUpperCase() || "?";
}

function getRsvpIcon(status: RsvpStatus) {
  switch (status) {
    case "accepted":
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    case "declined":
      return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
    default:
      return <HelpCircle className="h-3.5 w-3.5 text-amber-500" />;
  }
}

function coupleNames(primary: GuestWithTable, partner: GuestWithTable) {
  const pLast = primary.last_name?.trim();
  const partnerLast = partner.last_name?.trim();
  
  if (pLast && partnerLast && pLast.toLowerCase() === partnerLast.toLowerCase()) {
    return `${primary.first_name} & ${partner.first_name} ${pLast}`;
  }
  
  const pName = pLast ? `${primary.first_name} ${pLast}` : primary.first_name;
  const partnerName = partnerLast ? `${partner.first_name} ${partnerLast}` : partner.first_name;
  return `${pName} & ${partnerName}`;
}

export function GuestSidebar({
  guests,
  selectedGuestId,
  onSelectGuest,
  onDragStart,
  onDragEnd,
  className,
  headerAction,
}: GuestSidebarProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [rsvpFilter, setRsvpFilter] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("family");
  
  // Collapse filter settings accordion
  const [showFilters, setShowFilters] = useState(false);

  /* ---------- derived & filtered guests ---------- */
  const displayedGuestsList = useMemo(() => {
    // Identify couple sub-guests
    const couplePartnersByParentId = new Map<string, GuestWithTable>();
    guests.forEach((g) => {
      if (g.parent_id && g.relationship_type === "couple") {
        couplePartnersByParentId.set(g.parent_id, g);
      }
    });

    // 1. Filter
    const filtered = guests.filter((g) => {
      // Filter out couple sub-guests from being separate rows
      if (g.parent_id && g.relationship_type === "couple") return false;

      // Base assignment filter
      if (filterMode === "unassigned" && g.table_id) return false;
      if (filterMode === "assigned" && !g.table_id) return false;

      // RSVP filter
      if (rsvpFilter !== "all" && g.rsvp_status !== rsvpFilter) return false;

      // Tag filter
      if (selectedTag !== "all" && !g.tags?.includes(selectedTag)) return false;

      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const fullName = `${g.first_name} ${g.last_name || ""}`.toLowerCase();
        const traditionalName = `${g.last_name || ""} ${g.first_name}`.toLowerCase();
        const group = (g.group_name ?? "").toLowerCase();
        
        let partnerMatch = false;
        const partner = couplePartnersByParentId.get(g.id);
        if (partner) {
          const pFullName = `${partner.first_name} ${partner.last_name || ""}`.toLowerCase();
          const pTraditionalName = `${partner.last_name || ""} ${partner.first_name}`.toLowerCase();
          const pGroup = (partner.group_name ?? "").toLowerCase();
          if (pFullName.includes(q) || pTraditionalName.includes(q) || pGroup.includes(q)) {
            partnerMatch = true;
          }
        }

        if (!fullName.includes(q) && !traditionalName.includes(q) && !group.includes(q) && !partnerMatch) return false;
      }

      return true;
    });

    // 2. Sort / Group
    let sorted: (GuestWithTable & { isSubGuest?: boolean; couplePartner?: GuestWithTable })[] = [];

    if (sortBy === "family") {
      // Find all primary guests
      const primaries = filtered.filter(g => !g.parent_id);
      primaries.sort((a, b) => {
        const nameA = `${a.last_name || ""} ${a.first_name}`.trim();
        const nameB = `${b.last_name || ""} ${b.first_name}`.trim();
        return nameA.localeCompare(nameB);
      });

      primaries.forEach(p => {
        sorted.push({ ...p, couplePartner: couplePartnersByParentId.get(p.id) });
        // Find sub-guests of this primary guest
        const subs = filtered.filter(g => g.parent_id === p.id);
        subs.sort((a, b) => a.first_name.localeCompare(b.first_name));
        subs.forEach(s => {
          sorted.push({ ...s, isSubGuest: true });
        });
      });

      // Leftover sub-guests whose parents are filtered out
      const remaining = filtered.filter(g => g.parent_id && !sorted.some(dg => dg.id === g.id));
      sorted.push(...remaining.map(r => ({ ...r, couplePartner: couplePartnersByParentId.get(r.id) })));
    } else {
      const mapped = filtered.map(g => ({ ...g, couplePartner: couplePartnersByParentId.get(g.id) }));
      sorted = [...mapped];
      if (sortBy === "first_name") {
        sorted.sort((a, b) => a.first_name.localeCompare(b.first_name));
      } else if (sortBy === "last_name") {
        sorted.sort((a, b) => {
          const nameA = `${a.last_name || ""} ${a.first_name}`.trim();
          const nameB = `${b.last_name || ""} ${b.first_name}`.trim();
          return nameA.localeCompare(nameB);
        });
      } else if (sortBy === "rsvp") {
        sorted.sort((a, b) => a.rsvp_status.localeCompare(b.rsvp_status));
      } else if (sortBy === "table") {
        sorted.sort((a, b) => {
          if (a.table_id && !b.table_id) return -1;
          if (!a.table_id && b.table_id) return 1;
          // Sort by table name if both assigned
          const nameA = a.seating_tables?.name || "";
          const nameB = b.seating_tables?.name || "";
          return nameA.localeCompare(nameB);
        });
      }
    }

    return sorted;
  }, [guests, search, filterMode, rsvpFilter, selectedTag, sortBy]);

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-full overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-xl backdrop-blur-lg",
        className
      )}
    >
      {/* ── Header: Search & Basic Controls ──────────────── */}
      <div className="space-y-3 p-4 pb-3 border-b border-border/40 bg-white/40">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-semibold text-slate-800 flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            Lista Invitați
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {displayedGuestsList.length}
            </span>
            {headerAction}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ro.seating.search.placeholder}
            className="h-9 pl-9 pr-8 text-sm rounded-xl"
          />
        </div>

        {/* Sorting and Filter Toggle */}
        <div className="flex gap-2">
          {/* Sorting */}
          <div className="flex-1 relative">
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-input bg-transparent font-medium text-slate-700 focus-visible:outline-none"
            >
              <option value="family">Sortare după Familie</option>
              <option value="last_name">Nume Familie</option>
              <option value="first_name">Prenume</option>
              <option value="rsvp">Status RSVP</option>
              <option value="table">După Masă</option>
            </select>
          </div>

          {/* Advanced Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("h-8 rounded-lg px-2 text-xs gap-1", showFilters && "bg-slate-100")}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtre
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {/* Advanced Filters Drawer */}
        {showFilters && (
          <div className="p-3 rounded-xl border border-slate-100 bg-white/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Assignment Status */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Repartizare</span>
              <div className="flex gap-1">
                {(["all", "unassigned", "assigned"] as FilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={cn(
                      "flex-1 py-1 text-[11px] font-medium rounded-lg border transition-all",
                      filterMode === mode
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : "bg-white border-slate-100 text-muted-foreground hover:bg-slate-50"
                    )}
                  >
                    {mode === "all" ? "Toți" : mode === "unassigned" ? "Nerepart." : "Repart."}
                  </button>
                ))}
              </div>
            </div>

            {/* RSVP status */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Status RSVP</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { val: "all", lbl: "Toți" },
                  { val: "accepted", lbl: "Confirmat" },
                  { val: "pending", lbl: "În așteptare" },
                  { val: "declined", lbl: "Refuzat" }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setRsvpFilter(item.val)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all",
                      rsvpFilter === item.val
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white border-slate-150 text-muted-foreground hover:bg-slate-50"
                    )}
                  >
                    {item.lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Tag / Categorie</span>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-slate-50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedTag("all")}
                  className={cn(
                    "px-1.5 py-0.5 text-[9px] font-medium rounded-md border transition-all",
                    selectedTag === "all"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white border-slate-150 text-muted-foreground hover:bg-slate-100"
                  )}
                >
                  Toate
                </button>
                {GUEST_TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => setSelectedTag(tag.value)}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-medium rounded-md border transition-all flex items-center gap-1",
                      selectedTag === tag.value
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white border-slate-150 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Guest List ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
        {displayedGuestsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">
              {search.trim()
                ? `Niciun invitat pentru „${search.trim()}”`
                : "Nu s-au găsit invitați."}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {displayedGuestsList.map((guest) => {
              const isSelected = guest.id === selectedGuestId;
              const isAssigned = !!guest.table_id;
              const initials = getInitials(guest);

              return (
                <li key={guest.id} className="flex items-center">
                  {/* Indentation for spouses/children */}
                  {guest.isSubGuest && (
                    <CornerDownRight className="h-4.5 w-4.5 text-slate-400/70 ml-2 mr-0.5 shrink-0" />
                  )}

                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", guest.id);
                      e.dataTransfer.setData("guestId", guest.id);
                      onDragStart?.(guest.id);
                    }}
                    onDragEnd={() => {
                      onDragEnd?.();
                    }}
                    onClick={() => onSelectGuest(isSelected ? null : guest.id)}
                    className={cn(
                      "group flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all border border-transparent shadow-sm bg-white cursor-grab active:cursor-grabbing",
                      isSelected
                        ? "bg-primary/10 border-primary/30 ring-2 ring-primary/10 shadow-sm"
                        : "hover:bg-slate-50 hover:border-slate-100",
                      guest.isSubGuest && "text-slate-650"
                    )}
                  >
                    {/* Initials avatar */}
                    {guest.couplePartner ? (
                      <div className="relative w-12 h-8.5 shrink-0 flex items-center">
                        <span
                          className={cn(
                            "absolute left-0 top-0 flex h-7.5 w-7.5 items-center justify-center rounded-full text-[9px] font-bold shadow-inner border border-white bg-slate-100 text-slate-600 z-10 transition-colors",
                            isAssigned && "bg-emerald-50 text-emerald-700"
                          )}
                          title={guest.first_name}
                        >
                          {initials}
                        </span>
                        <span
                          className={cn(
                            "absolute right-1 bottom-0 flex h-7.5 w-7.5 items-center justify-center rounded-full text-[9px] font-bold shadow-inner border border-white bg-slate-200 text-slate-500 transition-colors",
                            isAssigned && "bg-emerald-100 text-emerald-600"
                          )}
                          title={guest.couplePartner.first_name}
                        >
                          {getInitials(guest.couplePartner)}
                        </span>
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-inner border border-white transition-colors",
                          isAssigned
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {initials}
                      </span>
                    )}

                    {/* Name + Details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-slate-800">
                          {guest.couplePartner ? coupleNames(guest, guest.couplePartner) : guestName(guest)}
                        </span>
                        
                        {/* RSVP Mini Indicator */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {getRsvpIcon(guest.rsvp_status)}
                          {guest.couplePartner && getRsvpIcon(guest.couplePartner.rsvp_status)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {/* Group tag */}
                        {guest.group_name && (
                          <span className="inline-block truncate text-[9px] px-1 bg-slate-100 text-slate-500 rounded border border-slate-200">
                            {guest.group_name}
                          </span>
                        )}
                        {/* If godparents tag, show purple tag */}
                        {(guest.tags?.includes("godparents") || guest.couplePartner?.tags?.includes("godparents")) && (
                          <span className="inline-block text-[9px] px-1 bg-purple-100 text-purple-700 rounded border border-purple-200 font-semibold">
                            Nași
                          </span>
                        )}
                        {/* If vip tag, show vip badge */}
                        {(guest.tags?.includes("vip") || guest.couplePartner?.tags?.includes("vip")) && (
                          <span className="inline-block text-[9px] px-1 bg-amber-100 text-amber-700 rounded border border-amber-200 font-semibold">
                            VIP
                          </span>
                        )}
                        {/* Plus one */}
                        {guest.plus_one && !guest.couplePartner && (
                          <span className="inline-block text-[9px] px-1 bg-pink-100 text-pink-700 rounded border border-pink-200 font-medium">
                            +1
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Table Assignment status */}
                    <div className="shrink-0 flex items-center justify-end">
                      {isAssigned ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full max-w-[80px] truncate">
                          {guest.seating_tables?.name}
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">
                          Liber
                        </span>
                      )}
                    </div>
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
