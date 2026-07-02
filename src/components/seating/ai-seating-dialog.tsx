"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  aiAutoSeatGuests,
  commitAiSeatAssignments,
} from "@/app/(dashboard)/dashboard/events/[id]/seating/ai-seating-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseMetadata } from "@/lib/seating/utils";
import { modalContentVariants } from "@/lib/nuntiki/variants";
import { cn } from "@/lib/utils";
import type { GuestWithTable } from "@/types/guests";

type AiSeatingDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allGuests: GuestWithTable[];
  tables: {
    id: string;
    name: string;
    capacity: number;
    notes: string | null;
    guests: GuestWithTable[];
  }[];
  onApplied: (
    assignments: { guestId: string; tableId: string }[],
    count: number
  ) => void;
};

type DialogStep = "loading" | "preview" | "error";

function formatGuestName(guest: GuestWithTable): string {
  const first = guest.first_name.trim();
  const last = guest.last_name?.trim();
  if (last) return `${last} ${first}`;
  return first;
}

function calculatePartySize(primaryId: string, allGuests: GuestWithTable[]): number {
  const party = [
    ...allGuests.filter((g) => g.id === primaryId),
    ...allGuests.filter((g) => g.parent_id === primaryId),
  ];
  let size = 0;
  for (const member of party) {
    size += 1;
    if (!member.parent_id && member.plus_one) {
      const hasCouple = party.some(
        (sub) => sub.parent_id === member.id && sub.relationship_type === "couple"
      );
      if (!hasCouple) size += 1;
    }
  }
  return size;
}

function formatPartyLabel(primary: GuestWithTable, allGuests: GuestWithTable[]): string {
  const party = [
    primary,
    ...allGuests.filter((g) => g.parent_id === primary.id),
  ];
  const partner = party.find((g) => g.relationship_type === "couple");
  if (partner) {
    return `${formatGuestName(primary)} + ${partner.first_name} (cuplu)`;
  }
  if (party.length > 1) {
    const lastName = primary.last_name?.trim();
    if (lastName) return `Familie ${lastName} (${party.length} pers)`;
    return `${formatGuestName(primary)} (${party.length} pers)`;
  }
  if (primary.plus_one && !partner) {
    return `${formatGuestName(primary)} (+1)`;
  }
  return formatGuestName(primary);
}

function getOccupiedSeats(guests: GuestWithTable[]): number {
  let occupied = 0;
  for (const g of guests) {
    occupied += 1;
    if (!g.parent_id && g.plus_one) {
      const hasCoupleRow = guests.some(
        (sub) => sub.parent_id === g.id && sub.relationship_type === "couple"
      );
      if (!hasCoupleRow) occupied += 1;
    }
  }
  return occupied;
}

function isSeatingTable(notes: string | null): boolean {
  const meta = parseMetadata(notes);
  if (meta.objectType) return false;
  if (meta.customShape === "sweetheart") return false;
  return true;
}

export function AiSeatingDialog({
  eventId,
  open,
  onOpenChange,
  allGuests,
  tables,
  onApplied,
}: AiSeatingDialogProps) {
  const [step, setStep] = useState<DialogStep>("loading");
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<{ guestId: string; tableId: string }[]>([]);
  const [unassignedIds, setUnassignedIds] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState<string>("");
  const [committing, setCommitting] = useState(false);

  const seatingTables = useMemo(
    () => tables.filter((t) => isSeatingTable(t.notes)),
    [tables]
  );

  const guestById = useMemo(() => new Map(allGuests.map((g) => [g.id, g])), [allGuests]);

  const newAssignmentGuestIds = useMemo(
    () => new Set(assignments.map((a) => a.guestId)),
    [assignments]
  );

  const tablePreviews = useMemo(() => {
    const byTable = new Map<string, { existing: GuestWithTable[]; incoming: GuestWithTable[] }>();

    for (const table of seatingTables) {
      byTable.set(table.id, {
        existing: table.guests.filter((g) => !newAssignmentGuestIds.has(g.id)),
        incoming: [],
      });
    }

    for (const assignment of assignments) {
      const guest = guestById.get(assignment.guestId);
      if (!guest) continue;
      const bucket = byTable.get(assignment.tableId);
      if (!bucket) continue;
      if (!bucket.incoming.some((g) => g.id === guest.id)) {
        bucket.incoming.push(guest);
      }
    }

    return seatingTables
      .map((table) => {
        const bucket = byTable.get(table.id);
        if (!bucket || bucket.incoming.length === 0) return null;

        const occupied = getOccupiedSeats(table.guests);
        const primariesIncoming = bucket.incoming.filter((g) => !g.parent_id);
        const incomingSize = primariesIncoming.reduce(
          (sum, guest) => sum + calculatePartySize(guest.id, allGuests),
          0
        );
        const primariesExisting = bucket.existing.filter((g) => !g.parent_id);
        const capacity = table.capacity;

        return {
          table,
          occupiedAfter: occupied + incomingSize,
          capacity,
          primariesExisting,
          primariesIncoming,
        };
      })
      .filter(Boolean) as {
      table: (typeof seatingTables)[number];
      occupiedAfter: number;
      capacity: number;
      primariesExisting: GuestWithTable[];
      primariesIncoming: GuestWithTable[];
    }[];
  }, [assignments, allGuests, guestById, newAssignmentGuestIds, seatingTables]);

  const assignedGuestCount = assignments.length;
  const tablesUsedCount = new Set(assignments.map((a) => a.tableId)).size;

  const unassignedParties = useMemo(
    () =>
      unassignedIds
        .map((id) => guestById.get(id))
        .filter((g): g is GuestWithTable => Boolean(g)),
    [guestById, unassignedIds]
  );

  const runAnalysis = useCallback(async () => {
    setStep("loading");
    setError(null);
    setAssignments([]);
    setUnassignedIds([]);
    setReasoning("");

    const result = await aiAutoSeatGuests(eventId);

    if (result.error) {
      setError(result.error);
      setStep("error");
      return;
    }

    setAssignments(result.assignments ?? []);
    setUnassignedIds(result.unassigned ?? []);
    setReasoning(result.reasoning ?? "");
    setStep("preview");
  }, [eventId]);

  useEffect(() => {
    if (open) {
      void runAnalysis();
    } else {
      setStep("loading");
      setError(null);
      setAssignments([]);
      setUnassignedIds([]);
      setReasoning("");
      setCommitting(false);
    }
  }, [open, runAnalysis]);

  async function handleCommit() {
    if (assignments.length === 0) {
      onOpenChange(false);
      return;
    }

    setCommitting(true);
    const result = await commitAiSeatAssignments(eventId, assignments);
    setCommitting(false);

    if (result.error) {
      setError(result.error);
      setStep("error");
      return;
    }

    onApplied(assignments, result.count);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(modalContentVariants(), "max-w-2xl gap-0 p-0")}>
        <DialogHeader className="border-b border-[rgba(210,170,185,0.18)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 font-serif text-xl text-[#1A0E14]">
            {step === "preview" ? (
              <>
                <Sparkles className="h-5 w-5 text-[#B8516B]" />
                Propunere AI — {assignedGuestCount} invitați asignați
              </>
            ) : (
              "Auto-Așezare AI"
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#8A7080]">
            {step === "loading"
              ? "AI-ul analizează invitații și mesele..."
              : step === "error"
                ? (error ?? "A apărut o eroare neașteptată.")
                : "Verifică propunerea înainte de a o aplica pe plan."}
          </DialogDescription>
        </DialogHeader>

        {step === "loading" ? (
          <div className="flex flex-col items-center justify-center px-8 py-10 text-center">
            <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#FCE8EE] opacity-40" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FEF0F3] to-[#FCE8EE] border border-[rgba(210,170,185,0.35)]">
                <Loader2 className="h-7 w-7 animate-spin text-[#B8516B]" />
              </div>
            </div>
            <p className="max-w-sm text-sm text-[#8A7080]">
              Se evaluează familiile, capacitatea meselor și preferințele de grupare.
            </p>
          </div>
        ) : null}

        {step === "error" ? (
          <DialogFooter className="px-6 py-6 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Anulează
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#B8516B] hover:bg-[#A3445D]"
              onClick={() => void runAnalysis()}
            >
              Încearcă din nou
            </Button>
          </DialogFooter>
        ) : null}

        {step === "preview" ? (
          <>
            <div className="max-h-[min(62vh,560px)] overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard
                  label="Asignați"
                  value={String(assignedGuestCount)}
                  tone="green"
                />
                <SummaryCard
                  label="Neasignați"
                  value={String(unassignedParties.length)}
                  tone={unassignedParties.length > 0 ? "amber" : "muted"}
                />
                <SummaryCard
                  label="Mese folosite"
                  value={`${tablesUsedCount} din ${seatingTables.length}`}
                  tone="muted"
                />
              </div>

              {reasoning ? (
                <div className="rounded-2xl border border-[rgba(210,170,185,0.22)] bg-[#FEF6F8] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C4A8B4] mb-1">
                    Strategia AI
                  </p>
                  <p className="text-sm italic text-[#5A4048] leading-relaxed">{reasoning}</p>
                </div>
              ) : null}

              {tablePreviews.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#C4A8B4]">
                    Mese cu asignări noi
                  </p>
                  {tablePreviews.map(
                    ({ table, occupiedAfter, capacity, primariesExisting, primariesIncoming }) => (
                      <div
                        key={table.id}
                        className="rounded-2xl border border-[rgba(210,170,185,0.2)] bg-white/80 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="font-semibold text-[#1A0E14]">{table.name}</span>
                          <span className="text-xs font-medium text-[#8A7080]">
                            {occupiedAfter}/{capacity} locuri
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {primariesExisting.map((guest) => (
                            <GuestChip
                              key={guest.id}
                              label={formatPartyLabel(guest, allGuests)}
                              isNew={false}
                            />
                          ))}
                          {primariesIncoming.map((guest) => (
                            <GuestChip
                              key={guest.id}
                              label={formatPartyLabel(guest, allGuests)}
                              isNew
                            />
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[rgba(210,170,185,0.3)] bg-[#FFFBF8] px-4 py-6 text-center text-sm text-[#8A7080]">
                  AI-ul nu a propus asignări noi.
                </div>
              )}

              {unassignedParties.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#C4A8B4]">
                    Neasignați
                  </p>
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-2">
                    {unassignedParties.map((primary) => {
                      const partySize = calculatePartySize(primary.id, allGuests);
                      return (
                        <div key={primary.id} className="text-sm text-[#5A4048]">
                          <span className="font-medium">{formatPartyLabel(primary, allGuests)}</span>
                          <span className="text-[#8A7080]">
                            {" "}
                            — Nu există masă cu {partySize} locuri disponibile
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="border-t border-[rgba(210,170,185,0.18)] px-6 py-4 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-[#8A7080]"
                onClick={() => onOpenChange(false)}
                disabled={committing}
              >
                Anulează
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-[#B8516B] hover:bg-[#A3445D]"
                onClick={() => void handleCommit()}
                disabled={committing || assignments.length === 0}
              >
                {committing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se aplică...
                  </>
                ) : (
                  "Aplică asignările"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "muted";
}) {
  const styles = {
    green: "border-emerald-200/70 bg-emerald-50/70 text-emerald-800",
    amber: "border-amber-200/70 bg-amber-50/70 text-amber-900",
    muted: "border-[rgba(210,170,185,0.22)] bg-[#FFFBF8] text-[#5A4048]",
  }[tone];

  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-center", styles)}>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
    </div>
  );
}

function GuestChip({ label, isNew }: { label: string; isNew: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        isNew
          ? "border-[rgba(184,81,107,0.35)] bg-[#FEF0F3] text-[#B8516B]"
          : "border-[rgba(210,170,185,0.25)] bg-[#F5F0F2] text-[#8A7080]"
      )}
    >
      {label}
    </span>
  );
}
