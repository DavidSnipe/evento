import React from "react";

export default function VendorsLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2 animate-fade-in-down">
        <div className={`h-8.5 w-60 ${shimmerClass}`} />
        <div className={`h-4.5 w-96 max-w-full ${shimmerClass}`} />
      </div>

      {/* Action Bar (Search & Add Button) */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up"
        style={{ animationDelay: "50ms" }}
      >
        <div className={`h-10 w-full sm:w-80 ${shimmerClass}`} />
        <div className={`h-10 w-36 ${shimmerClass}`} />
      </div>

      {/* Grid of Vendor Card Skeletons */}
      <div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/30 bg-white/80 p-5 shadow-sm space-y-4 animate-fade-in-up"
            style={{
              animationDelay: `${100 + i * 40}ms`,
            }}
          >
            {/* Header: Title and Category badge */}
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className={`h-5 w-32 ${shimmerClass}`} />
                <div className={`h-3 w-16 ${shimmerClass}`} />
              </div>
              <div className={`h-5 w-16 rounded-full ${shimmerClass}`} />
            </div>

            <hr className="border-border/10" />

            {/* Content: Contacts */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className={`h-3.5 w-3.5 rounded-full ${shimmerClass}`} />
                <div className={`h-3.5 w-32 ${shimmerClass}`} />
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3.5 w-3.5 rounded-full ${shimmerClass}`} />
                <div className={`h-3.5 w-44 ${shimmerClass}`} />
              </div>
            </div>

            {/* Footer / Notes placeholder */}
            <div className="pt-1.5 flex justify-between items-center">
              <div className={`h-3 w-28 ${shimmerClass}`} />
              <div className="flex gap-2">
                <div className={`h-7 w-7 rounded-lg ${shimmerClass}`} />
                <div className={`h-7 w-7 rounded-lg ${shimmerClass}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
