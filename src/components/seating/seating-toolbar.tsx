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
  ChevronDown,
  X
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
  onAddTable: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  printSort: "alpha" | "table";
  onTogglePrintSort: () => void;
  globalLock: boolean;
  onToggleGlobalLock: () => void;
  onRunAutoSeat?: (strategy: "family" | "even") => Promise<void>;
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
}: SeatingToolbarProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showAutoSeatMenu, setShowAutoSeatMenu] = useState(false);
  const [strategy, setStrategy] = useState<"family" | "even">("family");
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({
    ballroom: 8,
    barn: 8,
    garden: 8,
    restaurant: 8,
    long_hall: 8,
  });

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

  async function handleApplyTemplate(
    type: "ballroom" | "barn" | "garden" | "restaurant" | "long_hall",
    count: number
  ) {
    if (!confirm("Sigur doriți să ștergeți așezarea curentă și să aplicați acest șablon? Toți invitații vor fi nerepartizați.")) {
      return;
    }
    setApplyingTemplate(true);
    setShowTemplateMenu(false);
    const result = await applyRoomTemplate(eventId, type, count);
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

      {/* Room Templates Button */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          disabled={applyingTemplate}
          onClick={() => setShowTemplateMenu(true)}
          className="gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm"
        >
          <Layout className="h-4 w-4 text-slate-500" />
          <span>Șabloane Sală</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </Button>

        {showTemplateMenu && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
            <div
              className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 max-w-4xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-6 pr-8">
                <h3 className="font-serif text-lg font-bold text-slate-800">
                  Alege Șablonul Sălii
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pornește cu o așezare optimizată pentru nunta ta. Poți rearanja și muta liber orice element ulterior.
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowTemplateMenu(false)}
                className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Template cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1 pb-2">
                {([
                  {
                    id: "ballroom",
                    title: "Ballroom Clasic",
                    desc: "Mese rotunde dispuse concentric în jurul unui ring de dans central circular.",
                    previewType: "ballroom"
                  },
                  {
                    id: "barn",
                    title: "Hambar Rustic",
                    desc: "Design cald cu mese lungi de banquet aliniate în coloane simetrice pe lateral.",
                    previewType: "barn"
                  },
                  {
                    id: "garden",
                    title: "Grădină Aer Liber",
                    desc: "Mese rotunde aerisite, distanțate lejer pe gazon, ferite de zona de dans.",
                    previewType: "garden"
                  },
                  {
                    id: "restaurant",
                    title: "Restaurant Clasic",
                    desc: "Configurație organizată tip grid cu mese pătrate și rectangulare combinate.",
                    previewType: "restaurant"
                  },
                  {
                    id: "long_hall",
                    title: "Salon Lung",
                    desc: "Două rânduri masive paralele de mese lungi pe lungimea sălii.",
                    previewType: "long_hall"
                  }
                ] as const).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex flex-col rounded-2xl border border-slate-150 bg-white p-3 hover:border-primary/30 transition-all hover:shadow-sm"
                  >
                    {/* Abstract Mini Preview */}
                    <div className={cn(
                       "w-full h-24 rounded-xl border border-slate-100 relative overflow-hidden flex items-center justify-center mb-3 bg-slate-50",
                      tpl.previewType === "garden" && "bg-emerald-50/20"
                    )}>
                      {/* Sweetheart table (top center) */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-amber-400 shadow-xs" />
                      
                      {/* Dance Floor */}
                      <div className={cn(
                        "w-9 h-7 border border-dashed flex items-center justify-center",
                        tpl.previewType === "ballroom" || tpl.previewType === "garden" ? "rounded-full" : "rounded-sm",
                        "border-pink-300 bg-pink-50/20 text-[7px] text-pink-400 font-semibold"
                      )}>
                        D
                      </div>

                      {/* Relative Tables representation */}
                      {tpl.previewType === "ballroom" && (
                        <>
                          <div className="absolute top-5 left-10 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute top-12 left-6 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute bottom-5 left-10 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute top-5 right-10 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute top-12 right-6 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute bottom-5 right-10 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300" />
                        </>
                      )}
                      
                      {tpl.previewType === "barn" && (
                        <>
                          <div className="absolute top-5 left-4 w-3.5 h-1.5 rounded-xs bg-slate-300" />
                          <div className="absolute top-10 left-4 w-3.5 h-1.5 rounded-xs bg-slate-300" />
                          <div className="absolute bottom-5 left-4 w-3.5 h-1.5 rounded-xs bg-slate-300" />
                          <div className="absolute top-5 right-4 w-3.5 h-1.5 rounded-xs bg-slate-300" />
                          <div className="absolute top-10 right-4 w-3.5 h-1.5 rounded-xs bg-slate-300" />
                          <div className="absolute bottom-5 right-4 w-3.5 h-1.5 rounded-xs bg-slate-300" />
                        </>
                      )}

                      {tpl.previewType === "garden" && (
                        <>
                          <div className="absolute top-4 left-6 w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <div className="absolute top-14 left-4 w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <div className="absolute bottom-3 left-10 w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <div className="absolute top-4 right-6 w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <div className="absolute top-14 right-4 w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <div className="absolute bottom-3 right-10 w-2.5 h-2.5 rounded-full bg-slate-300" />
                        </>
                      )}

                      {tpl.previewType === "restaurant" && (
                        <>
                          <div className="absolute top-4 left-6 w-2 h-2 rounded-sm bg-slate-300" />
                          <div className="absolute top-12 left-4 w-3.5 h-2 rounded-sm bg-slate-300" />
                          <div className="absolute bottom-4 left-8 w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <div className="absolute top-4 right-6 w-2 h-2 rounded-sm bg-slate-300" />
                          <div className="absolute top-12 right-4 w-3.5 h-2 rounded-sm bg-slate-300" />
                          <div className="absolute bottom-4 right-8 w-2.5 h-2.5 rounded-full bg-slate-300" />
                        </>
                      )}

                      {tpl.previewType === "long_hall" && (
                        <>
                          <div className="absolute top-4 left-8 w-2 h-14 rounded-xs bg-slate-300" />
                          <div className="absolute top-4 right-8 w-2 h-14 rounded-xs bg-slate-300" />
                        </>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {tpl.title}
                        </span>
                        <p className="text-[10px] text-muted-foreground leading-normal mt-0.5 mb-3.5 min-h-[30px]">
                          {tpl.desc}
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {/* Table count picker */}
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                          {[8, 12, 20].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedCounts((prev: Record<string, number>) => ({ ...prev, [tpl.id]: c }))}
                              className={cn(
                                "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                                selectedCounts[tpl.id] === c
                                  ? "bg-white text-slate-800 shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              )}
                            >
                              {c} Mese
                            </button>
                          ))}
                        </div>

                        {/* Apply CTA */}
                        <Button
                          type="button"
                          className="w-full rounded-xl text-xs h-8.5 font-semibold"
                          onClick={() => handleApplyTemplate(tpl.id, selectedCounts[tpl.id])}
                        >
                          Aplica Șablon ({selectedCounts[tpl.id]} mese)
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
