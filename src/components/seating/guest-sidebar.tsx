"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Users,
  CornerDownRight,
} from "lucide-react";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { GuestWithTable } from "@/types/guests";

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
  const [selectedTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("family");

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const totalGuests = guests.length;
  const unassigned = guests.filter((g) => !g.table_id).length;

  const activeTab = useMemo(() => {
    if (filterMode === "unassigned") return "unassigned";
    if (rsvpFilter === "accepted") return "confirmed";
    if (rsvpFilter === "pending") return "pending";
    return "all";
  }, [filterMode, rsvpFilter]);

  const setActiveTab = (tabKey: string) => {
    if (tabKey === "unassigned") {
      setFilterMode("unassigned");
      setRsvpFilter("all");
    } else if (tabKey === "confirmed") {
      setFilterMode("all");
      setRsvpFilter("accepted");
    } else if (tabKey === "pending") {
      setFilterMode("all");
      setRsvpFilter("pending");
    } else {
      setFilterMode("all");
      setRsvpFilter("all");
    }
  };

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
        "flex flex-col h-full w-full overflow-hidden select-none transition-all duration-350 ease-in-out",
        className
      )}
      style={{
        background: 'var(--ev-bg-sidebar)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--ev-border-soft)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 16px rgba(160,80,110,0.06)',
      }}
    >
      {/* ── Header: Title & Info ── */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--ev-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ev-text-primary)', fontFamily: 'Inter, sans-serif', margin: 0, letterSpacing: '-0.3px', lineHeight: 1 }}>
            Lista Invitați
          </h3>
          <p style={{ fontSize: 11, color: 'var(--ev-text-muted)', margin: '5px 0 0', fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em' }}>
            {totalGuests} persoane · {unassigned} nealocate
          </p>
        </div>
        {headerAction}
      </div>

      {/* Search Bar */}
      <div style={{
        margin: '0 14px 12px',
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 10,
        border: '1px solid rgba(210,170,185,0.25)',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        boxShadow: '0 1px 4px rgba(180,100,120,0.06)',
      }}>
        <Search size={14} color="var(--ev-text-muted)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ro.seating.search.placeholder || "Caută invitat..."}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, color: 'var(--ev-text-primary)', fontFamily: 'Inter, sans-serif', flex: 1,
          }}
        />
      </div>

      {/* Tab filters (Toți / Confirmați / Așteptare / Nealocați) */}
      <div style={{ display: 'flex', gap: 5, padding: '0 14px 10px', flexWrap: 'wrap' }}>
        {[
          { key: "all", label: "Toți", count: guests.length },
          { key: "confirmed", label: "Confirmați", count: guests.filter(g => g.rsvp_status === "accepted").length },
          { key: "pending", label: "Așteptare", count: guests.filter(g => g.rsvp_status === "pending").length },
          { key: "unassigned", label: "Nealocați", count: guests.filter(g => !g.table_id).length },
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{
            padding: '3px 9px', borderRadius: 20,
            fontSize: 12, fontWeight: activeTab === tab.key ? 600 : 500,
            fontFamily: 'Inter, sans-serif',
            background: activeTab === tab.key ? 'var(--ev-rose-500)' : 'rgba(255,255,255,0.6)',
            color: activeTab === tab.key ? 'rgba(255,255,255,0.98)' : 'var(--ev-text-secondary)',
            border: activeTab === tab.key ? 'none' : '1px solid var(--ev-border-soft)',
            cursor: 'pointer', transition: 'all 0.15s ease',
            boxShadow: activeTab === tab.key ? '0 2px 8px rgba(192,100,130,0.28)' : 'none',
          }}>
            {tab.label} {tab.count > 0 && <span style={{ opacity: 0.8 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Quick Sorting Dropdown */}
      <div style={{ padding: '0 14px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--ev-text-muted)', fontFamily: 'Inter, sans-serif', fontWeight: 550 }}>Sortat:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 11.5, color: 'var(--ev-text-secondary)', fontFamily: 'Inter, sans-serif', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <option value="family">Familie</option>
          <option value="last_name">Nume familie</option>
          <option value="first_name">Prenume</option>
          <option value="rsvp">Status RSVP</option>
          <option value="table">După masă</option>
        </select>
      </div>

      {/* ── Guest List ── */}
      <div className="flex-1 overflow-y-auto px-2 py-1" style={{ background: 'rgba(249, 244, 241, 0.45)' }}>
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
              const isDragging = draggingId === guest.id;

              return (
                <li key={guest.id} className="flex items-center" style={{ paddingLeft: guest.isSubGuest ? 16 : 0 }}>
                  {/* Indentation for spouses/children */}
                  {guest.isSubGuest && (
                    <CornerDownRight className="h-4.5 w-4.5 text-slate-400/70 mr-0.5 shrink-0" />
                  )}

                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", guest.id);
                      e.dataTransfer.setData("guestId", guest.id);
                      setDraggingId(guest.id);
                      onDragStart?.(guest.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      onDragEnd?.();
                    }}
                    onClick={() => onSelectGuest(isSelected ? null : guest.id)}
                    style={{
                      margin: '3px 6px',
                      padding: '9px 12px',
                      borderRadius: 12,
                      background: isDragging
                        ? 'rgba(192,100,130,0.08)'
                        : 'rgba(255,255,255,0.75)',
                      border: isDragging
                        ? '1.5px solid rgba(192,100,130,0.35)'
                        : '1px solid var(--ev-border-soft)',
                      boxShadow: isDragging ? 'var(--ev-shadow-md)' : 'var(--ev-shadow-sm)',
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'grab', transition: 'all 0.12s ease',
                      opacity: isDragging ? 0.85 : 1,
                      transform: isDragging ? 'scale(1.02) rotate(0.5deg)' : 'none',
                      width: '100%',
                    }}
                    className={cn(
                      "group text-left border border-transparent shadow-sm bg-white cursor-grab active:cursor-grabbing",
                      isSelected && "ring-2 ring-primary/20 bg-primary/10 border-primary/30"
                    )}
                  >
                    {/* Initials avatar */}
                    {guest.couplePartner ? (
                      <div style={{ position: 'relative', width: 36, height: 32, flexShrink: 0 }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0,
                          width: 24, height: 24, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${isAssigned ? 'var(--ev-rose-400)' : 'var(--ev-text-muted)'}, ${isAssigned ? 'var(--ev-rose-500)' : 'var(--ev-text-secondary)'})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.98)',
                          fontFamily: 'Inter, sans-serif',
                          boxShadow: '0 1px 4px rgba(160,80,110,0.15)',
                          border: '1px solid rgba(255,255,255,0.98)',
                          zIndex: 10,
                        }}>
                          {initials}
                        </div>
                        <div style={{
                          position: 'absolute', right: 0, bottom: 0,
                          width: 24, height: 24, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${!!guest.couplePartner.table_id ? 'var(--ev-rose-300)' : 'var(--ev-text-muted)'}, ${!!guest.couplePartner.table_id ? 'var(--ev-rose-400)' : 'var(--ev-text-secondary)'})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.98)',
                          fontFamily: 'Inter, sans-serif',
                          boxShadow: '0 1px 4px rgba(160,80,110,0.15)',
                          border: '1px solid rgba(255,255,255,0.98)',
                        }}>
                          {getInitials(guest.couplePartner)}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${isAssigned ? 'var(--ev-rose-400)' : 'var(--ev-text-muted)'}, ${isAssigned ? 'var(--ev-rose-500)' : 'var(--ev-text-secondary)'})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.98)',
                        fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 1px 4px rgba(160,80,110,0.15)',
                      }}>
                        {initials}
                      </div>
                    )}

                    {/* Name + Details */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ev-text-primary)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {guest.couplePartner ? coupleNames(guest, guest.couplePartner) : guestName(guest)}
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {guest.group_name && (
                          <span style={{ fontSize: 9.5, color: 'var(--ev-text-muted)', fontFamily: 'Inter, sans-serif' }}>
                            {guest.group_name}
                          </span>
                        )}
                        {guest.plus_one && !guest.couplePartner && (
                          <span style={{ fontSize: 9.5, color: 'var(--ev-rose-500)', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                            +1
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge masă / Liber */}
                    <span style={{
                      padding: '2px 8px', borderRadius: 12,
                      fontSize: 10.5, fontWeight: 600,
                      background: isAssigned ? 'rgba(192,100,130,0.1)' : 'rgba(230,220,225,0.5)',
                      color: isAssigned ? 'var(--ev-rose-500)' : 'var(--ev-text-muted)',
                      border: isAssigned ? '1px solid rgba(192,100,130,0.2)' : '1px solid rgba(210,190,200,0.3)',
                      fontFamily: 'Inter, sans-serif',
                      whiteSpace: 'nowrap',
                    }}>
                      {isAssigned ? (guest.seating_tables?.name ? (guest.seating_tables.name.startsWith("Masa") ? guest.seating_tables.name.replace(/^Masa\s+/i, "") : guest.seating_tables.name) : "M") : 'Liber'}
                    </span>
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
