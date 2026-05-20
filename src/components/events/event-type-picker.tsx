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
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/15 shadow-md shadow-primary/10"
                  : "border-border bg-background/60 hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <Icon
                className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")}
              />
              <span className="font-medium leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
