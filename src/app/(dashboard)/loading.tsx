import React from "react";

export default function DashboardGeneralLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2 animate-fade-in-down">
        <div className={`h-8 w-60 ${shimmerClass}`} />
        <div className={`h-4 w-96 ${shimmerClass}`} />
      </div>

      {/* Basic stats card layout */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[1, 2, 3].map((card) => (
          <div
            key={card}
            style={{ animationDelay: `${card * 60}ms` }}
            className="rounded-2xl border border-border/30 bg-white/80 p-5 shadow-sm animate-fade-in-up"
          >
            <div className={`h-4 w-24 mb-3 ${shimmerClass}`} />
            <div className={`h-8 w-16 mb-2 ${shimmerClass}`} />
            <div className={`h-3 w-32 ${shimmerClass}`} />
          </div>
        ))}
      </div>

      {/* Main panel skeleton */}
      <div 
        style={{ animationDelay: "240ms" }}
        className="rounded-2xl border border-border/30 bg-white/80 p-6 shadow-sm space-y-4 animate-fade-in-up"
      >
        <div className={`h-5 w-40 ${shimmerClass}`} />
        <hr className="border-border/30" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div 
              key={item} 
              style={{ animationDelay: `${300 + item * 40}ms` }}
              className="flex justify-between items-center py-2 animate-fade-in-up"
            >
              <div className="space-y-2 flex-1 max-w-sm">
                <div className={`h-4 w-3/4 ${shimmerClass}`} />
                <div className={`h-3 w-1/2 ${shimmerClass}`} />
              </div>
              <div className={`h-6 w-20 ${shimmerClass}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
