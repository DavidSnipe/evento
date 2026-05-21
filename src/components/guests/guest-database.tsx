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
          { label: "Total", value: computedStats.total, accent: "text-foreground" },
          { label: "Confirmați", value: computedStats.accepted, accent: "text-emerald-600" },
          { label: "În așteptare", value: computedStats.pending, accent: "text-amber-600" },
          { label: "La masă", value: computedStats.seated, accent: "text-indigo-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-border/30 transition-all hover:shadow-md"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className={cn("mt-1 font-serif text-2xl font-semibold", s.accent)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Smart Insights ── */}
      {insights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                insight.type === "warn"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-sky-50 text-sky-700"
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current" />
              {insight.text}
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-border/30">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută invitați..."
              className="h-9 w-full rounded-xl bg-muted/40 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:bg-muted/60 focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "rounded-lg p-1.5 transition-all",
                view === "table"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tabel"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "rounded-lg p-1.5 transition-all",
                view === "cards"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Carduri"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Filters */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
              activeFilters > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            )}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showFilters && "rotate-180")} />
            Filtre
            {activeFilters > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Sorting */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1.5 rounded-xl bg-muted/40 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sortat: {sortLabels[sortBy]}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", showSortDropdown && "rotate-180")} />
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-border/50 bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortBy(key);
                      setShowSortDropdown(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
                      sortBy === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
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
              className="flex items-center gap-1.5 rounded-xl bg-muted/40 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importă</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Adaugă</span>
            </button>
          </div>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/30 pt-3">
            {/* RSVP Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">RSVP:</span>
              {(["all", "pending", "accepted", "declined", "maybe"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRsvpFilter(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                    rsvpFilter === s
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {s === "all" ? "Toți" : s === "pending" ? "Așteptare" : s === "accepted" ? "Confirmați" : s === "declined" ? "Refuzați" : "Poate"}
                </button>
              ))}
            </div>

            {/* Table Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Masă:</span>
              <button
                type="button"
                onClick={() => setTableFilter(tableFilter === "no-table" ? null : "no-table")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                  tableFilter === "no-table"
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                Fără masă
              </button>
            </div>

            {/* Tag Filters */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Tag:</span>
              {GUEST_TAGS.slice(0, 5).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === t.value ? null : t.value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                    tagFilter === t.value
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50"
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
                className="ml-auto rounded-full px-2.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
              >
                Șterge filtrele
              </button>
            )}
          </div>
        )}

        {/* Quick Add Bar */}
        {showQuickAdd && (
          <div className="mt-3 border-t border-border/30 pt-3">
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
                className="h-9 flex-1 rounded-xl bg-muted/40 px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!quickAddText.trim() || isQuickAdding}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {isQuickAdding ? "..." : "Adaugă"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Scrie un nume și apasă Enter. Acceptă: &quot;Maria + Andrei&quot;, &quot;Familia Popescu - 4 persoane&quot;, &quot;Nași&quot;
            </p>
          </div>
        )}
      </div>

      {/* ── Bulk Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto w-fit animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-2 rounded-2xl bg-foreground/95 px-4 py-2.5 text-sm text-white shadow-xl backdrop-blur">
            <span className="font-medium">{selectedIds.size} selectați</span>
            <span className="h-4 w-px bg-white/20" />

            {/* RSVP dropdown */}
            <div className="relative group">
              <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-white/10 transition-colors">
                <Users className="h-3.5 w-3.5" />
                RSVP
              </button>
              <div className="absolute bottom-full left-0 mb-1 hidden w-32 rounded-xl border bg-white p-1 shadow-lg group-hover:block">
                {(["accepted", "pending", "declined", "maybe"] as RsvpStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleBulkRsvpClick(s)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-muted/50"
                  >
                    <RsvpPill status={s} readonly />
                  </button>
                ))}
              </div>
            </div>

            {/* Table dropdown */}
            <div className="relative group">
              <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-white/10 transition-colors">
                <Tag className="h-3.5 w-3.5" />
                Masă
              </button>
              <div className="absolute bottom-full left-0 mb-1 hidden max-h-48 w-40 overflow-y-auto rounded-xl border bg-white p-1 shadow-lg group-hover:block">
                <button
                  type="button"
                  onClick={() => handleBulkAssignTableClick(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-muted/50"
                >
                  Fără masă
                </button>
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleBulkAssignTableClick(t.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-muted/50"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-white/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Șterge
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 rounded-full p-1 hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {localGuests.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white/60 py-20 text-center shadow-sm ring-1 ring-border/20">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
            <Users className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-foreground">
            Începe să construiești lista de invitați
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Adaugă invitați manual sau importă-i dintr-o listă. Poți lipi text, importa CSV sau adăuga pe rând.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 rounded-xl bg-muted/60 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted hover:shadow-sm"
            >
              <Upload className="h-4 w-4" />
              Importă invitați
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
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
