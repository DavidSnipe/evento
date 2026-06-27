"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  TemplateWizardConfig,
  TemplateWizardSpacing,
  TemplateWizardTemplate,
} from "@/lib/seating/template-generator";

export type {
  TemplateWizardConfig,
  TemplateWizardSpacing,
  TemplateWizardTemplate,
} from "@/lib/seating/template-generator";

const TEMPLATE_LABELS: Record<TemplateWizardTemplate, string> = {
  ring_round: "Ring rotund",
  ring_square: "Ring pătrat",
  banquet: "Banchet clasic",
};

const SPACING_OPTIONS: {
  value: TemplateWizardSpacing;
  label: string;
  multiplier: number;
}[] = [
  { value: "compact", label: "Compact", multiplier: 1.0 },
  { value: "normal", label: "Normal", multiplier: 1.3 },
  { value: "airy", label: "Aerisit", multiplier: 1.6 },
];

type WizardStep = "choose" | "configure" | "loading";

type TemplateWizardProps = {
  open: boolean;
  totalConfirmedGuests: number;
  onSkip: () => void;
  onComplete: (config: TemplateWizardConfig) => Promise<void>;
};

function RingRoundPreview() {
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <circle cx="60" cy="45" r="14" fill="#eedfe3" />
      <rect x="45" y="8" width="30" height="8" rx="2" fill="#dcb5be" />
      <rect x="45" y="74" width="30" height="8" rx="2" fill="#dcb5be" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 60 + Math.cos(rad) * 28;
        const cy = 45 + Math.sin(rad) * 28;
        return (
          <circle
            key={deg}
            cx={cx}
            cy={cy}
            r="5"
            fill="white"
            stroke="#dcb5be"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

function RingSquarePreview() {
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <rect x="46" y="31" width="28" height="28" rx="3" fill="#eedfe3" />
      <rect x="30" y="8" width="60" height="7" rx="2" fill="#dcb5be" />
      <rect x="46" y="75" width="28" height="7" rx="2" fill="#dcb5be" />
      {[22, 37, 52].map((y) => (
        <rect key={`left-${y}`} x="8" y={y} width="18" height="10" rx="1.5" fill="white" stroke="#dcb5be" strokeWidth="1.5" />
      ))}
      {[22, 37, 52].map((y) => (
        <rect key={`right-${y}`} x="94" y={y} width="18" height="10" rx="1.5" fill="white" stroke="#dcb5be" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function BanquetPreview() {
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <rect x="35" y="8" width="50" height="7" rx="2" fill="#dcb5be" />
      <rect x="45" y="20" width="30" height="7" rx="2" fill="#dcb5be" />
      {[32, 42, 52, 62, 72].map((y) => (
        <rect
          key={y}
          x="10"
          y={y}
          width="100"
          height="8"
          rx="1.5"
          fill="white"
          stroke="#dcb5be"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

function FreestylePreview() {
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <circle cx="24" cy="22" r="7" fill="white" stroke="#dcb5be" strokeWidth="1.5" />
      <circle cx="88" cy="18" r="5" fill="white" stroke="#89a293" strokeWidth="1.5" />
      <rect x="52" y="12" width="16" height="10" rx="2" fill="white" stroke="#dcb5be" strokeWidth="1.5" transform="rotate(8 60 17)" />
      <rect x="14" y="48" width="22" height="8" rx="1.5" fill="white" stroke="#dcb5be" strokeWidth="1.5" transform="rotate(-12 25 52)" />
      <circle cx="72" cy="58" r="6" fill="white" stroke="#dcb5be" strokeWidth="1.5" />
      <rect x="82" y="62" width="18" height="12" rx="2" fill="white" stroke="#89a293" strokeWidth="1.5" />
      <circle cx="38" cy="72" r="4" fill="white" stroke="#dcb5be" strokeWidth="1.5" />
      <rect x="58" y="68" width="14" height="14" rx="2" fill="#eedfe3" stroke="#dcb5be" strokeWidth="1.5" transform="rotate(15 65 75)" />
    </svg>
  );
}

type TemplateCardProps = {
  title: string;
  description: string;
  preview: React.ReactNode;
  onClick: () => void;
  variant?: "template" | "freestyle";
};

function TemplateCard({ title, description, preview, onClick, variant = "template" }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col rounded-xl border bg-white p-4 text-left transition-all",
        "hover:border-[#B8516B]/45 hover:shadow-md hover:-translate-y-0.5",
        variant === "freestyle"
          ? "border-dashed border-[rgba(210,170,185,0.45)]"
          : "border-[rgba(210,170,185,0.28)]"
      )}
    >
      <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-[#faf8f7] p-2">
        {preview}
      </div>
      <h3 className="text-sm font-semibold text-[#1A0E14] group-hover:text-[#B8516B]">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#8A7080]">{description}</p>
    </button>
  );
}

export function TemplateWizard({ open, totalConfirmedGuests, onSkip, onComplete }: TemplateWizardProps) {
  const [step, setStep] = useState<WizardStep>("choose");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWizardTemplate | null>(null);
  const [guestsPerTable, setGuestsPerTable] = useState(8);
  const [spacing, setSpacing] = useState<TemplateWizardSpacing>("normal");
  const [generating, setGenerating] = useState(false);

  const resetWizard = useCallback(() => {
    setStep("choose");
    setSelectedTemplate(null);
    setGuestsPerTable(8);
    setSpacing("normal");
    setGenerating(false);
  }, []);

  useEffect(() => {
    if (open) {
      resetWizard();
    }
  }, [open, resetWizard]);

  if (!open) return null;

  const calculatedTables =
    guestsPerTable > 0 ? Math.ceil(totalConfirmedGuests / guestsPerTable) : 0;

  const handleGenerate = async () => {
    if (!selectedTemplate || generating) return;
    setStep("loading");
    setGenerating(true);
    try {
      await onComplete({
        template: selectedTemplate,
        guestsPerTable,
        spacing,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="seating-template-wizard absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#f5f4f3]/95 backdrop-blur-sm print:hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-wizard-title"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg md:p-8">
        {step !== "loading" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="absolute right-4 top-4 text-xs text-[#8A7080] hover:text-[#1A0E14]"
          >
            Sari peste, începe liber
          </Button>
        ) : null}

        {step === "choose" ? (
          <div className="space-y-6 pt-2">
            <div className="space-y-1.5 pr-28">
              <h2 id="template-wizard-title" className="font-serif text-2xl font-bold text-[#1A0E14]">
                Cum vrei să aranjezi sala?
              </h2>
              <p className="text-sm text-[#8A7080]">Alege un template de pornire sau începe liber.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TemplateCard
                title="Ring rotund"
                description="Mese în cerc în jurul ringului de dans"
                preview={<RingRoundPreview />}
                onClick={() => {
                  setSelectedTemplate("ring_round");
                  setStep("configure");
                }}
              />
              <TemplateCard
                title="Ring pătrat"
                description="Aranjament clasic cu mese dreptunghiulare"
                preview={<RingSquarePreview />}
                onClick={() => {
                  setSelectedTemplate("ring_square");
                  setStep("configure");
                }}
              />
              <TemplateCard
                title="Banchet clasic"
                description="Mese lungi în stil tradițional"
                preview={<BanquetPreview />}
                onClick={() => {
                  setSelectedTemplate("banquet");
                  setStep("configure");
                }}
              />
              <TemplateCard
                title="Freestyle"
                description="Începe cu un canvas gol"
                preview={<FreestylePreview />}
                variant="freestyle"
                onClick={onSkip}
              />
            </div>
          </div>
        ) : null}

        {step === "configure" && selectedTemplate ? (
          <div className="space-y-6 pt-2">
            <div className="space-y-1.5">
              <h2 id="template-wizard-title" className="font-serif text-2xl font-bold text-[#1A0E14]">
                Configurează {TEMPLATE_LABELS[selectedTemplate]}
              </h2>
            </div>

            <div className="space-y-4 rounded-xl border border-[rgba(210,170,185,0.22)] bg-[#faf8f7] p-4">
              <div className="space-y-2">
                <label htmlFor="guests-per-table" className="text-xs font-semibold text-[#1A0E14]">
                  Invitați per masă
                </label>
                <Input
                  id="guests-per-table"
                  type="number"
                  min={4}
                  max={20}
                  step={1}
                  value={guestsPerTable}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    if (Number.isNaN(raw)) return;
                    setGuestsPerTable(Math.min(20, Math.max(4, raw)));
                  }}
                  className="h-10 max-w-[120px] rounded-lg font-semibold"
                />
                <p className="text-xs leading-relaxed text-[#5A4550]">
                  Ai {totalConfirmedGuests} invitați confirmați → {calculatedTables} mese de câte{" "}
                  {guestsPerTable} persoane
                </p>
                <p className="text-[11px] text-[#8A7080]">
                  Masa mirilor și scena sunt adăugate separat, nu sunt incluse în calcul.
                </p>
              </div>

              {selectedTemplate === "ring_round" ? (
                <div className="space-y-2 border-t border-[rgba(210,170,185,0.18)] pt-4">
                  <span className="text-xs font-semibold text-[#1A0E14]">Spațiu între mese</span>
                  <div className="flex gap-1.5">
                    {SPACING_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSpacing(option.value)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                          spacing === option.value
                            ? "border-[#B8516B] bg-[#FEF0F3] text-[#B8516B]"
                            : "border-[rgba(210,170,185,0.28)] bg-white text-[#5A4550] hover:border-[#B8516B]/35"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("choose")}
                className="rounded-xl"
              >
                Înapoi
              </Button>
              <Button
                type="button"
                disabled={generating}
                onClick={() => void handleGenerate()}
                className="rounded-xl bg-[#B8516B] font-semibold text-white hover:bg-[#9A4560]"
              >
                Generează layout
              </Button>
            </div>
          </div>
        ) : null}

        {step === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#B8516B]" />
            <p className="text-sm font-medium text-[#5A4550]">Se generează layout-ul...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function getTemplateWizardDismissedKey(eventId: string): string {
  return `seating-template-wizard-dismissed-${eventId}`;
}

export function isTemplateWizardDismissed(eventId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(getTemplateWizardDismissedKey(eventId)) === "1";
  } catch {
    return false;
  }
}

export function markTemplateWizardDismissed(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getTemplateWizardDismissedKey(eventId), "1");
  } catch {
    /* ignore storage errors */
  }
}
