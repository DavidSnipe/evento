"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Trash2, UserMinus, X, Edit3, Save } from "lucide-react";

import {
  updateTable,
  deleteTable,
  unassignGuest,
} from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import { getTableOccupancy } from "@/lib/seating/utils";
import type { TableWithGuests } from "@/lib/seating/queries";
import type { GuestWithTable } from "@/types/guests";

/* ─── Types ─── */

type TableDetailPanelProps = {
  table: TableWithGuests;
  allGuests: GuestWithTable[];
  eventId: string;
  onClose: () => void;
  className?: string;
};

/* ─── Helpers ─── */

function guestName(g: GuestWithTable) {
  return g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name;
}

function guestInitials(g: GuestWithTable) {
  const first = g.first_name?.[0] ?? "";
  const last = g.last_name?.[0] ?? "";
  return g.last_name ? (last + first).toUpperCase() : first.toUpperCase() || "?";
}

const SHAPE_LABELS: Record<string, string> = {
  round: ro.seating.shapes.round,
  rectangular: ro.seating.shapes.rectangular,
  sweetheart: ro.seating.shapes.sweetheart,
};

function detectWarnings(table: TableWithGuests, allGuests: GuestWithTable[]) {
  const warnings: string[] = [];
  const { occupied, capacity } = getTableOccupancy(table);
  if (occupied > capacity) warnings.push(ro.seating.warnings.overCapacity);

  // Check for split groups
  const tableGroupNames = new Set(
    table.guests.map((g) => g.group_name).filter(Boolean)
  );
  for (const groupName of tableGroupNames) {
    const groupMembers = allGuests.filter((g) => g.group_name === groupName);
    const atOtherTables = groupMembers.some(
      (g) => g.table_id && g.table_id !== table.id
    );
    if (atOtherTables) {
      warnings.push(`${ro.seating.warnings.splitFamily}: ${groupName}`);
    }
  }
  return warnings;
}

/* ─── Component ─── */

export function TableDetailPanel({
  table,
  allGuests,
  eventId,
  onClose,
  className,
}: TableDetailPanelProps) {
  const router = useRouter();

  /* Editable name */
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(table.name);
  const [savingName, setSavingName] = useState(false);

  /* Notes */
  const [notesValue, setNotesValue] = useState(table.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  /* Guest removal loading */
  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);

  /* Delete confirmation */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { occupied, capacity } = getTableOccupancy(table);
  const isOverCapacity = occupied > capacity;
  const occupancyPercent = capacity > 0 ? Math.min(100, (occupied / capacity) * 100) : 0;
  const warnings = detectWarnings(table, allGuests);

  /* ─── Handlers ─── */

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === table.name) {
      setNameValue(table.name);
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    await updateTable(eventId, table.id, { name: trimmed });
    router.refresh();
    setSavingName(false);
    setIsEditingName(false);
  }

  async function handleSaveNotes() {
    if (notesValue === (table.notes ?? "")) return;
    setSavingNotes(true);
    await updateTable(eventId, table.id, { notes: notesValue });
    router.refresh();
    setSavingNotes(false);
  }

  async function handleRemoveGuest(guestId: string) {
    setRemovingGuestId(guestId);
    await unassignGuest(eventId, guestId);
    router.refresh();
    setRemovingGuestId(null);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteTable(eventId, table.id);
    router.refresh();
    onClose();
  }

  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border border-white/20 bg-white/70 shadow-xl backdrop-blur-lg",
        "transition-all duration-300 ease-out",
        className
      )}
    >
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-8 text-base font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setNameValue(table.name);
                    setIsEditingName(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleSaveName}
                disabled={savingName}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="truncate font-[family-name:var(--font-playfair)] text-lg font-semibold text-foreground">
                {table.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setNameValue(table.name);
                  setIsEditingName(true);
                }}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <span className="mt-1 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {SHAPE_LABELS[table.shape] ?? table.shape}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Scrollable body ─── */}
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {/* Capacity bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-foreground">
              {ro.seating.detail.capacity}
            </span>
            <span
              className={cn(
                "tabular-nums",
                isOverCapacity
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {occupied}/{capacity}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                isOverCapacity
                  ? "bg-destructive"
                  : occupancyPercent >= 90
                    ? "bg-amber-400"
                    : "bg-accent"
              )}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2 rounded-xl bg-destructive/5 p-3">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Guests list */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {ro.seating.detail.guestsAtTable}
          </Label>
          {table.guests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {ro.seating.detail.noGuests}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {table.guests.map((guest) => (
                <li
                  key={guest.id}
                  className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 shadow-sm transition-colors hover:bg-white"
                >
                  {/* Initials avatar */}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-foreground">
                    {guestInitials(guest)}
                  </span>

                  {/* Name + plus one */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {guestName(guest)}
                    </p>
                    {guest.plus_one && (
                      <span className="text-xs text-muted-foreground">
                        +1{guest.plus_one_name ? ` · ${guest.plus_one_name}` : ""}
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={removingGuestId === guest.id}
                    onClick={() => handleRemoveGuest(guest.id)}
                    title={ro.seating.tableCard.remove}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="table-notes" className="text-sm font-medium">
            {ro.seating.tableCard.notes}
          </Label>
          <textarea
            id="table-notes"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder={ro.seating.tableCard.notesPlaceholder}
            rows={3}
            className={cn(
              "flex w-full rounded-xl border border-input bg-white/60 px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              "resize-none transition-colors",
              savingNotes && "opacity-60"
            )}
          />
        </div>
      </div>

      {/* ─── Footer: Delete ─── */}
      <div className="border-t border-border/40 px-5 py-4">
        {showDeleteConfirm ? (
          <div className="space-y-3 rounded-xl bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {ro.seating.tableCard.deleteConfirm}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {deleting ? ro.auth.pleaseWait : ro.seating.tableCard.deleteTable}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                {ro.seating.form.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {ro.seating.tableCard.deleteTable}
          </Button>
        )}
      </div>
    </aside>
  );
}
