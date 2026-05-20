"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import type { BudgetItem } from "@/types/budget";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { deleteBudgetItem } from "@/app/(dashboard)/dashboard/events/[id]/budget/actions";

export function BudgetList({ items, eventId }: { items: BudgetItem[], eventId: string }) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/30 text-center">
        <p className="font-medium text-muted-foreground">Nu ai adăugat nicio cheltuială încă.</p>
      </div>
    );
  }

  const handleDelete = (itemId: string) => {
    if (confirm("Sigur vrei să ștergi acest cost?")) {
      startTransition(() => {
        deleteBudgetItem(eventId, itemId);
      });
    }
  };

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const progress = item.actual_cost > 0 ? (item.paid_amount / item.actual_cost) * 100 : 0;
        
        return (
          <div key={item.id} className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
                <h3 className="font-medium">{item.title}</h3>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <div>
                  Estimat: <span className="font-medium text-foreground">{item.estimated_cost.toLocaleString("ro-RO")} lei</span>
                </div>
                <div>
                  Real: <span className="font-medium text-foreground">{item.actual_cost.toLocaleString("ro-RO")} lei</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-64 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plătit: {item.paid_amount.toLocaleString("ro-RO")} lei</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isPending}
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
