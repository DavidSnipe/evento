"use client";

import { useState } from "react";

import { eventTypeOptions } from "@/lib/events/config";
import { cn } from "@/lib/utils";
import type { EventType } from "@/types";

type EventTypePickerProps = {
  name?: string;
  defaultValue?: EventType;
};

export function EventTypePicker({
  name = "event_type",
  defaultValue = "wedding",
}: EventTypePickerProps) {
  const [selected, setSelected] = useState<EventType>(defaultValue);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {eventTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-[10px] border p-4 text-center text-[12.5px] font-semibold transition-all duration-200 cursor-pointer active:scale-95",
                isSelected
                  ? "border-[#B8516B] bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] text-[#B8516B] shadow-[0_2px_8px_rgba(180,100,120,0.06)]"
                  : "border-[rgba(210,170,185,0.22)] bg-white text-text-secondary hover:border-[#B8516B]/50 hover:bg-[#FEF0F3]/30 hover:text-[#B8516B]"
              )}
            >
              <Icon
                className={cn("h-4.5 w-4.5 transition-transform duration-200", isSelected ? "text-[#B8516B] scale-110" : "text-text-subtle")}
              />
              <span className="leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
