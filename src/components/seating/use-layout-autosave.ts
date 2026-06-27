"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { upsertCurrentPlanSnapshot } from "@/app/(dashboard)/dashboard/events/[id]/seating/layout-actions";
import { captureAutosaveThumbnail } from "@/lib/seating/autosave-thumbnail";
import type { SeatingLayoutSnapshot } from "@/types/seating";

const DEBOUNCE_MS = 4000;
const MIN_INTERVAL_MS = 30_000;

export type LayoutAutosaveStatus = {
  phase: "hidden" | "saving" | "saved";
};

type UseLayoutAutosaveOptions = {
  eventId: string;
  previewSnapshot: SeatingLayoutSnapshot | null;
  captureThumbnail?: () => Promise<string>;
  onAutosaveComplete?: (snapshot: SeatingLayoutSnapshot) => void;
};

export function useLayoutAutosave({
  eventId,
  previewSnapshot,
  captureThumbnail,
  onAutosaveComplete,
}: UseLayoutAutosaveOptions) {
  const isDirtyRef = useRef(false);
  const lastAutosaveRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveInProgressRef = useRef(false);
  const previewSnapshotRef = useRef(previewSnapshot);
  const onAutosaveCompleteRef = useRef(onAutosaveComplete);
  previewSnapshotRef.current = previewSnapshot;
  onAutosaveCompleteRef.current = onAutosaveComplete;

  const [status, setStatus] = useState<LayoutAutosaveStatus>({
    phase: "hidden",
  });

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const performAutosave = useCallback(
    async (options?: { skipMinInterval?: boolean }) => {
      if (previewSnapshotRef.current) return;
      if (!isDirtyRef.current) return;
      if (autosaveInProgressRef.current) return;

      const elapsed = Date.now() - lastAutosaveRef.current;
      if (!options?.skipMinInterval && elapsed < MIN_INTERVAL_MS) {
        clearDebounceTimer();
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          void performAutosave();
        }, MIN_INTERVAL_MS - elapsed);
        return;
      }

      autosaveInProgressRef.current = true;
      setStatus({ phase: "saving" });

      let thumbnail: string | undefined;
      if (captureThumbnail) {
        thumbnail = await captureAutosaveThumbnail(captureThumbnail);
      }

      try {
        const result = await upsertCurrentPlanSnapshot(eventId, thumbnail);

        if (result.error) {
          console.error("[layout-autosave]", result.error);
          setStatus({ phase: "hidden" });
          return;
        }

        if (result.snapshot) {
          onAutosaveCompleteRef.current?.(result.snapshot);
        }

        isDirtyRef.current = false;
        lastAutosaveRef.current = Date.now();
        setStatus({ phase: "saved" });
      } finally {
        autosaveInProgressRef.current = false;
      }
    },
    [captureThumbnail, clearDebounceTimer, eventId]
  );

  const scheduleAutosave = useCallback(() => {
    if (previewSnapshotRef.current) return;

    clearDebounceTimer();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void performAutosave();
    }, DEBOUNCE_MS);
  }, [clearDebounceTimer, performAutosave]);

  const markLayoutDirty = useCallback(() => {
    if (previewSnapshotRef.current) return;
    isDirtyRef.current = true;
    scheduleAutosave();
  }, [scheduleAutosave]);

  const flushAutosave = useCallback(async () => {
    clearDebounceTimer();
    await performAutosave({ skipMinInterval: true });
  }, [clearDebounceTimer, performAutosave]);

  useEffect(() => {
    const handler = () => {
      if (isDirtyRef.current && !previewSnapshotRef.current) {
        void flushAutosave();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flushAutosave]);

  useEffect(() => {
    return () => clearDebounceTimer();
  }, [clearDebounceTimer]);

  useEffect(() => {
    if (previewSnapshot) {
      clearDebounceTimer();
    }
  }, [previewSnapshot, clearDebounceTimer]);

  return { markLayoutDirty, flushAutosave, status };
}
