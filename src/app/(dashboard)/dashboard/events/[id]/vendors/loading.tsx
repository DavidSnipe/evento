import React from "react";

export default function VendorsLoading() {
  const shimmerClass =
    "animate-shimmer bg-gradient-to-r from-muted/50 via-pink-50/40 to-muted/50 bg-[length:200%_100%] rounded-xl";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-2 animate-fade-in-down">
        <div className={`h-8.5 w-60 ${shimmerClass}`} />
        <div className={`h-4.5 w-96 max-w-full ${shimmerClass}`} />
      </div>

      <div
        className="flex flex-col lg:flex-row gap-6 animate-fade-in-up"
        style={{ animationDelay: "50ms" }}
      >
        <div className="lg:w-[260px] shrink-0 space-y-3">
          <div className={`h-9 w-full ${shimmerClass}`} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-14 w-full min-w-[200px] ${shimmerClass}`} />
          ))}
        </div>
        <div className="flex-1 space-y-5">
          <div className={`h-40 w-full rounded-[18px] ${shimmerClass}`} />
          <div className={`h-9 w-36 ${shimmerClass}`} />
          <div className={`h-64 w-full rounded-[18px] ${shimmerClass}`} />
        </div>
      </div>
    </div>
  );
}
