"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/types/guests";

const RSVP_CONFIG: Record<RsvpStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "În așteptare", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  accepted: { label: "Confirmat", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  declined: { label: "Refuzat", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  maybe: { label: "Poate", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
};

type RsvpPillProps = {
  status: RsvpStatus;
  onChange?: (status: RsvpStatus) => void;
  readonly?: boolean;
};

export function RsvpPill({ status, onChange, readonly }: RsvpPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = RSVP_CONFIG[status];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !readonly && setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
          config.bg, config.text,
          !readonly && "cursor-pointer hover:shadow-sm active:scale-95"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
        {config.label}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-xl border border-border/50 bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
          {(Object.keys(RSVP_CONFIG) as RsvpStatus[]).map((s) => {
            const c = RSVP_CONFIG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange?.(s);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  s === status ? cn(c.bg, c.text) : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
