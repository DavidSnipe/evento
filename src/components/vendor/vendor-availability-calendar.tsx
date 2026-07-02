"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { updateAvailability, type VendorAvailabilityInput } from "@/app/(vendor)/vendor/actions";
import type { MarketplaceVendorAvailability } from "@/types/marketplace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";

type VendorAvailabilityCalendarProps = {
  availability: MarketplaceVendorAvailability[];
};

type AvailabilityStatus = "available" | "unavailable" | "tentative";

const STATUS_CYCLE: AvailabilityStatus[] = ["available", "unavailable", "tentative"];

const STATUS_CLASS: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200",
  unavailable: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200",
  tentative: "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200",
};

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function VendorAvailabilityCalendar({ availability }: VendorAvailabilityCalendarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const initialMap = useMemo(() => {
    const map = new Map<string, AvailabilityStatus>();
    for (const row of availability) {
      map.set(row.date, row.status);
    }
    return map;
  }, [availability]);

  const [dateMap, setDateMap] = useState<Map<string, AvailabilityStatus>>(initialMap);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);
  const weekDays = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cycleDate = (dateKey: string) => {
    if (dateKey < todayKey) return;
    setDateMap((prev) => {
      const next = new Map(prev);
      const current = next.get(dateKey);
      if (!current) {
        next.set(dateKey, "available");
      } else {
        const idx = STATUS_CYCLE.indexOf(current);
        const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
        next.set(dateKey, nextStatus);
      }
      return next;
    });
  };

  const markMonthUnavailable = () => {
    setDateMap((prev) => {
      const next = new Map(prev);
      for (let day = 1; day <= daysInMonth; day++) {
        const key = formatDateKey(viewYear, viewMonth, day);
        if (key >= todayKey) next.set(key, "unavailable");
      }
      return next;
    });
  };

  const handleSave = () => {
    setError(null);
    const dates: VendorAvailabilityInput[] = Array.from(dateMap.entries()).map(
      ([date, status]) => ({ date, status })
    );
    startTransition(() => {
      void updateAvailability(dates).then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Eroare la salvare.");
          return;
        }
        router.refresh();
      });
    });
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(viewYear, viewMonth, day);
    const status = dateMap.get(dateKey);
    const isPast = dateKey < todayKey;
    cells.push(
      <button
        key={dateKey}
        type="button"
        disabled={isPast}
        onClick={() => cycleDate(dateKey)}
        className={cn(
          "flex h-10 w-full items-center justify-center rounded-lg border text-sm font-medium transition-colors",
          isPast && "cursor-not-allowed opacity-50",
          !isPast && !status && "border-[var(--dash-hairline)] bg-white hover:bg-[var(--dash-blush)]/20",
          status && STATUS_CLASS[status]
        )}
        title={isPast ? ro.vendor.availability.pastReadonly : undefined}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="outline" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-semibold capitalize">
            {monthLabel}
          </span>
          <Button type="button" size="icon" variant="outline" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={markMonthUnavailable}>
          {ro.vendor.availability.markMonthUnavailable}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{ro.vendor.availability.legend}</p>

      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.keys(STATUS_CLASS) as AvailabilityStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded border", STATUS_CLASS[status])} />
            {ro.vendor.availability[status]}
          </span>
        ))}
      </div>

      <div className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-4">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{cells}</div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={pending} onClick={handleSave}>
        {pending ? ro.vendor.profile.saving : ro.vendor.availability.save}
      </Button>
    </div>
  );
}
