"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  Wand2,
  Download,
  Music,
  ImageIcon,
  FileText,
  Printer,
} from "lucide-react";

import { autoAssignGuests } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type SeatingToolbarProps = {
  eventId: string;
  totalSeated: number;
  totalGuests: number;
  totalCapacity: number;
  showStage: boolean;
  onToggleStage: () => void;
  onAddTable: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  printSort: "alpha" | "table";
  onTogglePrintSort: () => void;
};

export function SeatingToolbar({
  eventId,
  totalSeated,
  totalGuests,
  totalCapacity,
  showStage,
  onToggleStage,
  onAddTable,
  onExportPng,
  onExportPdf,
  printSort,
  onTogglePrintSort,
}: SeatingToolbarProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  async function handleAutoAssign() {
    setAssigning(true);
    const result = await autoAssignGuests(eventId);
    setAssigning(false);
    if (result.count > 0) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Stats pill */}
      <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm shadow-sm backdrop-blur-sm">
        <span className="font-semibold text-foreground">{totalSeated}</span>
        <span className="text-muted-foreground">{ro.seating.toolbar.stats}</span>
        <span className="font-semibold text-foreground">{totalCapacity}</span>
        <div className="mx-1 h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">
          ({totalGuests} invitați)
        </span>
      </div>

      <div className="flex-1" />

      {/* Stage toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleStage}
        className={cn(
          "gap-2 rounded-xl",
          showStage && "bg-primary/10 text-primary"
        )}
      >
        <Music className="h-4 w-4" />
        <span className="hidden sm:inline">
          {showStage ? ro.seating.toolbar.hideStage : ro.seating.toolbar.showStage}
        </span>
      </Button>

      {/* Auto-assign */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAutoAssign}
        disabled={assigning}
        className="gap-2 rounded-xl"
      >
        <Wand2 className="h-4 w-4" />
        <span className="hidden sm:inline">
          {assigning ? "..." : ro.seating.toolbar.autoAssign}
        </span>
      </Button>

      {/* Export dropdown */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="gap-2 rounded-xl"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{ro.seating.toolbar.export}</span>
        </Button>

        {showExportMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowExportMenu(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border/60 bg-white/90 p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  onExportPng();
                  setShowExportMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/50"
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                {ro.seating.toolbar.exportPng}
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportPdf();
                  setShowExportMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/50"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                {ro.seating.toolbar.exportPdf}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setShowExportMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/50"
              >
                <Printer className="h-4 w-4 text-muted-foreground" />
                Printează (PDF)
              </button>
              <div className="my-1 border-t border-border/40" />
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sortare Listă Print
              </div>
              <button
                type="button"
                onClick={() => {
                  onTogglePrintSort();
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/50"
              >
                <span>{printSort === "alpha" ? "Alfabetic" : "Pe Mese"}</span>
                <span className="text-[10px] text-muted-foreground">Schimbă</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add table */}
      <Button size="sm" onClick={onAddTable} className="gap-2 rounded-xl">
        <Plus className="h-4 w-4" />
        {ro.seating.addTable}
      </Button>
    </div>
  );
}
