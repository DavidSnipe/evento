"use client";

import { useState } from "react";
import { createVendor } from "@/app/(dashboard)/dashboard/events/[id]/vendors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddVendorDialog({
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
    const result = await createVendor(eventId, formData);
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
        className="glass-panel mx-4 w-full max-w-md animate-in fade-in zoom-in-95 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 font-serif text-xl font-semibold">Adaugă Furnizor</h2>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categorie (ex: Foto, Locație, Muzică)</Label>
            <Input name="category" placeholder="ex: Foto/Video" required autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Nume Furnizor/Companie</Label>
            <Input name="name" placeholder="ex: Studio X" required />
          </div>

          <div className="space-y-2">
            <Label>Persoană de contact (opțional)</Label>
            <Input name="contact_person" placeholder="ex: Andrei" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefon (opțional)</Label>
              <Input name="phone" type="tel" placeholder="07xx" />
            </div>
            <div className="space-y-2">
              <Label>Email (opțional)</Label>
              <Input name="email" type="email" placeholder="contact@..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <select name="status" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="contactat">Contactat</option>
              <option value="avans_platit">Avans Plătit</option>
              <option value="confirmat">Confirmat (Plătit integral)</option>
              <option value="anulat">Anulat / Refuzat</option>
            </select>
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
