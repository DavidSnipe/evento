"use client";

import { useState } from "react";
import { createBudgetItem } from "@/app/(dashboard)/dashboard/events/[id]/budget/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddBudgetDialog({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await createBudgetItem(eventId, formData);
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
        <h2 className="mb-6 font-serif text-xl font-semibold">Adaugă Cheltuială</h2>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categorie (ex: Foto/Video, Muzică, Locație)</Label>
            <Input name="category" placeholder="ex: Foto/Video" required autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Titlu/Nume Furnizor</Label>
            <Input name="title" placeholder="ex: Fotograf principal" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost Estimat (Lei)</Label>
              <Input name="estimated_cost" type="number" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label>Cost Real (Lei)</Label>
              <Input name="actual_cost" type="number" defaultValue="0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Avans Plătit (Lei)</Label>
            <Input name="paid_amount" type="number" defaultValue="0" />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Anulează
            </Button>
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Se adaugă..." : "Salvează"}
            </Button>
          </div>
        </form>
      </div>
      
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
