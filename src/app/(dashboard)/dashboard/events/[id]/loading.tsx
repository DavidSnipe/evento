import React from "react";

export default function EventOverviewLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in-down">
        <div className="space-y-2">
          <div className={`h-8 w-64 ${shimmerClass}`} />
          <div className={`h-4.5 w-32 ${shimmerClass}`} />
        </div>
        <div className="flex gap-2">
          <div className={`h-9 w-24 ${shimmerClass}`} />
          <div className={`h-9 w-20 ${shimmerClass}`} />
          <div className={`h-9 w-20 ${shimmerClass}`} />
        </div>
      </div>

      {/* Grid: Days to go + Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Days to go card */}
        <div
          style={{ animationDelay: "50ms" }}
          className="rounded-2xl border border-border/30 bg-white/80 p-6 shadow-sm space-y-4 animate-fade-in-up md:col-span-1"
        >
          <div className={`h-4 w-24 ${shimmerClass}`} />
          <div className="space-y-2 pt-2">
            <div className={`h-10 w-20 ${shimmerClass}`} />
            <div className={`h-4 w-36 ${shimmerClass}`} />
          </div>
        </div>

        {/* Overview details card */}
        <div
          style={{ animationDelay: "80ms" }}
          className="rounded-2xl border border-border/30 bg-white/80 p-6 shadow-sm space-y-4 animate-fade-in-up md:col-span-2"
        >
          <div className={`h-4 w-28 ${shimmerClass}`} />
          <hr className="border-border/10" />
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full ${shimmerClass}`} />
              <div className={`h-4.5 w-48 ${shimmerClass}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full ${shimmerClass}`} />
              <div className={`h-4.5 w-60 ${shimmerClass}`} />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className={`h-3.5 w-full ${shimmerClass}`} />
              <div className={`h-3.5 w-[90%] ${shimmerClass}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick link sections below */}
      <div className="grid gap-4 sm:grid-cols-2 mt-8">
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{ animationDelay: `${150 + i * 50}ms` }}
            className="rounded-2xl border border-border/30 bg-white/80 p-6 shadow-sm animate-fade-in-up flex items-center gap-4 h-[96px]"
          >
            <div className={`h-10 w-10 rounded-full shrink-0 ${shimmerClass}`} />
            <div className="space-y-2 flex-1">
              <div className={`h-5 w-32 ${shimmerClass}`} />
              <div className={`h-3.5 w-44 ${shimmerClass}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
