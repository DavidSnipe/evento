import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type VendorStarsProps = {
  rating: number | null;
  className?: string;
  size?: "sm" | "md";
};

export function VendorStars({ rating, className, size = "sm" }: VendorStarsProps) {
  const value = rating ?? 0;
  const iconClass = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Rating ${value}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            iconClass,
            i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
