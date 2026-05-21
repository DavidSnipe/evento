import { useState, useEffect, useMemo } from "react";
import type { GuestWithTable, RsvpStatus } from "@/types/guests";

export type SortKey = "lastName" | "firstName" | "rsvp" | "table" | "recent";

type FilteringParams = {
  localGuests: GuestWithTable[];
  search: string;
  rsvpFilter: RsvpStatus | "all";
  tagFilter: string | null;
  tableFilter: string | "no-table" | null;
  sortBy: SortKey;
};

export function useGuestFiltering({
  localGuests,
  search,
  rsvpFilter,
  tagFilter,
  tableFilter,
  sortBy,
}: FilteringParams) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(handler);
  }, [search]);

  const filteredGuests = useMemo(() => {
    const start = performance.now();
    let result = localGuests;

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter((g) => {
        const fullName = `${g.first_name} ${g.last_name ?? ""}`.toLowerCase();
        const group = (g.group_name ?? "").toLowerCase();
        const table = (g.seating_tables?.name ?? "").toLowerCase();
        const tags = (g.tags ?? []).join(" ").toLowerCase();
        const plusOne = (g.plus_one_name ?? "").toLowerCase();
        return (
          fullName.includes(q) ||
          group.includes(q) ||
          table.includes(q) ||
          tags.includes(q) ||
          plusOne.includes(q)
        );
      });
    }

    // RSVP filter
    if (rsvpFilter !== "all") {
      result = result.filter((g) => g.rsvp_status === rsvpFilter);
    }

    // Tag filter
    if (tagFilter) {
      result = result.filter((g) => (g.tags ?? []).includes(tagFilter));
    }

    // Table filter
    if (tableFilter === "no-table") {
      result = result.filter((g) => !g.table_id);
    } else if (tableFilter) {
      result = result.filter((g) => g.table_id === tableFilter);
    }

    // Sorting
    const sortedResults = [...result];
    if (sortBy === "lastName") {
      sortedResults.sort((a, b) => {
        const aName = a.last_name || "";
        const bName = b.last_name || "";
        if (!aName && bName) return 1;
        if (aName && !bName) return -1;
        if (!aName && !bName) return a.first_name.localeCompare(b.first_name, "ro");
        return aName.localeCompare(bName, "ro");
      });
    } else if (sortBy === "firstName") {
      sortedResults.sort((a, b) => a.first_name.localeCompare(b.first_name, "ro"));
    } else if (sortBy === "rsvp") {
      const rsvpOrder: Record<RsvpStatus, number> = {
        accepted: 0,
        maybe: 1,
        pending: 2,
        declined: 3,
      };
      sortedResults.sort((a, b) => rsvpOrder[a.rsvp_status] - rsvpOrder[b.rsvp_status]);
    } else if (sortBy === "table") {
      sortedResults.sort((a, b) => {
        const aTable = a.seating_tables?.name || "";
        const bTable = b.seating_tables?.name || "";
        if (!aTable && bTable) return 1;
        if (aTable && !bTable) return -1;
        if (!aTable && !bTable) return 0;
        return aTable.localeCompare(bTable, "ro");
      });
    } else if (sortBy === "recent") {
      sortedResults.sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return bTime - aTime;
      });
    }

    const end = performance.now();
    if (process.env.NODE_ENV === "development") {
      console.log(`[useGuestFiltering] Filtered ${result.length} guests in ${(end - start).toFixed(2)}ms`);
    }

    return sortedResults;
  }, [localGuests, debouncedSearch, rsvpFilter, tagFilter, tableFilter, sortBy]);

  return filteredGuests;
}
