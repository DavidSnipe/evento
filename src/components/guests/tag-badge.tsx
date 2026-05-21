"use client";

import { cn } from "@/lib/utils";
import { getTagConfig } from "@/types/guests";
import { X } from "lucide-react";

type TagBadgeProps = {
  tag: string;
  size?: "sm" | "md";
  onRemove?: () => void;
};

export function TagBadge({ tag, size = "sm", onRemove }: TagBadgeProps) {
  const config = getTagConfig(tag);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-all duration-200 ease-out",
        config.color,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        onRemove && "hover:scale-[1.03] active:scale-95 cursor-default"
      )}
    >
      <span className="leading-none">{config.icon}</span>
      {config.label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
