"use client";

import { Circle, RectangleHorizontal, Heart } from "lucide-react";
import { useState } from "react";

import { createTable } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { TableShape } from "@/types/guests";

type AddTableDialogProps = {
  eventId: string;
  open: boolean;
  existingTablesCount: number;
  onClose: () => void;
};

const shapes: { value: TableShape; label: string; icon: typeof Circle }[] = [
  { value: "round", label: ro.seating.shapes.round, icon: Circle },
  { value: "rectangular", label: ro.seating.shapes.rectangular, icon: RectangleHorizontal },
  { value: "sweetheart", label: ro.seating.shapes.sweetheart, icon: Heart },
];

export function AddTableDialog({ eventId, open, existingTablesCount, onClose }: AddTableDialogProps) {
  const [shape, setShape] = useState<TableShape>("round");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    formData.set("shape", shape);
    const result = await createTable(eventId, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="glass-panel mx-4 w-full max-w-md animate-in fade-in zoom-in-95 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 font-serif text-xl font-semibold">{ro.seating.addTable}</h2>

        <form action={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="table-name">{ro.seating.form.name}</Label>
            <Input
              id="table-name"
              name="name"
              placeholder={ro.seating.form.namePlaceholder}
              defaultValue={`Masa ${existingTablesCount + 1}`}
              required
              autoFocus
            />
          </div>

          {/* Shape selector */}
          <div className="space-y-2">
            <Label>{ro.seating.form.shape}</Label>
            <div className="grid grid-cols-3 gap-2">
              {shapes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setShape(s.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm transition-all",
                    shape === s.value
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <s.icon
                    className={cn(
                      "h-6 w-6",
                      shape === s.value ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="table-capacity">{ro.seating.form.capacity}</Label>
            <Input
              id="table-capacity"
              name="capacity"
              type="number"
              min={1}
              max={50}
              defaultValue={shape === "sweetheart" ? 2 : 8}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {ro.seating.form.cancel}
            </Button>
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "..." : ro.seating.form.add}
            </Button>
          </div>
        </form>
      </div>

      {/* Backdrop click to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
