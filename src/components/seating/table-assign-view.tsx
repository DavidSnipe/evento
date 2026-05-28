"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, UserMinus, ChevronDown, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RsvpBadge } from "@/components/guests/rsvp-badge";
import type { TableWithGuests } from "@/lib/seating/queries";
import type { GuestWithTable } from "@/types/guests";

type TableAssignViewProps = {
  guests: GuestWithTable[];
  tables: TableWithGuests[];
  onAssignGuest: (guestId: string, tableId: string) => void;
  onRemoveGuest: (guestId: string) => void;
};

function getAvatarHexColors(name: string): { color1: string; color2: string } {
  const gradients = [
    { color1: "var(--ev-rose-100)", color2: "var(--ev-rose-200)" },
    { color1: "var(--ev-rose-50)", color2: "var(--ev-rose-100)" },
    { color1: "var(--ev-rose-300)", color2: "var(--ev-rose-400)" },
    { color1: "var(--ev-rose-400)", color2: "var(--ev-rose-500)" },
    { color1: "var(--ev-rose-500)", color2: "var(--ev-rose-600)" },
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

export function TableAssignView({
  guests,
  tables,
  onAssignGuest,
  onRemoveGuest,
}: TableAssignViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState<"all" | "confirmed" | "pending" | "unassigned">("all");
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvp_status === "accepted").length,
    assigned: guests.filter((g) => g.table_id).length,
    unassigned: guests.filter((g) => !g.table_id).length,
  }), [guests]);

  // Exclude decorative objects from table assign view
  const actualTables = useMemo(() => {
    return tables.filter((t) => {
      try {
        const notes = t.notes || "";
        const isObj = notes.includes('"objectType"') || notes.includes("objectType");
        return !isObj;
      } catch {
        return true;
      }
    });
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (!searchQuery && rsvpFilter === "all") return actualTables;
    return actualTables.filter((table) => {
      const tableGuests = table.guests;
      if (rsvpFilter === "unassigned") return tableGuests.length < table.capacity;
      if (rsvpFilter === "confirmed") return tableGuests.some((g) => g.rsvp_status === "accepted");
      if (rsvpFilter === "pending") return tableGuests.some((g) => g.rsvp_status === "pending");
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGuests = tableGuests.some((g) =>
          `${g.first_name} ${g.last_name ?? ""}`.toLowerCase().includes(q) ||
          (g.group_name || "").toLowerCase().includes(q)
        );
        const matchesTable = table.name.toLowerCase().includes(q);
        return matchesGuests || matchesTable;
      }
      return true;
    });
  }, [actualTables, searchQuery, rsvpFilter]);

  const handleToggle = (tableId: string) => {
    setExpandedTableId((prev) => (prev === tableId ? null : tableId));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: "var(--ev-bg-canvas)" }}>
      {/* Header and filters panel */}
      <div className="bg-white/90 backdrop-blur-md px-4 pt-4 pb-2.5 border-b border-border-rose-18/30 shrink-0">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
          {[
            { label: "Total Invitați", value: counts.total, color: "text-[var(--ev-text-primary)]" },
            { label: "Confirmați", value: counts.confirmed, color: "text-emerald-500" },
            { label: "Alocați la mese", value: counts.assigned, color: "text-[var(--ev-rose-500)]" },
            { label: "Nealocați", value: counts.unassigned, color: counts.unassigned > 0 ? "text-amber-500" : "text-text-subtle" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-[12px] border border-border-rose-18/30 px-3 py-2 shadow-[0_1px_4px_rgba(180,100,120,0.03)]"
            >
              <div className={cn("font-sans text-xl font-bold tracking-tight leading-none", s.color)}>
                {s.value}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-text-subtle mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută masă sau invitat..."
            className="h-10 w-full rounded-[10px] border border-border-rose-18/30 bg-white pl-9.5 pr-8 text-xs font-semibold text-text-secondary outline-none transition-all shadow-[0_1px_3px_rgba(180,100,120,0.02)]"
            style={{ fontFamily: "Inter, sans-serif" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-secondary hover:bg-slate-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap pb-1">
          {[
            { id: "all" as const, label: "Toate mesele" },
            { id: "confirmed" as const, label: "Mese cu confirmați" },
            { id: "pending" as const, label: "Mese cu neconfirmați" },
            { id: "unassigned" as const, label: "Mese libere / parțiale" },
          ].map((opt) => {
            const isActive = rsvpFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setRsvpFilter(opt.id)}
                className={cn(
                  "rounded-[20px] px-3 py-1 border text-[10.5px] font-bold transition-all duration-200 cursor-pointer",
                  isActive
                    ? "shadow-[0_1px_4px_rgba(180,100,120,0.05)]"
                    : "bg-white border-border-rose-18/40 text-text-secondary hover:bg-slate-50"
                )}
                style={isActive ? { background: "var(--ev-rose-50)", borderColor: "var(--ev-rose-100)", color: "var(--ev-rose-500)" } : undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable tables layout */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 scrollbar-thin">
        {filteredTables.length === 0 ? (
          <div className="py-20 text-center text-xs font-semibold text-text-subtle bg-white/40 rounded-[18px] border border-dashed border-border-rose-18/30 p-8">
            Nicio masă găsită cu criteriile selectate
          </div>
        ) : (
          <div className="grid gap-2.5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                guests={guests}
                isExpanded={expandedTableId === table.id}
                onToggle={() => handleToggle(table.id)}
                onAssignGuest={onAssignGuest}
                onRemoveGuest={onRemoveGuest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Individual Table Card Component ──────────────────────────────────────────

interface TableCardProps {
  table: TableWithGuests;
  guests: GuestWithTable[];
  isExpanded: boolean;
  onToggle: () => void;
  onAssignGuest: (guestId: string, tableId: string) => void;
  onRemoveGuest: (guestId: string) => void;
}

function TableCard({
  table,
  guests,
  isExpanded,
  onToggle,
  onAssignGuest,
  onRemoveGuest,
}: TableCardProps) {
  const [addSearch, setAddSearch] = useState("");

  const tableGuests = useMemo(() => {
    return guests.filter((g) => g.table_id === table.id);
  }, [guests, table.id]);

  const unassignedGuests = useMemo(() => {
    return guests.filter((g) => !g.table_id);
  }, [guests]);

  const isFull = tableGuests.length >= table.capacity;
  const matchingUnassigned = useMemo(() => {
    if (!addSearch.trim()) return unassignedGuests.slice(0, 5);
    const q = addSearch.toLowerCase();
    return unassignedGuests.filter(
      (g) =>
        `${g.first_name} ${g.last_name ?? ""}`.toLowerCase().includes(q) ||
        (g.group_name || "").toLowerCase().includes(q)
    );
  }, [unassignedGuests, addSearch]);

  const tableNumber = table.name.replace(/\D/g, "") || table.name;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.88)',
        borderRadius: 12,
        border: '1px solid rgba(210,170,185,0.22)',
        boxShadow: '0 1px 3px rgba(180,100,120,0.06)',
        padding: '12px 14px',
        backdropFilter: 'blur(8px)',
        transition: 'box-shadow 0.15s ease',
      }}
      className={cn(
        "bg-white transition-all duration-300 overflow-hidden",
        isExpanded && "shadow-md"
      )}
    >
      {/* Card Header */}
      <div
        onClick={onToggle}
        className="cursor-pointer select-none"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Număr masă */}
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ev-text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Masa {tableNumber}
          </span>
          {/* Chevron */}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-subtle shrink-0 transition-transform duration-300",
              isExpanded && "rotate-180 text-[var(--ev-rose-500)]"
            )}
          />
        </div>

        {/* Ocupancy bar */}
        <div style={{ height: 3, borderRadius: 2, background: 'var(--ev-rose-100)', marginTop: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${(tableGuests.length / table.capacity) * 100}%`,
            background: 'var(--ev-rose-500)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--ev-text-muted)', fontFamily: 'Inter, sans-serif' }}>
            {tableGuests.length}/{table.capacity} locuri
          </span>
        </div>

        {/* Avatar strip invitați (max 5 vizibili + overcount) */}
        {tableGuests.length > 0 && (
          <div style={{ display: 'flex', marginTop: 8, gap: -4, alignItems: 'center' }}>
            {tableGuests.slice(0, 5).map(g => {
              const fullName = g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
              const initialsVal = getInitials(g.first_name, g.last_name);
              const colors = getAvatarHexColors(fullName);
              return (
                <div key={g.id} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${colors.color1}, ${colors.color2})`,
                  border: '1.5px solid rgba(255,255,255,0.95)',
                  fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.98)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: -4, fontFamily: 'Inter, sans-serif',
                }} title={fullName}>
                  {initialsVal}
                </div>
              );
            })}
            {tableGuests.length > 5 && (
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--ev-rose-100)', border: '1.5px solid rgba(255,255,255,0.95)',
                fontSize: 8, fontWeight: 700, color: 'var(--ev-rose-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: -4, fontFamily: 'Inter, sans-serif',
              }}>
                +{tableGuests.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-border-rose-18/30 animate-scale-in origin-top">
          {/* Seated Guests Section */}
          <div className="p-4">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--ev-rose-500)] mb-2">
              Invitați repartizați ({tableGuests.length})
            </div>

            {tableGuests.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-border-rose-18/30 rounded-[10px] text-[10.5px] font-medium text-text-subtle bg-slate-50/50">
                Fără invitați. Adaugă folosind formularul de mai jos.
              </div>
            ) : (
              <div className="space-y-1.5">
                {tableGuests.map((g) => {
                  const fullName = g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
                  const initials = getInitials(g.first_name, g.last_name);
                  const colors = getAvatarHexColors(fullName);

                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-2.5 p-2 rounded-[10px] border border-border-rose-18/20 transition-colors"
                      style={{ background: "rgba(255,240,243,0.3)" }}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                        style={{
                          background: `linear-gradient(135deg, ${colors.color1}, ${colors.color2})`,
                          border: "1px solid rgba(255,255,255,0.9)",
                          color: "rgba(255,255,255,0.98)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">
                          {fullName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <RsvpBadge status={g.rsvp_status} className="text-[8px] px-1 py-0" />
                          {g.group_name && (
                            <span className="text-[9px] font-semibold text-text-subtle truncate max-w-[80px]">
                              · {g.group_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveGuest(g.id)}
                        className="p-1 rounded-lg text-text-subtle cursor-pointer transition-colors"
                        style={{ color: "var(--ev-text-muted)" }}
                        title="Elimină de la masă"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Guests Section */}
          {!isFull && (
            <div className="p-4 pt-0 border-t border-border-rose-18/10">
              <div className="flex items-center justify-between mb-2 mt-3 text-[9px] font-bold uppercase tracking-wider text-text-subtle">
                <span className="flex items-center gap-1">
                  <UserPlus className="h-3 w-3 text-emerald-600" />
                  Adaugă la masă
                </span>
                <span className="text-text-faint">{table.capacity - tableGuests.length} locuri libere</span>
              </div>

              {/* Search input for adding */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-text-subtle" />
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder={
                    unassignedGuests.length > 0 ? "Caută invitat nealocat..." : "Toți sunt alocați"
                  }
                  disabled={unassignedGuests.length === 0}
                  className="h-8 w-full rounded-[8px] border border-border-rose-18/20 pl-7.5 pr-2.5 text-xs outline-none transition-all placeholder:text-text-subtle/50 font-medium"
                  style={{ background: "rgba(243,243,245,0.95)", color: "var(--ev-text-primary)", fontFamily: "Inter, sans-serif" }}
                />
              </div>

              {/* Unassigned results list */}
              <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
                {unassignedGuests.length === 0 ? (
                  <div className="text-center text-[10px] font-medium text-text-faint py-2">
                    Toți invitații au locuri la mese.
                  </div>
                ) : matchingUnassigned.length === 0 ? (
                  <div className="text-center text-[10px] font-medium text-text-faint py-2">
                    Niciun invitat nealocat găsit.
                  </div>
                ) : (
                  matchingUnassigned.map((g) => {
                    const fullName = g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
                    const initials = getInitials(g.first_name, g.last_name);
                    const colors = getAvatarHexColors(fullName);

                    return (
                      <button
                        key={g.id}
                        onClick={() => {
                          onAssignGuest(g.id, table.id);
                          setAddSearch("");
                        }}
                        className="flex w-full items-center gap-2 p-1.5 rounded-[8px] border border-transparent text-left cursor-pointer transition-all duration-150"
                        style={{ background: "transparent" }}
                      >
                        <div
                          className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                          style={{
                            background: `linear-gradient(135deg, ${colors.color1}, ${colors.color2})`,
                            border: "1px solid rgba(255,255,255,0.9)",
                            color: "rgba(255,255,255,0.98)",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {fullName}
                          </div>
                          {g.group_name && (
                            <div className="text-[9px] text-text-subtle truncate font-medium">
                              {g.group_name}
                            </div>
                          )}
                        </div>
                        <span className="text-[9.5px] font-bold shrink-0 tracking-wide uppercase px-2 rounded py-0.5" style={{ color: "var(--ev-rose-500)" }}>
                          + Adaugă
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {isFull && (
            <div className="p-4 pt-0 border-t border-border-rose-18/10 flex justify-center mt-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-lg px-3 py-1" style={{ color: "hsl(var(--destructive))", background: "rgba(255,240,240,0.95)", border: "1px solid rgba(255,200,200,0.8)" }}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Masa este plină · {table.capacity}/{table.capacity} locuri ocupate
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
