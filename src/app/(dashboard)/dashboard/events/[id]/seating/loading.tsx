import React from "react";

export default function SeatingLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2 animate-fade-in-down">
        <div className={`h-8 w-56 ${shimmerClass}`} />
        <div className={`h-4 w-72 ${shimmerClass}`} />
      </div>

      {/* Action Button Row */}
      <div className="flex gap-2 animate-fade-in-up" style={{ animationDelay: "30ms" }}>
        <div className={`h-9 w-32 ${shimmerClass}`} />
      </div>

      {/* Seating Toolbar Skeleton */}
      <div
        className="rounded-2xl border border-border/30 bg-white/80 p-4 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <div className={`h-3 w-16 ${shimmerClass}`} />
            <div className={`h-5 w-24 ${shimmerClass}`} />
          </div>
          <div className="h-8 w-[1px] bg-border/40 hidden sm:block" />
          <div className="space-y-1">
            <div className={`h-3 w-20 ${shimmerClass}`} />
            <div className={`h-5 w-28 ${shimmerClass}`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className={`h-9 w-28 ${shimmerClass}`} />
          <div className={`h-9 w-28 ${shimmerClass}`} />
          <div className={`h-9 w-24 ${shimmerClass}`} />
        </div>
      </div>

      {/* Main Seating Workspace Layout */}
      <div
        className="flex h-[calc(100vh-16rem)] min-h-[500px] gap-4 animate-fade-in-up"
        style={{ animationDelay: "120ms" }}
      >
        {/* Left Guest Sidebar Skeleton */}
        <aside className="hidden lg:block w-72 shrink-0 border border-border/30 bg-white/80 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="space-y-1">
            <div className={`h-5 w-24 ${shimmerClass}`} />
            <div className={`h-3 w-40 ${shimmerClass}`} />
          </div>
          <div className={`h-9 w-full ${shimmerClass}`} />
          <div className="flex-1 space-y-3 overflow-hidden pt-1">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border/10">
                <div className="space-y-1.5 flex-1">
                  <div className={`h-4 w-32 ${shimmerClass}`} />
                  <div className={`h-3 w-16 ${shimmerClass}`} />
                </div>
                <div className={`h-5 w-5 rounded-full ${shimmerClass}`} />
              </div>
            ))}
          </div>
        </aside>

        {/* Center/Right Canvas Workspace Skeleton */}
        <div className="flex-1 border border-border/40 bg-white/40 rounded-2xl shadow-inner p-6 relative overflow-hidden backdrop-blur-sm">
          {/* Mock Stage */}
          <div className={`absolute left-1/2 top-4 -translate-x-1/2 h-14 w-64 border border-dashed border-border/60 bg-muted/10 rounded-xl flex items-center justify-center`}>
            <div className={`h-4 w-24 ${shimmerClass}`} />
          </div>

          {/* Mock Tables on Canvas */}
          <div className="absolute inset-0 top-24 flex items-center justify-around p-8">
            {/* Round Table 1 */}
            <div className="flex flex-col items-center space-y-2 animate-soft-pulse">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary/20 bg-primary/[0.02] flex items-center justify-center">
                <div className={`h-5 w-10 ${shimmerClass}`} />
              </div>
              <div className={`h-3.5 w-14 ${shimmerClass}`} />
            </div>

            {/* Rectangular Table 2 */}
            <div className="flex flex-col items-center space-y-2 animate-soft-pulse">
              <div className="w-36 h-20 rounded-xl border-2 border-dashed border-accent/20 bg-accent/[0.02] flex items-center justify-center">
                <div className={`h-5 w-12 ${shimmerClass}`} />
              </div>
              <div className={`h-3.5 w-16 ${shimmerClass}`} />
            </div>

            {/* Round Table 3 */}
            <div className="flex flex-col items-center space-y-2 animate-soft-pulse">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary/20 bg-primary/[0.02] flex items-center justify-center">
                <div className={`h-5 w-10 ${shimmerClass}`} />
              </div>
              <div className={`h-3.5 w-14 ${shimmerClass}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
