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
  X,
  Maximize2,
  Minimize2
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
  
  // Immersive focus mode and lifted template props
  showTemplateMenu: boolean;
  onToggleTemplateMenu: (show: boolean) => void;
  workspaceMode: boolean;
  onToggleWorkspaceMode: () => void;
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
  
  showTemplateMenu,
  onToggleTemplateMenu,
  workspaceMode,
  onToggleWorkspaceMode,
}: SeatingToolbarProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAutoSeatMenu, setShowAutoSeatMenu] = useState(false);
  const [strategy, setStrategy] = useState<"family" | "even">("family");
  
  // Selected tables count for each layout template
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({
    ballroom: 8,
    barn: 8,
    garden: 8,
    restaurant: 8,
    long_hall: 8,
  });

  // Selected Vibe filter for Templates Browser
  const [selectedVibe, setSelectedVibe] = useState<"all" | "elegant" | "rustic" | "modern">("all");

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
    onToggleTemplateMenu(false);
    const result = await applyRoomTemplate(eventId, type, count);
    setApplyingTemplate(false);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "A apărut o eroare la aplicarea șablonului.");
    }
  }

  const templates = [
    {
      id: "ballroom",
      title: "Ballroom Clasic",
      desc: "Mese rotunde dispuse concentric în jurul unui ring de dans central circular. Ideal pentru nunți clasice, elegante.",
      previewType: "ballroom",
      vibe: "elegant",
      features: ["Masa Mirilor (Secționată)", "Ring de Dans Central", "Mese Rotunde Consecutive"]
    },
    {
      id: "barn",
      title: "Hambar Rustic",
      desc: "Design cald cu mese lungi de banquet aliniate în coloane simetrice pe lateral. Ideal pentru nunți retro, rustice sau în hambar.",
      previewType: "barn",
      vibe: "rustic",
      features: ["Masa Mirilor în Centru", "Coloane Paralele Symmetrice", "Mese Rectangulare Lungi"]
    },
    {
      id: "garden",
      title: "Grădină Aer Liber",
      desc: "Mese rotunde aerisite, distanțate lejer pe gazon, ferite de zona de dans. Perfect pentru petreceri în aer liber sau cort.",
      previewType: "garden",
      vibe: "rustic",
      features: ["Mese Rotunde Distanțate", "Ring de Dans Rotund", "Aranjament Aerisit & Fluid"]
    },
    {
      id: "restaurant",
      title: "Restaurant Clasic",
      desc: "Configurație organizată tip grid cu mese pătrate și rectangulare combinate. Perfect pentru saloane clasice de restaurant.",
      previewType: "restaurant",
      vibe: "elegant",
      features: ["Mese Pătrate & Rectangulare", "Optimizare Spațiu Tip Grid", "Configurație Compactă"]
    },
    {
      id: "long_hall",
      title: "Salon Lung",
      desc: "Două rânduri masive paralele de mese lungi pe lungimea sălii, ideale pentru spații lungi și înguste sau corturi liniare.",
      previewType: "long_hall",
      vibe: "modern",
      features: ["Mese Lungi Tip Banquet", "Două Culoare de Trecere", "Ring de Dans Alungit"]
    }
  ] as const;

  const filteredTemplates = templates.filter(
    (t) => selectedVibe === "all" || t.vibe === selectedVibe
  );

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

        {/* Workspace Focus Mode Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleWorkspaceMode}
          className={cn(
            "gap-2 rounded-xl h-9 text-xs font-semibold border-slate-200/80 shadow-sm transition-all duration-200",
            workspaceMode
              ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
              : "hover:bg-slate-50 text-slate-700"
          )}
          title={workspaceMode ? "Ieși din Modul Focus" : "Intră în Modul Focus"}
        >
          {workspaceMode ? (
            <>
              <Minimize2 className="h-4 w-4 text-primary animate-pulse" />
              <span>Mod Normal</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 text-slate-500" />
              <span>Mod Focus</span>
            </>
          )}
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

      {/* ── Immersive Full-Page Templates Browser ──────────────── */}
      {showTemplateMenu && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-300 h-screen w-screen p-6 md:p-12 select-none"
          onClick={() => onToggleTemplateMenu(false)}
        >
          {/* Main Container */}
          <div
            className="mx-auto max-w-6xl w-full flex flex-col h-full relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-serif text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                  Design-ul Sălii de Evenimente
                </h3>
                <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  Selectează un stil care se potrivește cu tematica nunții tale. Fiecare șablon include elemente de bază implicite (ring de dans, scenă, DJ booth, masa mirilor) și un set de mese gata aranjate pe care le poți personaliza ulterior.
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => onToggleTemplateMenu(false)}
                className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors shrink-0 shadow-xs bg-white/50 border border-slate-100"
                title="Închide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Vibe filter tabs */}
            <div className="flex gap-1.5 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200/60 w-fit">
              {([
                { id: "all", label: "Toate stilurile" },
                { id: "elegant", label: "Elegant & Clasic" },
                { id: "rustic", label: "Rustic & Bohemian" },
                { id: "modern", label: "Modern & Minimalist" }
              ] as const).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVibe(v.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200",
                    selectedVibe === v.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-550 hover:text-slate-800"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Filtered Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1 pb-6 flex-1 max-h-[calc(100vh-14rem)]">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex flex-col rounded-3xl border border-slate-200/60 bg-white p-5 hover:border-primary/45 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
                >
                  {/* Abstract Mini Preview with animations */}
                  <div className={cn(
                     "w-full h-36 rounded-2xl border border-slate-100 relative overflow-hidden flex items-center justify-center mb-4 bg-slate-50 transition-all duration-500 group-hover:bg-slate-50/50",
                    tpl.previewType === "garden" && "bg-emerald-50/10"
                  )}>
                    {/* Sweetheart table (top center) */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-amber-400 shadow-xs" />
                    
                    {/* Dance Floor */}
                    <div className={cn(
                      "w-11 h-9 border border-dashed flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                      tpl.previewType === "ballroom" || tpl.previewType === "garden" ? "rounded-full" : "rounded-sm",
                      "border-pink-300 bg-pink-50/20 text-[8px] text-pink-400 font-semibold"
                    )}>
                      Dans
                    </div>

                    {/* Relative Tables representations */}
                    {tpl.previewType === "ballroom" && (
                      <>
                        <div className="absolute top-5 left-16 w-2 h-2 rounded-full bg-slate-350" />
                        <div className="absolute top-16 left-12 w-2 h-2 rounded-full bg-slate-350" />
                        <div className="absolute bottom-6 left-16 w-2 h-2 rounded-full bg-slate-350" />
                        <div className="absolute top-5 right-16 w-2 h-2 rounded-full bg-slate-350" />
                        <div className="absolute top-16 right-12 w-2 h-2 rounded-full bg-slate-350" />
                        <div className="absolute bottom-6 right-16 w-2 h-2 rounded-full bg-slate-350" />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-350" />
                      </>
                    )}
                    
                    {tpl.previewType === "barn" && (
                      <>
                        <div className="absolute top-6 left-6 w-5 h-2 rounded-xs bg-slate-350" />
                        <div className="absolute top-16 left-6 w-5 h-2 rounded-xs bg-slate-350" />
                        <div className="absolute bottom-6 left-6 w-5 h-2 rounded-xs bg-slate-350" />
                        <div className="absolute top-6 right-6 w-5 h-2 rounded-xs bg-slate-350" />
                        <div className="absolute top-16 right-6 w-5 h-2 rounded-xs bg-slate-350" />
                        <div className="absolute bottom-6 right-6 w-5 h-2 rounded-xs bg-slate-350" />
                      </>
                    )}

                    {tpl.previewType === "garden" && (
                      <>
                        <div className="absolute top-5 left-10 w-3.5 h-3.5 rounded-full bg-slate-350" />
                        <div className="absolute top-20 left-8 w-3.5 h-3.5 rounded-full bg-slate-350" />
                        <div className="absolute bottom-5 left-14 w-3.5 h-3.5 rounded-full bg-slate-350" />
                        <div className="absolute top-5 right-10 w-3.5 h-3.5 rounded-full bg-slate-350" />
                        <div className="absolute top-20 right-8 w-3.5 h-3.5 rounded-full bg-slate-350" />
                        <div className="absolute bottom-5 right-14 w-3.5 h-3.5 rounded-full bg-slate-350" />
                      </>
                    )}

                    {tpl.previewType === "restaurant" && (
                      <>
                        <div className="absolute top-5 left-10 w-2.5 h-2.5 rounded-sm bg-slate-350" />
                        <div className="absolute top-18 left-8 w-4 h-2.5 rounded-sm bg-slate-350" />
                        <div className="absolute bottom-5 left-12 w-3 h-3 rounded-full bg-slate-350" />
                        <div className="absolute top-5 right-10 w-2.5 h-2.5 rounded-sm bg-slate-350" />
                        <div className="absolute top-18 right-8 w-4 h-2.5 rounded-sm bg-slate-350" />
                        <div className="absolute bottom-5 right-12 w-3 h-3 rounded-full bg-slate-350" />
                      </>
                    )}

                    {tpl.previewType === "long_hall" && (
                      <>
                        <div className="absolute top-6 left-12 w-2 h-24 rounded-xs bg-slate-350" />
                        <div className="absolute top-6 right-12 w-2 h-24 rounded-xs bg-slate-350" />
                      </>
                    )}
                  </div>

                  {/* Template Meta Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">
                          {tpl.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 capitalize px-2 py-0.5 rounded-md bg-slate-100">
                          {tpl.vibe === "elegant" ? "Elegant" : tpl.vibe === "rustic" ? "Rustic" : "Modern"}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2 mb-4">
                        {tpl.desc}
                      </p>

                      {/* Dynamic Room Features Checklist */}
                      <div className="space-y-1.5 mb-5">
                        {tpl.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      {/* Table count picker */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Număr de mese
                        </label>
                        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                          {[8, 12, 20].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedCounts((prev: Record<string, number>) => ({ ...prev, [tpl.id]: c }))}
                              className={cn(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                selectedCounts[tpl.id] === c
                                  ? "bg-white text-slate-800 shadow-sm"
                                  : "text-slate-550 hover:text-slate-800"
                              )}
                            >
                              {c} Mese
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Apply CTA */}
                      <Button
                        type="button"
                        className="w-full rounded-xl text-xs h-9.5 font-bold bg-slate-900 text-white hover:bg-slate-850"
                        onClick={() => handleApplyTemplate(tpl.id, selectedCounts[tpl.id])}
                      >
                        Aplică Șablon ({selectedCounts[tpl.id]} mese)
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
  );
}
