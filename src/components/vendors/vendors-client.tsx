"use client";

import { useState } from "react";
import { Plus, Users, CheckCircle, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Vendor } from "@/types/vendors";
import { VendorsList } from "./vendors-list";
import { AddVendorDialog } from "./add-vendor-dialog";

export function VendorsClient({
  eventId,
  initialItems,
}: {
  eventId: string;
  initialItems: Vendor[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  const total = initialItems.length;
  const confirmed = initialItems.filter(v => v.status === "confirmat").length;
  const contactat = initialItems.filter(v => v.status === "contactat").length;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel p-6 flex flex-col gap-2 rounded-2xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Total Furnizori</span>
          </div>
          <span className="text-3xl font-serif font-bold">{total}</span>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-2 rounded-2xl bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Confirmați</span>
          </div>
          <span className="text-3xl font-serif font-bold text-emerald-700">{confirmed}</span>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-2 rounded-2xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">În discuții</span>
          </div>
          <span className="text-3xl font-serif font-bold">{contactat}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-semibold">Lista Contacte</h2>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Adaugă Furnizor
        </Button>
      </div>

      <VendorsList items={initialItems} eventId={eventId} />

      <AddVendorDialog
        eventId={eventId}
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />
    </div>
  );
}
