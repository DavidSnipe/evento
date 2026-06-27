"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ruler, Loader2, CheckCircle2 } from "lucide-react";

import { updateSeatingRoomSize } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ro } from "@/lib/i18n/ro";
import {
  MAX_SEATING_ROOM_DIMENSION_M,
  MIN_SEATING_ROOM_DIMENSION_M,
  formatMeters,
} from "@/lib/seating/spatial";
import { cn } from "@/lib/utils";

type RoomSizePopoverProps = {
  eventId: string;
  roomWidthM: number;
  roomHeightM: number;
  onRoomSizeChange: (widthM: number, heightM: number) => void;
  disabled?: boolean;
};

export function RoomSizePopover({
  eventId,
  roomWidthM,
  roomHeightM,
  onRoomSizeChange,
  disabled = false,
}: RoomSizePopoverProps) {
  const [open, setOpen] = useState(false);
  const [widthInput, setWidthInput] = useState(String(roomWidthM));
  const [heightInput, setHeightInput] = useState(String(roomHeightM));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setWidthInput(String(roomWidthM));
    setHeightInput(String(roomHeightM));
    setError(null);
  }, [open, roomWidthM, roomHeightM]);

  useEffect(() => {
    if (!successToast) return;
    const timer = window.setTimeout(() => setSuccessToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [successToast]);

  async function handleSave() {
    const widthM = Number.parseFloat(widthInput.replace(",", "."));
    const heightM = Number.parseFloat(heightInput.replace(",", "."));

    if (
      !Number.isFinite(widthM) ||
      !Number.isFinite(heightM) ||
      widthM < MIN_SEATING_ROOM_DIMENSION_M ||
      widthM > MAX_SEATING_ROOM_DIMENSION_M ||
      heightM < MIN_SEATING_ROOM_DIMENSION_M ||
      heightM > MAX_SEATING_ROOM_DIMENSION_M
    ) {
      setError(`Introdu valori între ${MIN_SEATING_ROOM_DIMENSION_M} m și ${MAX_SEATING_ROOM_DIMENSION_M} m.`);
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updateSeatingRoomSize(eventId, widthM, heightM);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.widthM != null && result.heightM != null) {
      onRoomSizeChange(result.widthM, result.heightM);
    }
    setOpen(false);
    setSuccessToast(ro.seating.roomSize.saved);
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            "h-7 w-7 rounded-lg text-slate-650 hover:bg-slate-100",
            open && "bg-primary/10 text-primary hover:bg-primary/15"
          )}
          onClick={() => setOpen((value) => !value)}
          title={`Dimensiuni sală: ${formatMeters(roomWidthM)} × ${formatMeters(roomHeightM)}`}
        >
          <Ruler className="h-3.5 w-3.5" />
        </Button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => !saving && setOpen(false)}
            />
            <div
              className="absolute bottom-full right-0 z-50 mb-2 w-[240px] rounded-xl border border-slate-200/80 bg-white p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dimensiuni sală
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Lățime și înălțime în metri. Mese în afara noii limite rămân la loc — mută-le manual.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Lățime (m)</span>
                  <Input
                    type="number"
                    min={MIN_SEATING_ROOM_DIMENSION_M}
                    max={MAX_SEATING_ROOM_DIMENSION_M}
                    step={0.5}
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    className="h-8 text-xs font-semibold"
                    disabled={saving}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Înălțime (m)</span>
                  <Input
                    type="number"
                    min={MIN_SEATING_ROOM_DIMENSION_M}
                    max={MAX_SEATING_ROOM_DIMENSION_M}
                    step={0.5}
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    className="h-8 text-xs font-semibold"
                    disabled={saving}
                  />
                </label>
              </div>

              {error && (
                <p className="mt-2 text-[11px] font-medium text-red-600">{error}</p>
              )}

              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  disabled={saving}
                  onClick={() => setOpen(false)}
                >
                  Anulează
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1 text-xs font-bold"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Salvez...
                    </>
                  ) : (
                    "Aplică"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {mounted &&
        successToast &&
        createPortal(
          <div
            role="status"
            className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successToast}
          </div>,
          document.body
        )}
    </>
  );
}
