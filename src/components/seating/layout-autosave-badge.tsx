"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import type { LayoutAutosaveStatus } from "@/components/seating/use-layout-autosave";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

const SAVED_VISIBLE_MS = 10_000;
const FADE_MS = 500;

type DisplayPhase = "hidden" | "saving" | "saved";

type LayoutAutosaveBadgeProps = {
  status: LayoutAutosaveStatus;
  hidden?: boolean;
  className?: string;
};

export function LayoutAutosaveBadge({
  status,
  hidden = false,
  className,
}: LayoutAutosaveBadgeProps) {
  const [displayPhase, setDisplayPhase] = useState<DisplayPhase>("hidden");
  const [isMounted, setIsMounted] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDismissedRef = useRef(false);

  const clearSavedTimer = useCallback(() => {
    if (savedTimerRef.current !== null) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  }, []);

  const clearUnmountTimer = useCallback(() => {
    if (unmountTimerRef.current !== null) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearSavedTimer();
    clearUnmountTimer();
  }, [clearSavedTimer, clearUnmountTimer]);

  const beginHide = useCallback(() => {
    clearSavedTimer();
    clearUnmountTimer();
    setDisplayPhase("hidden");
    unmountTimerRef.current = setTimeout(() => {
      setIsMounted(false);
      unmountTimerRef.current = null;
    }, FADE_MS);
  }, [clearSavedTimer, clearUnmountTimer]);

  useEffect(() => {
    if (hidden) {
      clearAllTimers();
      savedDismissedRef.current = false;
      setDisplayPhase("hidden");
      setIsMounted(false);
      return;
    }

    if (status.phase === "saving") {
      clearAllTimers();
      savedDismissedRef.current = false;
      setIsMounted(true);
      setDisplayPhase("saving");
      return;
    }

    if (status.phase === "saved" && !savedDismissedRef.current) {
      clearAllTimers();
      setIsMounted(true);
      setDisplayPhase("saved");
      savedTimerRef.current = setTimeout(() => {
        savedTimerRef.current = null;
        savedDismissedRef.current = true;
        beginHide();
      }, SAVED_VISIBLE_MS);
      return;
    }

    if (status.phase === "hidden" && isMounted) {
      savedDismissedRef.current = true;
      beginHide();
    }
  }, [status.phase, hidden, isMounted, clearAllTimers, beginHide]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  if (!isMounted) return null;

  const isSaving = displayPhase === "saving";

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-[#dcb5be]/40 bg-white/80 px-3 py-1.5 text-xs text-[#6b5460] shadow-sm backdrop-blur-sm print:hidden transition-opacity duration-500 ease-out",
        displayPhase === "hidden" ? "opacity-0" : "opacity-100",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-[#b8516b]" />
          <span>{ro.seating.layoutSnapshots.autosave.saving}</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-[#89a293]" />
          <span>{ro.seating.layoutSnapshots.autosave.saved}</span>
        </>
      )}
    </div>
  );
}
