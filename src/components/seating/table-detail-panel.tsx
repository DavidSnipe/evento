"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Trash2,
  UserMinus,
  X,
  Edit3,
  Save,
  Lock,
  Unlock,
  RotateCw,
  Maximize2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import {
  getTableOccupancy,
  parseMetadata,
  getNotesText,
  type TableMetadata
} from "@/lib/seating/utils";
import type { TableWithGuests } from "@/lib/seating/queries";
import type { GuestWithTable } from "@/types/guests";
import { formatMeters, snapMeters } from "@/lib/seating/spatial";
import { resolveFootprintMeters } from "@/lib/seating/table-spatial";
import { canEditLayout } from "@/lib/seating/planner-lock";
import {
  getDisplayRotationDeg,
  isRectangularVertical,
  tableAllowsRotation,
  usesRectangularOrientationToggle,
} from "@/lib/seating/table-rotation";

export type PlannerTableActions = {
  onSaveName: (name: string) => Promise<void>;
  onSaveNotes: (notesText: string) => Promise<void>;
  onPatchMetadata: (patch: Partial<TableMetadata>) => Promise<void>;
  onToggleRectOrientation: () => Promise<void>;
  onDelete: () => Promise<void>;
  onUnassignGuest: (guestId: string) => Promise<void>;
};

type TableDetailPanelProps = {
  table: TableWithGuests;
  allGuests: GuestWithTable[];
  actions: PlannerTableActions;
  globalLock: boolean;
  onClose: () => void;
  className?: string;
};

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
  square: "Pătrată",
  long_banquet: "Banquet Lung"
};

function detectWarnings(table: TableWithGuests, allGuests: GuestWithTable[]) {
  const warnings: string[] = [];
  const { occupied, capacity } = getTableOccupancy(table);
  if (occupied > capacity) warnings.push(ro.seating.warnings.overCapacity);

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

export function TableDetailPanel({
  table,
  allGuests,
  actions,
  globalLock,
  onClose,
  className,
}: TableDetailPanelProps) {
  const metadata = parseMetadata(table.notes);
  const isRoomObject = !!metadata.objectType;
  const isLocked = metadata.isLocked === true;
  const layoutEditsDisabled = !canEditLayout(globalLock, metadata);
  const displayRotation = getDisplayRotationDeg(metadata, table.shape);
  const showRotation = tableAllowsRotation(metadata, table.shape);
  const rectOrientationToggle = usesRectangularOrientationToggle(metadata, table.shape);
  const isVertical = isRectangularVertical(metadata, table.shape);
  const footprint = resolveFootprintMeters(metadata, metadata.customShape ?? table.shape);
  const widthM = footprint.widthM;
  const heightM = footprint.heightM;

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(table.name);
  const [savingName, setSavingName] = useState(false);

  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setNameValue(table.name);
    setIsEditingName(false);
    setNotesValue(getNotesText(table.notes));
    setShowDeleteConfirm(false);
  }, [table.id, table.notes, table.name]);

  const { occupied, capacity } = getTableOccupancy(table);
  const isOverCapacity = occupied > capacity;
  const occupancyPercent = capacity > 0 ? Math.min(100, (occupied / capacity) * 100) : 0;
  const warnings = detectWarnings(table, allGuests);

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === table.name) {
      setNameValue(table.name);
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    await actions.onSaveName(trimmed);
    setSavingName(false);
    setIsEditingName(false);
  }

  async function handleSaveNotes() {
    const currentNotes = table.notes;
    if (serializeNotesUnchanged(currentNotes, notesValue)) return;
    setSavingNotes(true);
    await actions.onSaveNotes(notesValue);
    setSavingNotes(false);
  }

  async function handleUpdateMetadata(updates: Partial<TableMetadata>) {
    await actions.onPatchMetadata(updates);
  }

  function handleDimensionMeters(axis: "widthM" | "heightM", rawMeters: number) {
    void handleUpdateMetadata({ [axis]: snapMeters(rawMeters) });
  }

  async function handleRemoveGuest(guestId: string) {
    setRemovingGuestId(guestId);
    await actions.onUnassignGuest(guestId);
    setRemovingGuestId(null);
  }

  async function handleDelete() {
    setDeleting(true);
    await actions.onDelete();
    setDeleting(false);
    onClose();
  }

  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border border-white/20 bg-white/80 shadow-xl backdrop-blur-lg w-full",
        "transition-all duration-300 ease-out",
        className
      )}
    >
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
              <h3 className="truncate font-serif text-lg font-semibold text-foreground">
                {table.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={layoutEditsDisabled}
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
            {isRoomObject
              ? "Obiect Sală"
              : (SHAPE_LABELS[metadata.customShape || table.shape] ??
                (metadata.customShape || table.shape))}
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

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {globalLock && (
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 text-xs text-rose-800">
            Planul este blocat pentru editarea layout-ului. Poți continua să muți invitații
            între mese; deblochează din bara de sus pentru a muta/redimensiona mese.
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-700">Blochează Poziția</span>
            <span className="text-[11px] text-muted-foreground">Previne mutarea accidentală</span>
          </div>
          <Button
            variant={isLocked ? "destructive" : "outline"}
            size="sm"
            className="rounded-xl h-8 gap-1.5"
            disabled={layoutEditsDisabled}
            onClick={() => handleUpdateMetadata({ isLocked: !isLocked })}
          >
            {isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                Blocat
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                Liber
              </>
            )}
          </Button>
        </div>

        {isRoomObject && (
          <div className="space-y-4 rounded-xl border border-border/40 p-3.5 bg-slate-50/50">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Maximize2 className="h-4 w-4 text-slate-500" />
              <span>Dimensiuni Obiect</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lățime</span>
                <span className="font-mono text-slate-700 font-semibold">{formatMeters(widthM)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={8}
                step={0.5}
                value={widthM}
                disabled={layoutEditsDisabled}
                onChange={(e) => handleDimensionMeters("widthM", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Înălțime</span>
                <span className="font-mono text-slate-700 font-semibold">{formatMeters(heightM)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={8}
                step={0.5}
                value={heightM}
                disabled={layoutEditsDisabled}
                onChange={(e) => handleDimensionMeters("heightM", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}

        {showRotation && (
          <div className="space-y-2 rounded-xl border border-border/40 p-3 bg-slate-50/50">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <RotateCw className="h-4 w-4 text-slate-500" />
              <span>{rectOrientationToggle ? "Orientare masă" : "Rotire"}</span>
            </div>
            {rectOrientationToggle ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={!isVertical ? "default" : "outline"}
                  size="sm"
                  className="h-9 rounded-lg text-xs"
                  disabled={layoutEditsDisabled}
                  onClick={() => {
                    if (isVertical) void actions.onToggleRectOrientation();
                  }}
                >
                  Orizontală
                </Button>
                <Button
                  variant={isVertical ? "default" : "outline"}
                  size="sm"
                  className="h-9 rounded-lg text-xs"
                  disabled={layoutEditsDisabled}
                  onClick={() => {
                    if (!isVertical) void actions.onToggleRectOrientation();
                  }}
                >
                  Verticală
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {[0, 90, 180, 270].map((deg) => (
                  <Button
                    key={deg}
                    variant={displayRotation === deg ? "default" : "outline"}
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    disabled={layoutEditsDisabled}
                    onClick={() => handleUpdateMetadata({ rotation: deg })}
                  >
                    {deg}°
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {!isRoomObject && (
          <>
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
                      className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 shadow-sm border border-slate-100 transition-colors hover:bg-white"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-foreground">
                        {guestInitials(guest)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {guestName(guest)}
                        </p>
                        {guest.plus_one && (
                          <p className="text-[11px] text-muted-foreground">+1</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={removingGuestId === guest.id}
                        onClick={() => handleRemoveGuest(guest.id)}
                        title={ro.seating.detail.removeGuest}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">{ro.seating.detail.notes}</Label>
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            disabled={savingNotes}
            placeholder={ro.seating.detail.notesPlaceholder}
            className={cn(
              "min-h-[80px] w-full rounded-xl border border-border/60 bg-white/60 px-3 py-2 text-sm",
              "resize-none transition-colors",
              "focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          />
        </div>

        <div className="pt-2">
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={layoutEditsDisabled}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isRoomObject ? "Șterge Obiectul" : ro.seating.tableCard.deleteTable}
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-center text-sm font-medium text-destructive">
                {ro.seating.tableCard.deleteConfirm}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Anulează
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? ro.auth.pleaseWait : ro.seating.tableCard.deleteTable}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function serializeNotesUnchanged(currentNotes: string | null, notesText: string): boolean {
  const current = getNotesText(currentNotes);
  return current === notesText;
}
