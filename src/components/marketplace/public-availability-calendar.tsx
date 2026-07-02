"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MarketplaceVendorAvailability } from "@/types/marketplace";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";

type PublicAvailabilityCalendarProps = {
  availability: MarketplaceVendorAvailability[];
};

const STATUS_CLASS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-900 border-emerald-300",
  unavailable: "bg-gray-100 text-gray-600 border-gray-300",
  tentative: "bg-amber-100 text-amber-900 border-amber-300",
};

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function PublicAvailabilityCalendar({ availability }: PublicAvailabilityCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const dateMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of availability) map.set(row.date, row.status);
    return map;
  }, [availability]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = (() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`e-${i}`} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = formatDateKey(viewYear, viewMonth, day);
    const status = dateMap.get(key);
    cells.push(
      <div
        key={key}
        className={cn(
          "flex h-9 items-center justify-center rounded-md border text-xs font-medium",
          status ? STATUS_CLASS[status] : "border-border/50 bg-background text-muted-foreground"
        )}
      >
        {day}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{ro.marketplace.availability.legend}</p>
      <div className="flex flex-wrap gap-3 text-xs">
        {(["available", "unavailable", "tentative"] as const).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded border", STATUS_CLASS[status])} />
            {ro.marketplace.availability[status]}
          </span>
        ))}
      </div>
      <div className="rounded-2xl border border-border/70 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() =>
              viewMonth === 0
                ? (setViewMonth(11), setViewYear((y) => y - 1))
                : setViewMonth((m) => m - 1)
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize">{monthLabel}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() =>
              viewMonth === 11
                ? (setViewMonth(0), setViewYear((y) => y + 1))
                : setViewMonth((m) => m + 1)
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          {["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{cells}</div>
      </div>
    </div>
  );
}
