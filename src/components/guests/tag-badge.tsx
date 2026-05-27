"use client";

import { cn } from "@/lib/utils";
import { getTagConfig } from "@/types/guests";
import { X } from "lucide-react";

type TagBadgeProps = {
  tag: string;
  size?: "sm" | "md";
  onRemove?: () => void;
};

// Premium styling for each semantic tag value
const TAG_THEME: Record<string, string> = {
  vip: "bg-[#FFF9E6] text-[#B8860B] border-[#FCE49F]", // Gold
  godparents: "bg-[#FAF3FB] text-[#7030A0] border-[#F2DDF5]", // Lavender / Violet
  family: "bg-[#FEF0F3] text-[#B8516B] border-[#FCE2E9]", // Brand Blush / Rose
  friends: "bg-[#EEF6FC] text-[#2B6CB0] border-[#D2E7F7]", // Soft Blue
  kids: "bg-[#F2FAF3] text-[#2E7D32] border-[#D5EED8]", // Soft Green
  transport: "bg-[#F4F5F7] text-[#4E5D6C] border-[#E4E6EA]", // Slate / Grey
  accommodation: "bg-[#EDFAF8] text-[#007A78] border-[#CEF1ED]", // Teal
  vegetarian: "bg-[#F5FAF0] text-[#558B2F] border-[#E1F0D5]", // Olive / Herb Green
  allergies: "bg-[#FFF0F0] text-[#C53030] border-[#FFD2D2]", // Soft Coral / Red
};

export function TagBadge({ tag, size = "sm", onRemove }: TagBadgeProps) {
  const config = getTagConfig(tag);
  const colorClass = TAG_THEME[config.value] ?? "bg-[#F4F5F7] text-[#4E5D6C] border-[#E4E6EA]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[7px] border font-medium transition-all duration-200 ease-out shadow-[0_1px_2px_rgba(180,100,120,0.02)]",
        colorClass,
        size === "sm" ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-1 text-xs",
        onRemove && "hover:scale-[1.03] active:scale-95 cursor-default"
      )}
    >
      <span className="leading-none text-[10.5px]">{config.icon}</span>
      <span className="tracking-wide">{config.label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
