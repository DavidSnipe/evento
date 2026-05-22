"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { X, Upload, FileText, Camera, Sparkles, Check, Users, Heart, UserPlus, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { parseGuestText, type ParsedGuest } from "@/lib/guests/smart-parser";
import { bulkCreateGuests } from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";
import { TagBadge } from "@/components/guests/tag-badge";
import type { GuestWithTable, RsvpStatus } from "@/types/guests";
import { GUEST_TAGS } from "@/types/guests";
import * as XLSX from "xlsx";

type ImportModalProps = {
  eventId: string;
  guests: GuestWithTable[];
  onClose: () => void;
  onImportSuccess?: (count: number, insertedIds: string[]) => void;
};

type Tab = "paste" | "csv" | "photo";

type CSVGuest = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  rsvpStatus: RsvpStatus;
  groupName: string | null;
  tags: string[];
};

type PhotoGuest = {
  id: string;
  name: string;
  confidence: number;
};

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

const MAPPING_FIELDS = [
  { key: "firstName", label: "Prenume / Nume Complet (Obligatoriu)" },
  { key: "lastName", label: "Nume de familie" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "Email" },
  { key: "rsvpStatus", label: "Status RSVP" },
  { key: "groupName", label: "Grup / Familie" },
  { key: "tags", label: "Tag-uri (separate prin virgulă)" },
];

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts.slice(1).join(" "), parts[0]];
}

export function ImportModal({ eventId, guests, onClose, onImportSuccess }: ImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  
  // Paste tab states
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedGuest[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  // CSV tab states
  const [csvStep, setCsvStep] = useState<"upload" | "map" | "preview">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawData, setCsvRawData] = useState<(string | number | boolean | null | undefined)[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, number>>({});
  const [csvParsed, setCsvParsed] = useState<CSVGuest[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Photo tab states
  const [photoStep, setPhotoStep] = useState<"upload" | "scanning" | "preview">("upload");
  const [photoImage, setPhotoImage] = useState<string | null>(null);
  const [photoGuests, setPhotoGuests] = useState<PhotoGuest[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  // --- Smart text parser ---
  const handleParse = () => {
    const results = parseGuestText(text);
    setParsed(results);
    setShowPreview(true);
  };

  const handleConfirmPaste = () => {
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
      if (result.count && result.insertedIds) {
        if (onImportSuccess) {
          onImportSuccess(result.count, result.insertedIds);
        } else {
          setSuccess(result.count);
          setTimeout(handleClose, 1500);
        }
      }
    });
  };

  const removeParsed = (id: string) => {
    setParsed((prev) => prev.filter((p) => p.id !== id));
  };

  const totalCount = parsed.reduce((sum, p) => sum + p.count, 0);

  // --- CSV / Excel parser ---
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCsvFile(file);
  };

  const processCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(ws, { header: 1 });
        
        if (data.length === 0) {
          alert("Fișierul selectat este gol.");
          return;
        }
        
        const fileHeaders = (data[0] as (string | number | boolean | null | undefined)[]).map((h, i) => h?.toString().trim() || `Coloana ${i + 1}`);
        setCsvHeaders(fileHeaders);
        setCsvRawData(data.slice(1) as (string | number | boolean | null | undefined)[][]);
        
        // Auto-mapping heuristics
        const mapping: Record<string, number> = {};
        fileHeaders.forEach((header, index) => {
          const hLower = header.toLowerCase();
          if (hLower.includes("prenume") || hLower === "first name" || hLower === "firstname") {
            mapping.firstName = index;
          } else if (hLower.includes("nume de familie") || hLower === "last name" || hLower === "lastname" || hLower === "nume") {
            if (hLower === "nume" && mapping.firstName === undefined) {
              mapping.firstName = index;
            } else {
              mapping.lastName = index;
            }
          } else if (hLower === "nume complet" || hLower === "fullname" || hLower === "nume si prenume" || hLower === "nume și prenume" || hLower === "name") {
            mapping.firstName = index;
          } else if (hLower.includes("telefon") || hLower === "phone" || hLower === "mobil" || hLower === "tel") {
            mapping.phone = index;
          } else if (hLower.includes("email") || hLower === "mail" || hLower === "e-mail") {
            mapping.email = index;
          } else if (hLower.includes("rsvp") || hLower.includes("status") || hLower.includes("confirmare")) {
            mapping.rsvpStatus = index;
          } else if (hLower.includes("grup") || hLower.includes("group") || hLower.includes("familie")) {
            mapping.groupName = index;
          } else if (hLower.includes("tag") || hLower.includes("etichet")) {
            mapping.tags = index;
          }
        });
        
        if (mapping.firstName === undefined && fileHeaders.length > 0) {
          mapping.firstName = 0;
        }
        
        setCsvMapping(mapping);
        setCsvStep("map");
      } catch (error) {
        console.error(error);
        alert("Eroare la citirea fișierului. Asigură-te că este un CSV sau Excel valid.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCsvMappingConfirm = () => {
    const items: CSVGuest[] = csvRawData
      .map((row, rowIndex) => {
        const getVal = (field: string) => {
          const colIdx = csvMapping[field];
          if (colIdx === undefined || colIdx === -1) return "";
          return row[colIdx]?.toString().trim() || "";
        };
        
        const firstNameVal = getVal("firstName");
        if (!firstNameVal) return null;
        
        let fName = firstNameVal;
        let lName = getVal("lastName") || null;
        
        // Split full name if last name is empty
        if (!lName && fName.includes(" ")) {
          const [first, last] = splitName(fName);
          fName = first;
          lName = last;
        }
        
        // RSVP normalization
        let rsvpVal: RsvpStatus = "pending";
        const rawRsvp = getVal("rsvpStatus").toLowerCase();
        if (rawRsvp.includes("confirm") || rawRsvp.includes("accept") || rawRsvp.includes("da") || rawRsvp === "yes" || rawRsvp.includes("prezent")) {
          rsvpVal = "accepted";
        } else if (rawRsvp.includes("refuz") || rawRsvp.includes("decline") || rawRsvp.includes("nu") || rawRsvp === "no" || rawRsvp.includes("absent")) {
          rsvpVal = "declined";
        } else if (rawRsvp.includes("poate") || rawRsvp.includes("maybe")) {
          rsvpVal = "maybe";
        }

        // Tags parsing
        const rawTags = getVal("tags");
        const tagsList = rawTags
          ? rawTags
              .split(",")
              .map((t: string) => t.trim().toLowerCase())
              .filter((t: string) => GUEST_TAGS.some((gt) => gt.value === t))
          : [];
        
        return {
          id: `csv-${rowIndex}-${Date.now()}`,
          firstName: fName,
          lastName: lName,
          phone: getVal("phone") || null,
          email: getVal("email") || null,
          rsvpStatus: rsvpVal,
          groupName: getVal("groupName") || null,
          tags: tagsList,
        };
      })
      .filter(Boolean) as CSVGuest[];

    setCsvParsed(items);
    setCsvStep("preview");
  };

  const removeCsvRow = (id: string) => {
    setCsvParsed((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConfirmCsv = () => {
    startTransition(async () => {
      const result = await bulkCreateGuests(
        eventId,
        csvParsed.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName || undefined,
          phone: p.phone || undefined,
          email: p.email || undefined,
          rsvpStatus: p.rsvpStatus,
          groupName: p.groupName || undefined,
          tags: p.tags,
        }))
      );
      if (result.count && result.insertedIds) {
        if (onImportSuccess) {
          onImportSuccess(result.count, result.insertedIds);
        } else {
          setSuccess(result.count);
          setTimeout(handleClose, 1500);
        }
      }
    });
  };

  // --- Photo OCR AI Simulation ---
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoImage(evt.target?.result as string);
      setPhotoStep("scanning");
      
      // Simulate scanning scan-line animation & OCR delays
      setTimeout(() => {
        setPhotoGuests([
          { id: "ocr-1", name: "Popescu Andrei & Maria", confidence: 94 },
          { id: "ocr-2", name: "Dumitrescu Dan", confidence: 91 },
          { id: "ocr-3", name: "Radu M.", confidence: 62 }, // low confidence
          { id: "ocr-4", name: "Vasilescu G.", confidence: 58 }, // low confidence
          { id: "ocr-5", name: "Ionescu Elena", confidence: 89 },
        ]);
        setPhotoStep("preview");
      }, 2800);
    };
    reader.readAsDataURL(file);
  };

  const updatePhotoGuestName = (id: string, name: string) => {
    setPhotoGuests((prev) =>
      prev.map((pg) => (pg.id === id ? { ...pg, name } : pg))
    );
  };

  const removePhotoRow = (id: string) => {
    setPhotoGuests((prev) => prev.filter((pg) => pg.id !== id));
  };

  const handleConfirmPhoto = () => {
    startTransition(async () => {
      const guestsToInsert = photoGuests.map((pg) => {
        let fName = pg.name;
        let lName = "";
        let plusOneName = "";
        
        const isCouple = /\s[+&și]+\s/i.test(pg.name);
        if (isCouple) {
          const parts = pg.name.split(/\s*(?:[+&]|și|si)\s*/i).filter(Boolean);
          if (parts.length === 2) {
            const [a, b] = parts.map((p) => p.trim());
            const [aFirst, aLast] = splitName(a);
            const [bFirst, bLast] = splitName(b);
            fName = aFirst;
            lName = aLast || bLast;
            plusOneName = `${bFirst}${bLast ? ` ${bLast}` : aLast ? ` ${aLast}` : ""}`;
          }
        } else {
          const [first, last] = splitName(pg.name);
          fName = first;
          lName = last;
        }
        
        return {
          firstName: fName,
          lastName: lName || undefined,
          plusOneName: plusOneName || undefined,
          rsvpStatus: "pending" as const,
        };
      });

      const result = await bulkCreateGuests(eventId, guestsToInsert);
      if (result.count && result.insertedIds) {
        if (onImportSuccess) {
          onImportSuccess(result.count, result.insertedIds);
        } else {
          setSuccess(result.count);
          setTimeout(handleClose, 1500);
        }
      }
    });
  };

  // --- Duplicate Detection Helper ---
  const checkDuplicate = (firstName: string, lastName: string | null, email: string | null, phone: string | null) => {
    if (!guests) return null;
    const cleanPhone = phone?.trim().replace(/\D/g, "");
    
    for (const g of guests) {
      const dbFullName = `${g.first_name} ${g.last_name ?? ""}`.trim().toLowerCase();
      const csvFullName = `${firstName} ${lastName ?? ""}`.trim().toLowerCase();
      if (dbFullName === csvFullName && csvFullName.length > 2) {
        return "Nume identic în baza de date";
      }
      if (email && g.email && email.trim().toLowerCase() === g.email.trim().toLowerCase()) {
        return "Email identic în baza de date";
      }
      if (cleanPhone && g.phone) {
        const dbPhoneClean = g.phone.trim().replace(/\D/g, "");
        if (dbPhoneClean === cleanPhone) {
          return "Telefon identic în baza de date";
        }
      }
    }
    return null;
  };

  const content = (
    <>
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
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
          "fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[85vh] flex flex-col rounded-3xl bg-white shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 animate-bounce">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="mt-4 font-serif text-lg font-semibold">
              {success} invitați adăugați cu succes!
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-6 border-b border-border/10 pb-3 shrink-0">
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
                    "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-95",
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
              {/* --- TAB 1: Paste Text --- */}
              {tab === "paste" && !showPreview && (
                <div className="space-y-4 animate-fade-in">
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
                <div className="space-y-4 animate-fade-in">
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

              {/* --- TAB 2: CSV / Excel --- */}
              {tab === "csv" && csvStep === "upload" && (
                <div
                  onClick={() => csvInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 py-16 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 group animate-fade-in"
                >
                  <input
                    type="file"
                    ref={csvInputRef}
                    onChange={handleCsvFileChange}
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                  />
                  <Upload className="mb-4 h-10 w-10 text-muted-foreground/40 transition-transform group-hover:-translate-y-1 duration-200" />
                  <p className="text-sm font-medium text-foreground">
                    Trage fișierul aici sau apasă pentru a alege
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formate suportate: .csv, .xlsx, .xls
                  </p>
                </div>
              )}

              {tab === "csv" && csvStep === "map" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                    <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Potrivește coloanele din tabel
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Am detectat {csvHeaders.length} coloane în fișier. Asociază-le cu câmpurile noastre din baza de date pentru a finaliza importul.
                    </p>
                  </div>

                  <div className="space-y-3 divide-y divide-border/10">
                    {MAPPING_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center justify-between py-2 gap-4">
                        <label className="text-xs font-semibold text-muted-foreground w-1/3 shrink-0">
                          {field.label}
                        </label>
                        <select
                          value={csvMapping[field.key] ?? -1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCsvMapping((prev) => ({ ...prev, [field.key]: val }));
                          }}
                          className="h-9 flex-1 max-w-[240px] rounded-xl border border-border/40 bg-muted/20 px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value={-1}>Ignoră / Nu există</option>
                          {csvHeaders.map((header, idx) => (
                            <option key={idx} value={idx}>
                              {header} (ex. &quot;{csvRawData[0]?.[idx] || ""}&quot;)
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setCsvStep("upload")}
                      className="flex-1 rounded-xl border border-border/40 py-2.5 text-xs font-medium hover:bg-muted/50"
                    >
                      Înapoi
                    </button>
                    <button
                      type="button"
                      onClick={handleCsvMappingConfirm}
                      disabled={csvMapping.firstName === undefined || csvMapping.firstName === -1}
                      className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      Previzualizare
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {tab === "csv" && csvStep === "preview" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Previzualizare: {csvParsed.length} invitați gata de import
                    </p>
                    <button
                      type="button"
                      onClick={() => setCsvStep("map")}
                      className="text-xs text-primary hover:underline"
                    >
                      ← Editează asocierea
                    </button>
                  </div>

                  <div className="border border-border/40 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-muted/40 sticky top-0 border-b border-border/40 z-10 backdrop-blur">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold text-muted-foreground">Nume</th>
                          <th className="px-3 py-2.5 font-semibold text-muted-foreground">Telefon / Email</th>
                          <th className="px-3 py-2.5 font-semibold text-muted-foreground">RSVP</th>
                          <th className="px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                          <th className="px-2 py-2.5 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {csvParsed.map((guest) => {
                          const dupError = checkDuplicate(guest.firstName, guest.lastName, guest.email, guest.phone);
                          return (
                            <tr key={guest.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2 font-medium">
                                {guest.firstName} {guest.lastName}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {guest.phone || guest.email ? (
                                  <>
                                    {guest.phone && <div>{guest.phone}</div>}
                                    {guest.email && <div className="text-[10px]">{guest.email}</div>}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/30 italic">fără date</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  guest.rsvpStatus === "accepted" ? "bg-emerald-50 text-emerald-700" :
                                  guest.rsvpStatus === "declined" ? "bg-rose-50 text-rose-700" :
                                  guest.rsvpStatus === "maybe" ? "bg-indigo-50 text-indigo-700" :
                                  "bg-amber-50 text-amber-700"
                                )}>
                                  {guest.rsvpStatus === "accepted" ? "Confirmat" :
                                   guest.rsvpStatus === "declined" ? "Refuzat" :
                                   guest.rsvpStatus === "maybe" ? "Poate" : "În așteptare"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {dupError ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 font-medium">
                                    <AlertCircle className="h-3 w-3" />
                                    Duplicat
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-medium">Valid</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeCsvRow(guest.id)}
                                  className="p-1 rounded-lg text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {csvParsed.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                              Niciun invitat de afișat.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- TAB 3: Photo OCR Scanner --- */}
              {tab === "photo" && photoStep === "upload" && (
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 py-16 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 group animate-fade-in"
                >
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handlePhotoFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Camera className="mb-4 h-10 w-10 text-muted-foreground/40 transition-transform group-hover:-translate-y-1 duration-200" />
                  <p className="text-sm font-medium text-foreground">
                    Încarcă o fotografie cu lista de invitați
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Acceptă imagini tipărite sau scrise de mână (liste, invitații)
                  </p>
                </div>
              )}

              {tab === "photo" && photoStep === "scanning" && photoImage && (
                <div className="flex flex-col items-center py-6 space-y-4 animate-fade-in">
                  <div className="relative overflow-hidden rounded-2xl max-h-64 max-w-sm border border-border/40 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoImage} className="w-full h-auto object-contain opacity-70" alt="Scanned view" />
                    {/* Laser scanning line */}
                    <div className="absolute left-0 right-0 h-1.5 bg-primary/80 shadow-[0_0_15px_#e11d48] animate-[scan_2.2s_ease-in-out_infinite]" />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground animate-pulse">
                      Se analizează imaginea folosind AI...
                    </p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Extragem și normalizăm automat numele invitaților din imagine.
                    </p>
                  </div>
                </div>
              )}

              {tab === "photo" && photoStep === "preview" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                    <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Rezultate scanare AI
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Am identificat {photoGuests.length} invitați. Corectează numele incerte (marcate în galben) înainte de a le importa.
                    </p>
                  </div>

                  <div className="border border-border/40 rounded-2xl overflow-hidden overflow-y-auto max-h-[300px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-muted/40 sticky top-0 border-b border-border/40 z-10 backdrop-blur">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold text-muted-foreground">Nume detectat</th>
                          <th className="px-3 py-2.5 font-semibold text-muted-foreground">Încredere AI</th>
                          <th className="px-2 py-2.5 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {photoGuests.map((pg) => {
                          const isLowConfidence = pg.confidence < 75;
                          return (
                            <tr key={pg.id} className="hover:bg-muted/10">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={pg.name}
                                  onChange={(e) => updatePhotoGuestName(pg.id, e.target.value)}
                                  className={cn(
                                    "w-full h-8 px-2 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/45 bg-transparent",
                                    isLowConfidence
                                      ? "border-amber-200 bg-amber-50/50 text-amber-900 focus:border-amber-300"
                                      : "border-transparent focus:border-border"
                                  )}
                                  placeholder="Nume..."
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "h-2 w-2 rounded-full",
                                    pg.confidence >= 90 ? "bg-emerald-500" :
                                    pg.confidence >= 75 ? "bg-indigo-500" : "bg-amber-500"
                                  )} />
                                  <span className="font-semibold text-muted-foreground">
                                    {pg.confidence}%
                                  </span>
                                  {isLowConfidence && (
                                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium ml-1">
                                      Corectează
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removePhotoRow(pg.id)}
                                  className="p-1 rounded-lg text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {photoGuests.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-muted-foreground">
                              Niciun invitat de importat.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPhotoStep("upload")}
                      className="flex-1 rounded-xl border border-border/40 py-2.5 text-xs font-medium hover:bg-muted/50"
                    >
                      Încearcă altă poză
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPhoto}
                      disabled={isPending || photoGuests.length === 0}
                      className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isPending ? "Se adaugă..." : `Importă ${photoGuests.length} invitați`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer for Text Paste Preview only */}
            {tab === "paste" && showPreview && parsed.length > 0 && (
              <div className="border-t border-border/30 px-6 py-4">
                <button
                  key="confirm-paste-btn"
                  type="button"
                  onClick={handleConfirmPaste}
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

            {/* Footer for CSV Step 3 only */}
            {tab === "csv" && csvStep === "preview" && csvParsed.length > 0 && (
              <div className="border-t border-border/30 px-6 py-4">
                <button
                  key="confirm-csv-btn"
                  type="button"
                  onClick={handleConfirmCsv}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="animate-pulse">Se adaugă...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Importă {csvParsed.length} invitați
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
