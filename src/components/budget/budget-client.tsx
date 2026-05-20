"use client";

import { useState } from "react";
import { Plus, Wallet, TrendingUp, PiggyBank } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BudgetItem } from "@/types/budget";
import { BudgetList } from "./budget-list";
import { AddBudgetDialog } from "./add-budget-dialog";

export function BudgetClient({
  eventId,
  initialItems,
}: {
  eventId: string;
  initialItems: BudgetItem[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  const totalEstimated = initialItems.reduce((acc, curr) => acc + curr.estimated_cost, 0);
  const totalActual = initialItems.reduce((acc, curr) => acc + curr.actual_cost, 0);
  const totalPaid = initialItems.reduce((acc, curr) => acc + curr.paid_amount, 0);
  
  const remainingToPay = totalActual - totalPaid;
  const progressPercent = totalActual > 0 ? (totalPaid / totalActual) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel p-6 flex flex-col gap-2 rounded-2xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Total Estimat</span>
          </div>
          <span className="text-3xl font-serif font-bold">{totalEstimated.toLocaleString("ro-RO")} lei</span>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-2 rounded-2xl bg-primary/5 border-primary/10">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Total Real</span>
          </div>
          <span className="text-3xl font-serif font-bold text-primary">{totalActual.toLocaleString("ro-RO")} lei</span>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-2 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <PiggyBank className="h-4 w-4" />
              <span className="text-sm font-medium uppercase tracking-wider">Rămas de plată</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
              {Math.round(progressPercent)}% Plătit
            </span>
          </div>
          <span className="text-3xl font-serif font-bold">{remainingToPay.toLocaleString("ro-RO")} lei</span>
          <Progress value={progressPercent} className="h-2 mt-2" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-semibold">Lista Cheltuieli</h2>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Adaugă Cost
        </Button>
      </div>

      <BudgetList items={initialItems} eventId={eventId} />

      <AddBudgetDialog
        eventId={eventId}
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />
    </div>
  );
}
