"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Plus,
  Wand2,
  Download,
  ImageIcon,
  FileText,
  Printer,
  Sparkles,
  Layout,
  Check,
  ChevronDown
} from "lucide-react";

import {
  autoSeatGuestsAction
} from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type SeatingToolbarProps = {
  eventId: string;
  totalSeated: number;
  totalGuests: number;
  totalCapacity: number;
  onAddTable: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  printSort: "alpha" | "table";
  onTogglePrintSort: () => void;
  globalLock: boolean;
  onToggleGlobalLock: () => void;
  onRunAutoSeat?: (strategy: "family" | "even") => Promise<void>;
  
  // Immersive focus mode and lifted template props
  onToggleTemplateMenu: (show: boolean) => void;
  applyingTemplate?: boolean;
  workspaceMode: boolean;
};

export function SeatingToolbar({
  eventId,
  totalSeated,
  totalGuests,
  totalCapacity,
  onAddTable,
  onExportPng,
  onExportPdf,
  printSort,
  onTogglePrintSort,
  globalLock,
  onToggleGlobalLock,
  onRunAutoSeat,
  
  onToggleTemplateMenu,
  applyingTemplate = false,
  workspaceMode,
}: SeatingToolbarProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAutoSeatMenu, setShowAutoSeatMenu] = useState(false);
  const [strategy, setStrategy] = useState<"family" | "even">("family");

  async function handleAutoAssign() {
    setAssigning(true);
    setShowAutoSeatMenu(false);
    if (onRunAutoSeat) {
      await onRunAutoSeat(strategy);
    } else {
      const result = await autoSeatGuestsAction(eventId, strategy);
      if (result.success) {
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    }
    setAssigning(false);
  }



  return (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-4 transition-all duration-300",
      workspaceMode
        ? "bg-white border-b border-slate-200/80 w-full rounded-none px-6 py-3.5 shadow-sm"
        : "bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200/50 shadow-sm backdrop-blur-sm"
    )}>
      {/* LEFT: Stats pill */}
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium shadow-sm border border-slate-100 select-none shrink-0">
        <span className="font-semibold text-slate-800">{totalSeated}</span>
        <span className="text-muted-foreground">{ro.seating.toolbar.stats}</span>
        <span className="font-semibold text-slate-800">{totalCapacity}</span>
        <div className="mx-1 h-3 w-px bg-slate-200" />
        <span className="text-[11px] text-muted-foreground">
          ({totalGuests} invitați)
        </span>
      </div>

      {/* CENTER: Auto Seat & Export Actions */}
      <div className="flex items-center gap-2.5">
        {/* Auto-seat button & strategy dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            disabled={assigning}
            onClick={() => setShowAutoSeatMenu(!showAutoSeatMenu)}
            className="gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Wand2 className="h-4 w-4 text-slate-500" />
            <span>Smart Auto-Așezare</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </Button>

          {showAutoSeatMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAutoSeatMenu(false)} />
              <div className="absolute left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl animate-in fade-in slide-in-from-top-1 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Alege Strategia
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setStrategy("family")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-left border transition-all duration-150",
                      strategy === "family"
                        ? "border-primary/30 bg-primary/5 text-primary font-semibold"
                        : "border-transparent text-slate-650 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex flex-col">
                      <span>Prioritizează Familiile</span>
                      <span className="text-[9px] text-slate-400 font-normal mt-0.5">Nu separă cuplurile sau grupurile</span>
                    </div>
                    {strategy === "family" && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrategy("even")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-left border transition-all duration-150",
                      strategy === "even"
                        ? "border-primary/30 bg-primary/5 text-primary font-semibold"
                        : "border-transparent text-slate-650 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex flex-col">
                      <span>Distribuie Egal</span>
                      <span className="text-[9px] text-slate-400 font-normal mt-0.5">Repartizare uniformă pe locuri</span>
                    </div>
                    {strategy === "even" && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                </div>

                <Button
                  size="sm"
                  className="w-full rounded-xl text-xs h-9 font-semibold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={handleAutoAssign}
                >
                  <Sparkles className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
                  Rulează Asistentul
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Export dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>{ro.seating.toolbar.export}</span>
          </Button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 top-full z-50 mt-2 w-48 rounded-xl border border-border/60 bg-white/95 p-1 shadow-lg backdrop-blur-md">
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
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-foreground hover:bg-muted/50"
                >
                  <span>{printSort === "alpha" ? "Alfabetic" : "Pe Mese"}</span>
                  <span className="text-[10px] text-muted-foreground">Schimbă</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: Lock, Templates, Workspace Mode, and Primary CTA */}
      <div className="flex items-center gap-2.5">
        {/* Global lock button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleGlobalLock}
          className={cn(
            "gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm transition-all duration-200",
            globalLock
              ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100/60"
              : "hover:bg-slate-50 text-slate-700"
          )}
        >
          <span>{globalLock ? "🔐 Schemă Blocată" : "🔓 Blochează Schema"}</span>
        </Button>

        {/* Room Templates Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={applyingTemplate}
          onClick={() => onToggleTemplateMenu(true)}
          className="gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Layout className="h-4 w-4 text-slate-500" />
          <span>Șabloane Sală</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </Button>



        {/* Add Element (Primary CTA) */}
        <Button
          size="sm"
          onClick={onAddTable}
          className="gap-2 rounded-xl h-9 text-xs font-semibold bg-gradient-to-r from-primary to-pink-500 hover:from-primary/95 hover:to-pink-500/95 text-white border-none shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          Adaugă Element
        </Button>
      </div>
    </div>
  );
}
