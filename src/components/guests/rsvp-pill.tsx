"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/types/guests";

const RSVP_CONFIG: Record<RsvpStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pending: { label: "În așteptare", bg: "bg-[#FFF4E5]", text: "text-[#D97706]", border: "border-[#FFE3B9]", dot: "bg-[#FF9F0A]" },
  accepted: { label: "Confirmat", bg: "bg-[#E8F8EE]", text: "text-[#34C759]", border: "border-[#C6F1D5]", dot: "bg-[#34C759]" },
  declined: { label: "Refuzat", bg: "bg-[#FFF0F0]", text: "text-[#FF3B30]", border: "border-[#FFD2D2]", dot: "bg-[#FF3B30]" },
  maybe: { label: "Poate", bg: "bg-[#FEF7E7]", text: "text-[#B8860B]", border: "border-[#FDE68A]", dot: "bg-[#F59E0B]" },
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
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
    } else {
      setCoords(null);
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
        onClick={() => {
          if (!readonly) {
            if (!isOpen) updateCoords();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[7px] border px-2 py-0.5 text-[10.5px] font-semibold tracking-wide transition-all duration-300 ease-out shadow-[0_1px_2px_rgba(180,100,120,0.02)]",
          config.bg, config.text, config.border,
          !readonly && "cursor-pointer hover:shadow-[0_2px_8px_rgba(180,100,120,0.04)] hover:scale-[1.02] active:scale-95",
          isSyncing && "animate-soft-pulse opacity-85"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config.dot)} />
        {config.label}
      </button>

      {isOpen && mounted && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
            transition: "none",
          }}
          className="w-36 rounded-[14px] border border-border-rose-18 bg-white/95 p-1 shadow-[0_8px_32px_rgba(180,100,120,0.12)] backdrop-blur-[12px] animate-scale-in origin-top-left"
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
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors cursor-pointer",
                  s === status ? cn(c.bg, c.text, "border border-transparent") : "text-text-secondary hover:bg-[#FEF0F3]/80 hover:text-[#B8516B]"
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
