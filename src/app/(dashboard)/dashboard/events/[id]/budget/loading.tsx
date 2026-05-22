import React from "react";

export default function BudgetLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2 animate-fade-in-down">
        <div className={`h-8.5 w-52 ${shimmerClass}`} />
        <div className={`h-4.5 w-64 ${shimmerClass}`} />
      </div>

      {/* Summary Stats Cards */}
      <div
        className="grid gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-in-up"
        style={{ animationDelay: "50ms" }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/30 bg-white/80 p-5 shadow-sm space-y-2"
          >
            <div className={`h-3.5 w-24 ${shimmerClass}`} />
            <div className="space-y-1.5 pt-1">
              <div className={`h-7 w-28 ${shimmerClass}`} />
              <div className={`h-3 w-36 ${shimmerClass}`} />
            </div>
          </div>
        ))}
      </div>

      {/* List Layout Skeleton */}
      <div
        className="rounded-2xl border border-border/30 bg-white/80 p-6 shadow-sm space-y-6 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex justify-between items-center">
          <div className={`h-6 w-36 ${shimmerClass}`} />
          <div className={`h-9 w-28 ${shimmerClass}`} />
        </div>
        <hr className="border-border/10" />

        {/* Budget list category items */}
        <div className="space-y-4">
          {[0, 1, 2, 4].map((i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2.5 border-b border-border/10 animate-fade-in-up"
              style={{
                animationDelay: `${100 + i * 30}ms`,
              }}
            >
              <div className="space-y-2 flex-1 max-w-md">
                <div className={`h-4.5 w-3/4 ${shimmerClass}`} />
                <div className="flex gap-2 items-center">
                  <div className={`h-3 w-12 rounded-full ${shimmerClass}`} />
                  <div className={`h-3 w-20 ${shimmerClass}`} />
                </div>
              </div>
              <div className="text-right space-y-1.5 shrink-0">
                <div className={`h-4.5 w-20 ${shimmerClass}`} />
                <div className={`h-3.5 w-16 ${shimmerClass}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
