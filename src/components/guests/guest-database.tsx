"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Search, Plus, Upload, X, LayoutList, LayoutGrid, ChevronDown, Trash2, Users, Tag, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuestWithTable, RsvpStatus, SeatingTableRow } from "@/types/guests";
import { GUEST_TAGS } from "@/types/guests";
import { GuestTableView } from "@/components/guests/guest-table-view";
import { GuestCardView } from "@/components/guests/guest-card-view";
import { GuestDetailPanel } from "@/components/guests/guest-detail-panel";
import { ImportModal } from "@/components/guests/import-modal";
import { RsvpPill } from "@/components/guests/rsvp-pill";
import { Card } from "@/components/ui/card";
import {
  bulkDeleteGuests,
} from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";

import { useGuestStats } from "@/hooks/guests/use-guest-stats";
import { useGuestFiltering, type SortKey } from "@/hooks/guests/use-guest-filtering";
import { useGuestOptimistic } from "@/hooks/guests/use-guest-optimistic";

type ViewMode = "table" | "cards";

type GuestDatabaseProps = {
  eventId: string;
  guests: GuestWithTable[];
  tables: SeatingTableRow[];
  stats: {
    total: number;
    accepted: number;
    pending: number;
    declined: number;
    seated: number;
  };
};

export function GuestDatabase({ eventId, guests, tables }: GuestDatabaseProps) {
  const [view, setView] = useState<ViewMode>("table");
  const sortLabels = {
    lastName: "Nume de familie",
    firstName: "Prenume",
    rsvp: "Status RSVP",
    table: "Masă",
    recent: "Adăugați recent",
  };
  const [search, setSearch] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<string | "no-table" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailGuest, setDetailGuest] = useState<GuestWithTable | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddText, setQuickAddText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Undo Import Rollback states
  const [rollbackData, setRollbackData] = useState<{ count: number; insertedIds: string[] } | null>(null);
  const rollbackTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Local async in-flight states to avoid transition blocking
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // 1. Optimistic updates hook
  const {
    localGuests,
    setLocalGuests,
    syncingIds,
    handleRsvpChange,
    handleTableChange,
    handleUpdateTags,
    handleUpdateField,
    handleDeleteGuest,
    handleBulkDelete,
    handleBulkRsvp,
    handleBulkAssignTable,
    handleAddSubGuest,
    handleDeleteSubGuest,
    handleUpdateSubField,
  } = useGuestOptimistic(eventId, guests, tables);

  // 2. Derive stats client-side instantly
  const computedStats = useGuestStats(localGuests);

  // 3. Debounced and memoized filtering
  const filteredGuests = useGuestFiltering({
    localGuests,
    search,
    rsvpFilter,
    tagFilter,
    tableFilter,
    sortBy,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    if (showSortDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSortDropdown]);

  const handleUndoImport = useCallback(() => {
    if (!rollbackData) return;
    const originalGuests = [...localGuests];
    const idsToDelete = new Set(rollbackData.insertedIds);
    
    // Optimistic delete rollbacked rows
    setLocalGuests((prev) => prev.filter((g) => !idsToDelete.has(g.id)));
    setRollbackData(null);
    if (rollbackTimeout.current) clearTimeout(rollbackTimeout.current);

    setIsUndoing(true);
    bulkDeleteGuests(eventId, rollbackData.insertedIds)
      .catch(() => {
        setLocalGuests(originalGuests);
        alert("Eroare la anularea importului.");
      })
      .finally(() => {
        setIsUndoing(false);
      });
  }, [eventId, rollbackData, localGuests, setLocalGuests]);

  const activeFilters = [
    rsvpFilter !== "all" ? rsvpFilter : null,
    tagFilter,
    tableFilter,
  ].filter(Boolean).length;

  // Toggle selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredGuests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredGuests.map((g) => g.id)));
    }
  }, [selectedIds.size, filteredGuests]);

  // Bulk Handlers (Optimistic & Batched)
  const handleBulkDeleteClick = useCallback(() => {
    const success = handleBulkDelete(selectedIds);
    if (success) {
      setSelectedIds(new Set());
    }
  }, [handleBulkDelete, selectedIds]);

  const handleBulkRsvpClick = useCallback(
    (status: RsvpStatus) => {
      handleBulkRsvp(selectedIds, status);
      setSelectedIds(new Set());
    },
    [handleBulkRsvp, selectedIds]
  );

  const handleBulkAssignTableClick = useCallback(
    (tableId: string | null) => {
      handleBulkAssignTable(selectedIds, tableId);
      setSelectedIds(new Set());
    },
    [handleBulkAssignTable, selectedIds]
  );

  // Smart insights derived instantly
  const insights = useMemo(() => {
    const noTable = localGuests.filter((g) => !g.table_id).length;
    const noRsvp = localGuests.filter((g) => g.rsvp_status === "pending").length;
    const items: { text: string; type: "info" | "warn" }[] = [];
    if (noTable > 0) items.push({ text: `${noTable} invitați fără masă`, type: "warn" });
    if (noRsvp > 0) items.push({ text: `${noRsvp} invitați fără răspuns`, type: "info" });
    return items;
  }, [localGuests]);

  // Quick add handler (Optimistic & Shimmered)
  const handleQuickAdd = useCallback(async () => {
    if (!quickAddText.trim()) return;
    const { parseGuestText } = await import("@/lib/guests/smart-parser");
    const parsed = parseGuestText(quickAddText);
    if (parsed.length === 0) return;

    const { bulkCreateGuests } = await import(
      "@/app/(dashboard)/dashboard/events/[id]/guests/actions"
    );

    // Create optimistic temp guests with temp- IDs
    const tempGuests = parsed.map((p) => {
      const tempId = `temp-guest-${Date.now()}-${Math.random()}`;
      return {
        id: tempId,
        event_id: eventId,
        first_name: p.firstName,
        last_name: p.lastName || null,
        rsvp_status: "pending",
        plus_one: !!p.plusOneName,
        plus_one_name: p.plusOneName || null,
        group_name: p.groupName || null,
        tags: p.tags || [],
        phone: null,
        email: null,
        table_id: null,
        seating_tables: null,
        parent_id: null,
        family_id: null,
        group_id: null,
        relationship_type: null,
        subGuests: p.plusOneName ? [{
          id: `temp-sub-${Date.now()}-${Math.random()}`,
          event_id: eventId,
          parent_id: tempId,
          first_name: p.plusOneName.split(/\s+/)[0] || "Partener",
          last_name: p.plusOneName.split(/\s+/).slice(1).join(" ") || p.lastName || null,
          rsvp_status: "pending",
          relationship_type: "couple",
          table_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          family_id: null,
          group_id: null,
          email: null,
          phone: null,
          plus_one: false,
          plus_one_name: null,
          group_name: null,
          dietary_notes: null,
          notes: null,
          seat_label: null,
          tags: [],
        }] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dietary_notes: null,
        notes: null,
        seat_label: null,
      } as GuestWithTable;
    });

    const originalGuests = [...localGuests];
    setLocalGuests((prev) => [...tempGuests, ...prev]);
    setQuickAddText("");
    setShowQuickAdd(false);

    setIsQuickAdding(true);
    bulkCreateGuests(
      eventId,
      parsed.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName || undefined,
        plusOneName: p.plusOneName || undefined,
        groupName: p.groupName || undefined,
        tags: p.tags,
      }))
    )
      .then((res) => {
        if (res.error) throw new Error(res.error);
        if (res.insertedIds && res.insertedIds.length > 0) {
          const insertedIds = res.insertedIds;
          setLocalGuests((prev) =>
            prev.map((g) => {
              const tempIndex = tempGuests.findIndex((tg) => tg.id === g.id);
              if (tempIndex !== -1 && insertedIds[tempIndex]) {
                const newId = insertedIds[tempIndex];
                return {
                  ...g,
                  id: newId,
                  subGuests: (g.subGuests ?? []).map((sub) => ({ ...sub, parent_id: newId })),
                };
              }
              return g;
            })
          );
        }
      })
      .catch(() => {
        setLocalGuests(originalGuests);
        alert("Eroare la adăugarea rapidă.");
      })
      .finally(() => {
        setIsQuickAdding(false);
      });
  }, [eventId, quickAddText, localGuests, setLocalGuests]);

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: computedStats.total, accent: "text-[#1A0E14]" },
          { label: "Confirmați", value: computedStats.accepted, accent: "text-confirmed-green" },
          { label: "În așteptare", value: computedStats.pending, accent: "text-pending-orange" },
          { label: "La masă", value: computedStats.seated, accent: "text-[#B8516B]" },
        ].map((s) => (
          <Card
            key={s.label}
            className="glass-panel border bg-white p-4 shadow-card rounded-[18px]"
          >
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              {s.label}
            </p>
            <p className={cn("mt-1.5 font-sans text-2xl font-bold", s.accent)}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* ── Smart Insights ── */}
      {insights.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold border",
                insight.type === "warn"
                  ? "bg-[#FF9F0A]/10 border-[#FF9F0A]/20 text-[#FF9F0A]"
                  : "bg-[#FEF0F3] border-border-rose-18 text-[#B8516B]"
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current" />
              {insight.text}
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="glass-panel border bg-white/95 p-3.5 shadow-card rounded-[18px]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută invitați..."
              className="h-9 w-full rounded-[10px] bg-[#F3F3F5] border border-[rgba(210,170,185,0.22)] pl-9 pr-8 text-xs text-[#1A0E14] outline-hidden placeholder:text-text-subtle focus-visible:ring-3 focus-visible:ring-[#B8516B]/10 focus-visible:border-[#B8516B]/40 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-secondary hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-[10px] bg-[#F3F3F5] p-0.5 h-9">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "rounded-lg p-1.5 transition-all cursor-pointer",
                view === "table"
                  ? "bg-white text-[#B8516B] shadow-sm"
                  : "text-text-secondary hover:text-[#B8516B]"
              )}
              title="Tabel"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "rounded-lg p-1.5 transition-all cursor-pointer",
                view === "cards"
                  ? "bg-white text-[#B8516B] shadow-sm"
                  : "text-text-secondary hover:text-[#B8516B]"
              )}
              title="Carduri"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-all h-9 cursor-pointer",
              activeFilters > 0
                ? "bg-[#FEF0F3] border-[#B8516B]/30 text-[#B8516B] shadow-xs"
                : "bg-[#F3F3F5] border-transparent text-text-secondary hover:text-[#B8516B]"
            )}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showFilters && "rotate-180")} />
            Filtre
            {activeFilters > 0 && (
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#B8516B] text-[9px] font-bold text-white ml-0.5">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Sorting */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1.5 rounded-[10px] border border-transparent bg-[#F3F3F5] px-3 py-1.5 text-xs font-semibold text-text-secondary transition-all hover:text-[#B8516B] h-9 cursor-pointer"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sortat: {sortLabels[sortBy]}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showSortDropdown && "rotate-180")} />
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-border-rose-18 bg-white p-1 shadow-lg animate-scale-in">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortBy(key);
                      setShowSortDropdown(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer",
                      sortBy === key ? "bg-[#FEF0F3] text-[#B8516B]" : "text-text-secondary hover:bg-slate-50"
                    )}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 rounded-[10px] border border-transparent bg-[#F3F3F5] px-3.5 py-1.5 text-xs font-semibold text-text-secondary transition-all hover:bg-[#FEF0F3]/50 hover:text-[#B8516B] h-9 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importă</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-3.5 py-1.5 text-xs font-bold text-white shadow-primary-btn hover:opacity-95 transition-all h-9 cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Adaugă</span>
            </button>
          </div>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border-rose-18 pt-3 animate-fade-in">
            {/* RSVP Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-subtle mr-1">RSVP:</span>
              {(["all", "pending", "accepted", "declined", "maybe"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRsvpFilter(s)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                    rsvpFilter === s
                      ? "bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border-[#B8516B] text-[#B8516B] shadow-xs"
                      : "bg-[#F3F3F5] border-transparent text-text-secondary hover:text-[#B8516B]"
                  )}
                >
                  {s === "all" ? "Toți" : s === "pending" ? "Așteptare" : s === "accepted" ? "Confirmați" : s === "declined" ? "Refuzați" : "Poate"}
                </button>
              ))}
            </div>

            {/* Table Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-subtle mr-1">Masă:</span>
              <button
                type="button"
                onClick={() => setTableFilter(tableFilter === "no-table" ? null : "no-table")}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                  tableFilter === "no-table"
                    ? "bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border-[#B8516B] text-[#B8516B] shadow-xs"
                    : "bg-[#F3F3F5] border-transparent text-text-secondary hover:text-[#B8516B]"
                )}
              >
                Fără masă
              </button>
            </div>

            {/* Tag Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-subtle mr-1">Tag:</span>
              {GUEST_TAGS.slice(0, 5).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === t.value ? null : t.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                    tagFilter === t.value
                      ? "bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border-[#B8516B] text-[#B8516B] shadow-xs"
                      : "bg-[#F3F3F5] border-transparent text-text-secondary hover:text-[#B8516B]"
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRsvpFilter("all");
                  setTagFilter(null);
                  setTableFilter(null);
                }}
                className="ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Șterge filtrele
              </button>
            )}
          </div>
        )}

        {/* Quick Add Bar */}
        {showQuickAdd && (
          <div className="mt-3 border-t border-border-rose-18 pt-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickAddText.trim()) {
                    handleQuickAdd();
                  }
                  if (e.key === "Escape") {
                    setShowQuickAdd(false);
                    setQuickAddText("");
                  }
                }}
                placeholder="ex. Maria + Andrei, Familia Popescu..."
                className="h-9 flex-1 rounded-[10px] bg-[#F3F3F5] border border-[rgba(210,170,185,0.22)] px-3.5 text-xs text-[#1A0E14] outline-hidden placeholder:text-text-subtle focus-visible:ring-3 focus-visible:ring-[#B8516B]/10 focus-visible:border-[#B8516B]/40 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!quickAddText.trim() || isQuickAdding}
                className="rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-4.5 py-2 text-xs font-bold text-white shadow-primary-btn hover:opacity-95 transition-all disabled:opacity-50 h-9 cursor-pointer active:scale-95"
              >
                {isQuickAdding ? "..." : "Adaugă"}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-text-subtle pl-1 leading-normal">
              Scrie un nume și apasă Enter. Acceptă: &quot;Maria + Andrei&quot;, &quot;Familia Popescu - 4 persoane&quot;, &quot;Nași&quot;
            </p>
          </div>
        )}
      </div>

      {/* ── Bulk Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-20 md:bottom-4 z-30 mx-auto w-fit animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-2 rounded-2xl bg-[#1A0E14]/95 px-4 py-2.5 text-xs text-white shadow-xl backdrop-blur-md border border-border-rose-18">
            <span className="font-semibold">{selectedIds.size} selectați</span>
            <span className="h-4 w-px bg-white/20" />

            {/* RSVP dropdown */}
            <div className="relative group">
              <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer font-medium">
                <Users className="h-3.5 w-3.5" />
                RSVP
              </button>
              <div className="absolute bottom-full left-0 mb-1 hidden w-32 rounded-xl border border-border-rose-18 bg-white p-1 shadow-lg group-hover:block">
                {(["accepted", "pending", "declined", "maybe"] as RsvpStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleBulkRsvpClick(s)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <RsvpPill status={s} readonly />
                  </button>
                ))}
              </div>
            </div>

            {/* Table dropdown */}
            <div className="relative group">
              <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer font-medium">
                <Tag className="h-3.5 w-3.5" />
                Masă
              </button>
              <div className="absolute bottom-full left-0 mb-1 hidden max-h-48 w-40 overflow-y-auto rounded-xl border border-border-rose-18 bg-white p-1 shadow-lg group-hover:block">
                <button
                  type="button"
                  onClick={() => handleBulkAssignTableClick(null)}
                  className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-slate-50 cursor-pointer"
                >
                  Fără masă
                </button>
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleBulkAssignTableClick(t.id)}
                    className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-slate-50 cursor-pointer"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-rose-300 hover:bg-white/10 transition-colors cursor-pointer font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Șterge
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 rounded-full p-1 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {localGuests.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-[24px] bg-white border border-[rgba(210,170,185,0.22)] py-20 text-center shadow-card animate-fade-in">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] border border-border-rose-18 text-[#B8516B] shadow-sm animate-gentle-float">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#1A0E14] animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            Începe să construiești lista de invitați
          </h3>
          <p className="mt-1.5 max-w-xs text-xs text-text-secondary leading-relaxed animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            Adaugă invitați manual sau importă-i dintr-o listă. Poți lipi text, importa CSV sau adăuga pe rând.
          </p>
          <div className="mt-6 flex gap-3 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 rounded-[10px] bg-[#F3F3F5] hover:bg-[#FEF0F3]/40 border border-transparent hover:border-border-rose-22 px-5 py-2.5 text-xs font-semibold text-text-secondary transition-all cursor-pointer active:scale-95"
            >
              <Upload className="h-3.5 w-3.5" />
              Importă invitați
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#E8748A] to-[#B8516B] px-5 py-2.5 text-xs font-bold text-white shadow-primary-btn hover:opacity-95 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Adaugă primul invitat
            </button>
          </div>
        </div>
      ) : view === "table" ? (
        <GuestTableView
          guests={filteredGuests}
          tables={tables}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onRsvpChange={handleRsvpChange}
          onTableChange={handleTableChange}
          onDelete={handleDeleteGuest}
          onSelectGuest={setDetailGuest}
          syncingIds={syncingIds}
        />
      ) : (
        <GuestCardView
          guests={filteredGuests}
          onRsvpChange={handleRsvpChange}
          onSelectGuest={setDetailGuest}
          syncingIds={syncingIds}
        />
      )}

      {/* ── Detail Panel ── */}
      {detailGuest && (() => {
        const activeGuest = localGuests.find((g) => g.id === detailGuest.id) || detailGuest;
        const isSyncing = syncingIds.has(activeGuest.id);
        return (
          <GuestDetailPanel
            guest={activeGuest}
            tables={tables}
            onClose={() => setDetailGuest(null)}
            onRsvpChange={handleRsvpChange}
            onUpdateTags={(tags) => handleUpdateTags(activeGuest.id, tags)}
            onUpdateField={(field, value) => handleUpdateField(activeGuest.id, field, value)}
            onDelete={() => {
              handleDeleteGuest(activeGuest.id);
              setDetailGuest(null);
            }}
            onAddSubGuest={(type) => handleAddSubGuest(activeGuest.id, type)}
            onDeleteSubGuest={(subId) => handleDeleteSubGuest(activeGuest.id, subId)}
            onUpdateSubField={(subId, field, value) => handleUpdateSubField(activeGuest.id, subId, field, value)}
            isSyncing={isSyncing}
          />
        );
      })()}

      {/* ── Import Modal ── */}
      {showImport && (
        <ImportModal
          eventId={eventId}
          guests={localGuests}
          onClose={() => setShowImport(false)}
          onImportSuccess={(count, insertedIds) => {
            setShowImport(false);
            setRollbackData({ count, insertedIds });
            if (rollbackTimeout.current) clearTimeout(rollbackTimeout.current);
            rollbackTimeout.current = setTimeout(() => {
              setRollbackData(null);
            }, 10000);
          }}
        />
      )}

      {/* ── Undo Import Rollback Toast ── */}
      {rollbackData && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-foreground/95 px-4 py-3 text-sm text-white shadow-xl backdrop-blur animate-in slide-in-from-bottom-4 fade-in duration-200">
          <span className="font-medium">{rollbackData.count} invitați importați cu succes</span>
          <button
            type="button"
            onClick={handleUndoImport}
            disabled={isUndoing}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-150 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isUndoing ? "Se anulează..." : "Anulează"}
          </button>
        </div>
      )}

      {/* ── Mobile FAB ── */}
      <div className="fixed bottom-6 right-6 z-30 md:hidden">
        <button
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
