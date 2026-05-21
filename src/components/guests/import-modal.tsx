"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Upload, FileText, Camera, Sparkles, Check, Users, Heart, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { parseGuestText, type ParsedGuest } from "@/lib/guests/smart-parser";
import { bulkCreateGuests } from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";
import { TagBadge } from "@/components/guests/tag-badge";

type ImportModalProps = {
  eventId: string;
  onClose: () => void;
};

type Tab = "paste" | "csv" | "photo";

const TYPE_ICONS = {
  single: UserPlus,
  couple: Heart,
  family: Users,
  group: Users,
};

const TYPE_LABELS = {
  single: "Individual",
  couple: "Cuplu",
  family: "Familie",
  group: "Grup",
};

export function ImportModal({ eventId, onClose }: ImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedGuest[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleParse = () => {
    const results = parseGuestText(text);
    setParsed(results);
    setShowPreview(true);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await bulkCreateGuests(
        eventId,
        parsed.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName || undefined,
          plusOneName: p.plusOneName || undefined,
          groupName: p.groupName || undefined,
          tags: p.tags,
        }))
      );
      if (result.count) {
        setSuccess(result.count);
        setTimeout(handleClose, 1500);
      }
    });
  };

  const removeParsed = (id: string) => {
    setParsed((prev) => prev.filter((p) => p.id !== id));
  };

  const totalCount = parsed.reduce((sum, p) => sum + p.count, 0);

  const content = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ zIndex: 9998 }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl md:max-h-[85vh] flex flex-col rounded-3xl bg-white shadow-2xl transition-all duration-300",
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={{ zIndex: 9999 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="font-serif text-xl font-semibold">Importă invitați</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Adaugă rapid mai mulți invitați deodată
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success state */}
        {success !== null ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="mt-4 font-serif text-lg font-semibold">
              {success} invitați adăugați cu succes!
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-6">
              {([
                { key: "paste" as Tab, label: "Lipește text", icon: FileText },
                { key: "csv" as Tab, label: "CSV / Excel", icon: Upload },
                { key: "photo" as Tab, label: "Fotografie", icon: Camera },
              ]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setTab(t.key); setShowPreview(false); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                    tab === t.key
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {tab === "paste" && !showPreview && (
                <div className="space-y-4">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={"Lipește lista de invitați aici...\n\nExemple:\nMaria + Andrei\nFamilia Popescu - 4 persoane\nNași - 2 persoane\nIon Ionescu"}
                    rows={10}
                    className="w-full rounded-2xl border border-border/40 bg-muted/20 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 resize-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleParse}
                    disabled={!text.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Detectare inteligentă
                  </button>
                </div>
              )}

              {tab === "paste" && showPreview && (
                <div className="space-y-4">
                  {parsed.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Nu am detectat invitați. Verifică textul și încearcă din nou.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {parsed.length} intrări · {totalCount} persoane detectate
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPreview(false)}
                          className="text-xs text-primary hover:underline"
                        >
                          ← Editează textul
                        </button>
                      </div>

                      <div className="space-y-2">
                        {parsed.map((p) => {
                          const Icon = TYPE_ICONS[p.type];
                          return (
                            <div
                              key={p.id}
                              className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5 transition-all hover:bg-muted/50"
                            >
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full",
                                p.type === "couple" ? "bg-rose-100 text-rose-600" :
                                p.type === "family" ? "bg-amber-100 text-amber-600" :
                                p.type === "group" ? "bg-indigo-100 text-indigo-600" :
                                "bg-sky-100 text-sky-600"
                              )}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {p.firstName} {p.lastName}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span>{TYPE_LABELS[p.type]}</span>
                                  {p.count > 1 && <span>· {p.count} pers.</span>}
                                  {p.plusOneName && <span>· {p.plusOneName}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {p.tags.slice(0, 2).map((tag) => (
                                  <TagBadge key={tag} tag={tag} />
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeParsed(p.id)}
                                className="rounded-lg p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === "csv" && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 py-16 text-center">
                  <Upload className="mb-4 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">
                    Trage fișierul aici sau apasă pentru a alege
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formate: .csv, .xlsx, .xls
                  </p>
                  <p className="mt-4 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                    Disponibil în curând
                  </p>
                </div>
              )}

              {tab === "photo" && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 py-16 text-center">
                  <Camera className="mb-4 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">
                    Încarcă o fotografie cu lista de invitați
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vom detecta automat numele din imagine
                  </p>
                  <p className="mt-4 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                    Disponibil în curând
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {tab === "paste" && showPreview && parsed.length > 0 && (
              <div className="border-t border-border/30 px-6 py-4">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="animate-pulse">Se adaugă...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Adaugă {parsed.length} invitați ({totalCount} persoane)
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
