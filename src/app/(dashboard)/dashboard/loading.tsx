import React from "react";

export default function DashboardLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2 animate-fade-in-down">
        <div className={`h-8 w-72 ${shimmerClass}`} />
        <div className={`h-4 w-96 max-w-full ${shimmerClass}`} />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 50}ms` }}
            className="rounded-2xl border border-border/30 bg-white/80 p-6 shadow-sm space-y-4 animate-fade-in-up"
          >
            <div className="flex justify-between items-center">
              <div className={`h-4 w-28 ${shimmerClass}`} />
              <div className={`h-5 w-5 rounded-full ${shimmerClass}`} />
            </div>
            <div className="space-y-2">
              <div className={`h-9 w-16 ${shimmerClass}`} />
              <div className={`h-3.5 w-44 ${shimmerClass}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Events Section Skeleton */}
      <section className="mt-10 space-y-4">
        <div className="flex justify-between items-center animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <div className={`h-7 w-36 ${shimmerClass}`} />
          <div className={`h-9 w-20 ${shimmerClass}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ animationDelay: `${150 + i * 50}ms` }}
              className="rounded-2xl border border-border/30 bg-white/80 overflow-hidden shadow-sm animate-fade-in-up flex flex-col h-[180px]"
            >
              <div className="p-5 flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div className={`h-5 w-32 ${shimmerClass}`} />
                  <div className={`h-4 w-12 ${shimmerClass}`} />
                </div>
                <div className="space-y-2">
                  <div className={`h-3 w-40 ${shimmerClass}`} />
                  <div className={`h-3 w-28 ${shimmerClass}`} />
                </div>
              </div>
              <div className="bg-muted/30 px-5 py-3 border-t border-border/20 flex justify-between items-center">
                <div className={`h-3 w-24 ${shimmerClass}`} />
                <div className={`h-4 w-4 rounded-full ${shimmerClass}`} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
