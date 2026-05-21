"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  isSyncing?: boolean;
};

export function RsvpPill({ status, onChange, readonly, isSyncing }: RsvpPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const config = RSVP_CONFIG[status];

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: Math.max(8, Math.min(window.innerWidth - 152, rect.left + window.scrollX)),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !readonly && setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
          config.bg, config.text,
          !readonly && "cursor-pointer hover:shadow-sm active:scale-95",
          isSyncing && "animate-soft-pulse opacity-85"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
        {config.label}
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
          }}
          className="w-36 rounded-xl border border-border/50 bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
        >
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
        </div>,
        document.body
      )}
    </>
  );
}
