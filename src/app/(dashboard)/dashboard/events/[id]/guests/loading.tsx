import React from "react";

export default function GuestsLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2 animate-fade-in-down">
        <div className={`h-8 w-48 ${shimmerClass}`} />
        <div className={`h-4 w-72 ${shimmerClass}`} />
      </div>

      {/* Guest Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/30 bg-white/80 p-4 shadow-sm space-y-2"
          >
            <div className={`h-3 w-16 ${shimmerClass}`} />
            <div className={`h-7 w-12 ${shimmerClass}`} />
          </div>
        ))}
      </div>

      {/* Search & Actions Bar Skeleton */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex flex-1 flex-wrap items-center gap-2 max-w-lg">
          <div className={`h-9 w-full sm:w-48 ${shimmerClass}`} />
          <div className={`h-9 w-28 ${shimmerClass}`} />
          <div className={`h-9 w-28 ${shimmerClass}`} />
        </div>
        <div className="flex gap-2 shrink-0">
          <div className={`h-9 w-24 ${shimmerClass}`} />
          <div className={`h-9 w-28 ${shimmerClass}`} />
        </div>
      </div>

      {/* Realistic Table Skeleton */}
      <div
        className="rounded-2xl border border-border/40 bg-white/80 overflow-hidden shadow-sm animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-muted/40 border-b border-border/60 px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground">
          <div className="col-span-1 flex items-center">
            <div className={`h-4 w-4 rounded ${shimmerClass}`} />
          </div>
          <div className="col-span-3">Nume</div>
          <div className="col-span-2">Confirmare</div>
          <div className="col-span-2">Rol / Masă</div>
          <div className="col-span-3">Etichete</div>
          <div className="col-span-1 text-right">Acțiuni</div>
        </div>

        {/* Table Body (staggered mock rows) */}
        <div className="divide-y divide-border/30">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div
              key={row}
              className="grid grid-cols-12 px-6 py-3.5 items-center text-sm animate-fade-in-up"
              style={{
                animationDelay: `${150 + row * 25}ms`,
              }}
            >
              {/* Checkbox */}
              <div className="col-span-1 flex items-center">
                <div className={`h-4 w-4 rounded ${shimmerClass}`} />
              </div>

              {/* Name & Sub-name */}
              <div className="col-span-3 space-y-1.5 pr-2">
                <div className={`h-4 w-36 max-w-full ${shimmerClass}`} />
                <div className={`h-3 w-20 ${shimmerClass}`} />
              </div>

              {/* RSVP status badge */}
              <div className="col-span-2 pr-2">
                <div className={`h-6.5 w-24 rounded-full ${shimmerClass}`} />
              </div>

              {/* Table assignment / role */}
              <div className="col-span-2 pr-2 space-y-1">
                <div className={`h-4 w-16 ${shimmerClass}`} />
                <div className={`h-3 w-24 ${shimmerClass}`} />
              </div>

              {/* Tag badges */}
              <div className="col-span-3 flex flex-wrap gap-1 pr-2">
                <div className={`h-5 w-12 rounded-full ${shimmerClass}`} />
                <div className={`h-5 w-16 rounded-full ${shimmerClass}`} />
              </div>

              {/* Action Button */}
              <div className="col-span-1 flex justify-end">
                <div className={`h-8 w-8 rounded-lg ${shimmerClass}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
