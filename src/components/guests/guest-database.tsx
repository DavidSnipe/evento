"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, Plus, Upload, X, LayoutList, LayoutGrid, ChevronDown, Trash2, Users, Tag, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuestWithTable, RsvpStatus, SeatingTableRow } from "@/types/guests";
import { GUEST_TAGS } from "@/types/guests";
import { GuestTableView } from "@/components/guests/guest-table-view";
import { GuestCardView } from "@/components/guests/guest-card-view";
import { GuestDetailPanel } from "@/components/guests/guest-detail-panel";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { getIconForGuestTag } from "@/lib/icons/registry";
import { RsvpPill } from "@/components/guests/rsvp-pill";
import { StatsCard } from "@/components/nuntiki/stats-card";
import {
  bulkDeleteGuests,
} from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";

import { useGuestStats } from "@/hooks/guests/use-guest-stats";
import { useGuestFiltering, type SortKey } from "@/hooks/guests/use-guest-filtering";
import { useGuestOptimistic } from "@/hooks/guests/use-guest-optimistic";

const ImportModal = dynamic(
  () => import("@/components/guests/import-modal").then((mod) => mod.ImportModal),
  { ssr: false }
);

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
  const [view, setView] = useState<ViewMode>("cards");
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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const syncView = () => setView(mq.matches ? "table" : "cards");
    syncView();
    mq.addEventListener("change", syncView);
    return () => mq.removeEventListener("change", syncView);
  }, []);

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
          { label: "Total", value: computedStats.total, accent: "default" as const },
          { label: "Confirmați", value: computedStats.accepted, accent: "success" as const },
          { label: "În așteptare", value: computedStats.pending, accent: "warning" as const },
          { label: "La masă", value: computedStats.seated, accent: "primary" as const },
        ].map((s) => (
          <StatsCard key={s.label} label={s.label} value={s.value} accent={s.accent} />
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
                  ? "bg-[rgba(255,159,10,0.08)] border-[rgba(255,159,10,0.2)] text-pending-orange"
                  : "border-[var(--dash-hairline)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)]"
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current" />
              {insight.text}
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-3.5 shadow-[var(--dash-shadow-card)]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 md:max-w-[40%] md:flex-none">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--dash-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută invitați..."
              className="h-11 w-full rounded-[10px] border border-[var(--dash-hairline)] bg-[var(--dash-ivory)] pl-9 pr-8 text-xs text-[var(--dash-text)] outline-hidden placeholder:text-[var(--dash-text-muted)] focus-visible:border-[var(--dash-accent)]/40 focus-visible:ring-3 focus-visible:ring-[var(--dash-accent)]/10 focus:outline-none"
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
          <div className="flex h-11 items-center rounded-[10px] bg-[var(--dash-ivory)] p-0.5">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "min-h-10 rounded-lg p-1.5 transition-all cursor-pointer",
                view === "table"
                  ? "bg-[var(--dash-surface)] text-[var(--dash-accent-text)] shadow-sm"
                  : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
              )}
              title="Tabel"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "min-h-10 rounded-lg p-1.5 transition-all cursor-pointer",
                view === "cards"
                  ? "bg-[var(--dash-surface)] text-[var(--dash-accent-text)] shadow-sm"
                  : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
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
              "flex h-11 min-h-11 items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeFilters > 0
                ? "border-[var(--dash-accent)]/30 bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-xs"
                : "border-transparent bg-[var(--dash-ivory)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
            )}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showFilters && "rotate-180")} />
            Filtre
            {activeFilters > 0 && (
              <span className="ml-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--dash-accent)] text-[9px] font-bold text-white">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Sorting */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex h-11 min-h-11 items-center gap-1.5 rounded-[10px] border border-transparent bg-[var(--dash-ivory)] px-3 py-1.5 text-xs font-semibold text-[var(--dash-text-secondary)] transition-all hover:text-[var(--dash-accent-text)] cursor-pointer"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sortat: {sortLabels[sortBy]}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showSortDropdown && "rotate-180")} />
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 top-full z-40 mt-1.5 w-44 animate-scale-in rounded-xl border border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-1 shadow-lg">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortBy(key);
                      setShowSortDropdown(false);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                      sortBy === key
                        ? "bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)]"
                        : "text-[var(--dash-text-secondary)] hover:bg-[var(--dash-ivory)]"
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
              className="flex h-11 min-h-11 items-center gap-1.5 rounded-[10px] border border-transparent bg-[var(--dash-ivory)] px-3.5 py-1.5 text-xs font-semibold text-[var(--dash-text-secondary)] transition-all hover:bg-[var(--dash-accent-soft)] hover:text-[var(--dash-accent-text)] cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importă</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="flex h-11 min-h-11 items-center gap-1.5 rounded-[10px] bg-[var(--dash-accent)] px-3.5 py-1.5 text-xs font-bold text-white shadow-[var(--dash-shadow-sm)] transition-all hover:opacity-95 cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Adaugă</span>
            </button>
          </div>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className="mt-3 animate-fade-in space-y-3 border-t border-[var(--dash-hairline)] pt-3">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none md:flex-wrap md:overflow-visible">
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  RSVP:
                </span>
                {(["all", "pending", "accepted", "declined", "maybe"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRsvpFilter(s)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer min-h-9",
                      rsvpFilter === s
                        ? "border-[var(--dash-accent)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-xs"
                        : "border-transparent bg-[var(--dash-ivory)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
                    )}
                  >
                    {s === "all" ? "Toți" : s === "pending" ? "Așteptare" : s === "accepted" ? "Confirmați" : s === "declined" ? "Refuzați" : "Poate"}
                  </button>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <span className="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Masă:
                </span>
                <button
                  type="button"
                  onClick={() => setTableFilter(tableFilter === "no-table" ? null : "no-table")}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer min-h-9",
                    tableFilter === "no-table"
                      ? "border-[var(--dash-accent)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-xs"
                      : "border-transparent bg-[var(--dash-ivory)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
                  )}
                >
                  Fără masă
                </button>
              </div>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none md:flex-wrap md:overflow-visible">
              <span className="mr-1 shrink-0 self-center text-[11px] font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                Tag:
              </span>
              {GUEST_TAGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === t.value ? null : t.value)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer min-h-9",
                    tagFilter === t.value
                      ? "border-[var(--dash-accent)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-xs"
                      : "border-transparent bg-[var(--dash-ivory)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]"
                  )}
                >
                  <EmojiIcon icon={getIconForGuestTag(t.value)} size="sm" className="shrink-0" />
                  {t.label}
                </button>
              ))}

              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setRsvpFilter("all");
                    setTagFilter(null);
                    setTableFilter(null);
                  }}
                  className="ml-auto shrink-0 self-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 cursor-pointer min-h-9 md:ml-0"
                >
                  Șterge filtrele
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Quick Add Bar */}
        {showQuickAdd && (
          <div className="mt-3 animate-fade-in border-t border-[var(--dash-hairline)] pt-3">
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
                className="h-11 min-h-11 flex-1 rounded-[10px] border border-[var(--dash-hairline)] bg-[var(--dash-ivory)] px-3.5 text-xs text-[var(--dash-text)] outline-hidden placeholder:text-[var(--dash-text-muted)] focus-visible:border-[var(--dash-accent)]/40 focus-visible:ring-3 focus-visible:ring-[var(--dash-accent)]/10 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!quickAddText.trim() || isQuickAdding}
                className="h-11 min-h-11 cursor-pointer rounded-[10px] bg-[var(--dash-accent)] px-4.5 py-2 text-xs font-bold text-white shadow-[var(--dash-shadow-sm)] transition-all hover:opacity-95 disabled:opacity-50 active:scale-95"
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
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--dash-hairline)] bg-[var(--dash-text)] px-4 py-2.5 text-xs text-white shadow-xl">
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
        <div className="flex animate-fade-in flex-col items-center justify-center rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] py-20 text-center shadow-[var(--dash-shadow-card)]">
          <div className="mb-5 flex h-16 w-16 animate-gentle-float items-center justify-center rounded-2xl border border-[var(--dash-hairline)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-sm">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="animate-fade-in-up text-lg font-bold text-[var(--dash-text)]" style={{ animationDelay: "50ms" }}>
            Începe să construiești lista de invitați
          </h3>
          <p className="mt-1.5 max-w-xs animate-fade-in-up text-xs leading-relaxed text-[var(--dash-text-secondary)]" style={{ animationDelay: "100ms" }}>
            Adaugă invitați manual sau importă-i dintr-o listă. Poți lipi text, importa CSV sau adăuga pe rând.
          </p>
          <div className="mt-6 flex animate-fade-in-up gap-3" style={{ animationDelay: "150ms" }}>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex min-h-11 items-center gap-2 rounded-[10px] border border-transparent bg-[var(--dash-ivory)] px-5 py-2.5 text-xs font-semibold text-[var(--dash-text-secondary)] transition-all hover:border-[var(--dash-hairline)] hover:bg-[var(--dash-accent-soft)] cursor-pointer active:scale-95"
            >
              <Upload className="h-3.5 w-3.5" />
              Importă invitați
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--dash-accent)] px-5 py-2.5 text-xs font-bold text-white shadow-[var(--dash-shadow-sm)] transition-all hover:opacity-95 cursor-pointer active:scale-95"
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
