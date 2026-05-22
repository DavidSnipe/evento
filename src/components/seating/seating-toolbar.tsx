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
  Sparkles,
  Layout,
  Check,
  ChevronDown
} from "lucide-react";

import {
  autoSeatGuestsAction,
  applyRoomTemplate
} from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
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
  globalLock: boolean;
  onToggleGlobalLock: () => void;
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
  globalLock,
  onToggleGlobalLock,
}: SeatingToolbarProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showAutoSeatMenu, setShowAutoSeatMenu] = useState(false);
  const [strategy, setStrategy] = useState<"family" | "even">("family");

  async function handleAutoAssign() {
    setAssigning(true);
    const result = await autoSeatGuestsAction(eventId, strategy);
    setAssigning(false);
    setShowAutoSeatMenu(false);
    if (result.success) {
      router.refresh();
    } else if (result.error) {
      alert(result.error);
    }
  }

  async function handleApplyTemplate(type: "ballroom" | "barn" | "garden" | "restaurant") {
    if (!confirm("Sigur doriți să ștergeți așezarea curentă și să aplicați acest șablon? Toți invitații vor fi nerepartizați.")) {
      return;
    }
    setApplyingTemplate(true);
    setShowTemplateMenu(false);
    const result = await applyRoomTemplate(eventId, type);
    setApplyingTemplate(false);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "A apărut o eroare la aplicarea șablonului.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200/50 shadow-sm backdrop-blur-sm">
      {/* Stats pill */}
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium shadow-sm border border-slate-100">
        <span className="font-semibold text-slate-800">{totalSeated}</span>
        <span className="text-muted-foreground">{ro.seating.toolbar.stats}</span>
        <span className="font-semibold text-slate-800">{totalCapacity}</span>
        <div className="mx-1 h-3 w-px bg-slate-200" />
        <span className="text-[11px] text-muted-foreground">
          ({totalGuests} invitați)
        </span>
      </div>

      <div className="flex-1" />

      {/* Global lock button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleGlobalLock}
        className={cn(
          "gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm",
          globalLock && "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15"
        )}
      >
        <span>{globalLock ? "🔐 Schemă Blocată" : "🔓 Blochează Mesele"}</span>
      </Button>

      {/* Room Templates dropdown */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          disabled={applyingTemplate}
          onClick={() => setShowTemplateMenu(!showTemplateMenu)}
          className="gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm"
        >
          <Layout className="h-4 w-4 text-slate-500" />
          <span>Șabloane Sală</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </Button>

        {showTemplateMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Alege un Preset de Sală
              </div>
              <button
                type="button"
                onClick={() => handleApplyTemplate("ballroom")}
                className="flex w-full flex-col text-left rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800">Ballroom (Sală Bal)</span>
                <span className="text-[10px] text-slate-400">Ring dans rotund, scenă, 8 mese rotunde</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate("barn")}
                className="flex w-full flex-col text-left rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800">Hambar Rustic</span>
                <span className="text-[10px] text-slate-400">Ring dans drept., bar, 6 mese lungi banquet</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate("garden")}
                className="flex w-full flex-col text-left rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800">Grădină în Aer Liber</span>
                <span className="text-[10px] text-slate-400">Ring rotund, cabina foto, 10 mese rotunde</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate("restaurant")}
                className="flex w-full flex-col text-left rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800">Restaurant Clasic</span>
                <span className="text-[10px] text-slate-400">Bar central, intrare, 12 mese grid</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Auto-seat button & strategy dropdown */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          disabled={assigning}
          onClick={() => setShowAutoSeatMenu(!showAutoSeatMenu)}
          className="gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm"
        >
          <Wand2 className="h-4 w-4 text-slate-500" />
          <span>Smart Auto-Așezare</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </Button>

        {showAutoSeatMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowAutoSeatMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl animate-in fade-in slide-in-from-top-1 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Alege Strategia
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setStrategy("family")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left border transition-all",
                    strategy === "family"
                      ? "border-primary/30 bg-primary/5 text-primary font-semibold"
                      : "border-transparent text-slate-650 hover:bg-slate-50"
                  )}
                >
                  <div className="flex flex-col">
                    <span>Prioritizează Familiile</span>
                    <span className="text-[9px] text-slate-400 font-normal">Nu separă cuplurile sau grupurile</span>
                  </div>
                  {strategy === "family" && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy("even")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left border transition-all",
                    strategy === "even"
                      ? "border-primary/30 bg-primary/5 text-primary font-semibold"
                      : "border-transparent text-slate-650 hover:bg-slate-50"
                  )}
                >
                  <div className="flex flex-col">
                    <span>Distribuie Egal</span>
                    <span className="text-[9px] text-slate-400 font-normal">Repartizare uniformă pe locuri</span>
                  </div>
                  {strategy === "even" && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              </div>

              <Button
                size="sm"
                className="w-full rounded-xl text-xs h-8.5 font-semibold gap-1.5"
                onClick={handleAutoAssign}
              >
                <Sparkles className="h-3.5 w-3.5" />
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
          className="gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>{ro.seating.toolbar.export}</span>
        </Button>

        {showExportMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border/60 bg-white/95 p-1 shadow-lg backdrop-blur-md">
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
      <Button size="sm" onClick={onAddTable} className="gap-2 rounded-xl h-9 text-xs font-semibold">
        <Plus className="h-4 w-4" />
        Adaugă Element
      </Button>
    </div>
  );
}
