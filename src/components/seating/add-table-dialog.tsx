"use client";

import {
  Circle,
  RectangleHorizontal,
  Square,
  Heart,
  Music,
  Sliders,
  Mic,
  GlassWater,
  Cake,
  Camera,
  DoorOpen,
  LayoutGrid,
  type LucideIcon
} from "lucide-react";
import { useState, useEffect } from "react";

import { createTable, type TableFormState } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { TableShape } from "@/types/guests";
import type { TableWithGuests } from "@/lib/seating/queries";
import {
  defaultObjectMetadata,
  defaultTableMetadataForShape,
  OBJECT_PRESETS_M,
  patchMeterDimensions,
  serializeTableMetadata,
} from "@/lib/seating/table-spatial";
import { snapMeters } from "@/lib/seating/spatial";
import type { TableMetadata } from "@/lib/seating/utils";

type AddTableDialogProps = {
  eventId: string;
  open: boolean;
  tables: TableWithGuests[];
  onClose: () => void;
  onAddOptimistic?: (tempTables: TableWithGuests[], promise: Promise<TableFormState>) => void;
};

type TabType = "tables" | "objects";

type CustomTableShape = TableShape | "square" | "long_banquet";

const tableShapes: { value: CustomTableShape; label: string; icon: LucideIcon }[] = [
  { value: "round", label: ro.seating.shapes.round, icon: Circle },
  { value: "square", label: "Pătrată", icon: Square },
  { value: "long_banquet", label: "Banquet Lung", icon: RectangleHorizontal },
  { value: "sweetheart", label: ro.seating.shapes.sweetheart, icon: Heart },
];

type ObjectTypePreset = {
  value: string;
  label: string;
  icon: LucideIcon;
  defaultShape: "round" | "rectangular";
};

const objectTypes: ObjectTypePreset[] = [
  { value: "dance_floor", label: "Ring de Dans", icon: Music, defaultShape: "round" },
  { value: "stage", label: "Scenă", icon: Mic, defaultShape: "rectangular" },
  { value: "dj_booth", label: "DJ Booth", icon: Sliders, defaultShape: "rectangular" },
  { value: "bar", label: "Cocktail Bar", icon: GlassWater, defaultShape: "rectangular" },
  { value: "candy_bar", label: "Candy Bar", icon: Cake, defaultShape: "rectangular" },
  { value: "photo_booth", label: "Cabina Foto", icon: Camera, defaultShape: "rectangular" },
  { value: "entrance", label: "Intrare", icon: DoorOpen, defaultShape: "rectangular" },
];

export function AddTableDialog({ eventId, open, tables, onClose, onAddOptimistic }: AddTableDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tables");

  const hasSweetheart = tables.some((t) => t.shape === "sweetheart");
  const hasDanceFloor = tables.some((t) => {
    try {
      const meta = JSON.parse(t.notes || "{}");
      const actualMeta = meta.metadata || meta;
      return actualMeta.objectType === "dance_floor";
    } catch {
      return false;
    }
  });
  const hasStage = tables.some((t) => {
    try {
      const meta = JSON.parse(t.notes || "{}");
      const actualMeta = meta.metadata || meta;
      return actualMeta.objectType === "stage";
    } catch {
      return false;
    }
  });
  const hasDjBooth = tables.some((t) => {
    try {
      const meta = JSON.parse(t.notes || "{}");
      const actualMeta = meta.metadata || meta;
      return actualMeta.objectType === "dj_booth";
    } catch {
      return false;
    }
  });

  // Table state
  const [tableShape, setTableShape] = useState<CustomTableShape>("round");
  const [quantity, setQuantity] = useState(1);
  const [capacity, setCapacity] = useState(8);

  // Object state
  const [selectedObjectType, setSelectedObjectType] = useState("dance_floor");
  const [objectName, setObjectName] = useState("Ring de Dans");
  const [objectWidthM, setObjectWidthM] = useState(
    () => OBJECT_PRESETS_M.dance_floor.widthM
  );
  const [objectHeightM, setObjectHeightM] = useState(
    () => OBJECT_PRESETS_M.dance_floor.heightM
  );
  const [objectShape, setObjectShape] = useState<"round" | "rectangular">("round");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function applyObjectPreset(typeVal: string) {
    const preset = objectTypes.find((o) => o.value === typeVal);
    const sizes = OBJECT_PRESETS_M[typeVal] ?? { widthM: 2, heightM: 1 };
    if (!preset) return;
    setSelectedObjectType(typeVal);
    setObjectName(preset.label);
    setObjectWidthM(sizes.widthM);
    setObjectHeightM(sizes.heightM);
    setObjectShape(preset.defaultShape);
  }

  function buildTableNotesMeta(shape: CustomTableShape): TableMetadata {
    return defaultTableMetadataForShape(shape, { isLocked: false });
  }

  // Sync initial object type when dialog opens and dance floor exists
  useEffect(() => {
    if (open) {
      if (hasDanceFloor) {
        if (!hasStage) {
          applyObjectPreset("stage");
        } else if (!hasDjBooth) {
          applyObjectPreset("dj_booth");
        } else {
          applyObjectPreset("bar");
        }
      } else {
        applyObjectPreset("dance_floor");
      }
      setTableShape("round");
      setQuantity(1);
      setCapacity(8);
      setError("");
    }
  }, [open, hasDanceFloor, hasStage, hasDjBooth]);

  if (!open) return null;

  // Sync capacity when shape changes
  const handleShapeSelect = (shape: CustomTableShape) => {
    setTableShape(shape);
    if (shape === "sweetheart") {
      setCapacity(2);
    } else if (shape === "long_banquet") {
      setCapacity(12);
    } else if (shape === "square") {
      setCapacity(4);
    } else {
      setCapacity(8);
    }
  };

  // Sync object type presets
  const handleObjectTypeSelect = (typeVal: string) => {
    applyObjectPreset(typeVal);
  };

  async function handleSubmit(formData: FormData) {
    setError("");

    const now = Date.now();
    const tempTables: TableWithGuests[] = [];
    if (activeTab === "tables") {
      formData.set("shape", tableShape);
      formData.set("quantity", String(quantity));
      formData.set("capacity", String(capacity));
      
      for (let i = 0; i < quantity; i++) {
        tempTables.push({
          id: `temp-${now}-${i}`,
          event_id: eventId,
          name: `Masa ${tables.length + 1 + i}`,
          capacity: capacity,
          shape: tableShape === "sweetheart" ? "sweetheart" : tableShape === "round" ? "round" : "rectangular",
          pos_x: 350 + (i % 4) * 240,
          pos_y: 250 + Math.floor(i / 4) * 200,
          notes: serializeTableMetadata(buildTableNotesMeta(tableShape), tableShape),
          sort_order: (tables[tables.length - 1]?.sort_order ?? 0) + 1 + i,
          guests: [],
          created_at: new Date().toISOString(),
          color_tag: null
        });
      }
    } else {
      formData.set("objectType", selectedObjectType);
      formData.set("name", objectName);
      formData.set("shape", objectShape);
      formData.set("widthM", String(objectWidthM));
      formData.set("heightM", String(objectHeightM));

      const objectMeta = patchMeterDimensions(
        {
          ...defaultObjectMetadata(selectedObjectType),
          objectType: selectedObjectType as TableMetadata["objectType"],
          customShape: objectShape,
          rotation: 0,
          isLocked: false,
        },
        { widthM: objectWidthM, heightM: objectHeightM }
      );

      tempTables.push({
        id: `temp-${now}-0`,
        event_id: eventId,
        name: objectName,
        capacity: 1,
        shape: objectShape === "round" ? "round" : "rectangular",
        pos_x: 200,
        pos_y: 200,
        notes: JSON.stringify(objectMeta),
        sort_order: (tables[tables.length - 1]?.sort_order ?? 0) + 1,
        guests: [],
        created_at: new Date().toISOString(),
        color_tag: null
      });
    }

    const promise = createTable(eventId, formData);
    if (onAddOptimistic) {
      onAddOptimistic(tempTables, promise);
      setPending(false);
      setError("");
      return;
    }

    setPending(true);
    const result = await promise;
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void handleSubmit(new FormData(e.currentTarget));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="glass-panel mx-4 w-full max-w-lg animate-in fade-in zoom-in-95 p-6 rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-serif text-xl font-semibold text-center text-slate-800">
          Adaugă Elemente Floor Plan
        </h2>

        {/* Tab buttons */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            type="button"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === "tables"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-muted-foreground hover:text-slate-850"
            )}
            onClick={() => setActiveTab("tables")}
          >
            <LayoutGrid className="h-4 w-4" />
            Mese Invitați
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === "objects"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-muted-foreground hover:text-slate-850"
            )}
            onClick={() => setActiveTab("objects")}
          >
            <Music className="h-4 w-4" />
            Obiecte Sală
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {activeTab === "tables" ? (
            /* Tables Section */
            <>
              {/* Shape Selector */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Forma Mesei</Label>
                <div className="grid grid-cols-4 gap-2">
                  {tableShapes.map((s) => {
                    const isSweetheart = s.value === "sweetheart";
                    const isLocked = isSweetheart && hasSweetheart;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        disabled={isLocked}
                        onClick={() => handleShapeSelect(s.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-xs transition-all",
                          isLocked
                            ? "border-slate-200 bg-slate-150 text-slate-400 opacity-55 cursor-not-allowed"
                            : tableShape === s.value
                            ? "border-primary bg-primary/10 text-primary-foreground font-semibold"
                            : "border-slate-100 bg-slate-50 text-muted-foreground hover:bg-slate-100"
                        )}
                        title={isLocked ? "Masa Mirilor a fost deja adăugată" : undefined}
                      >
                        <s.icon
                          className={cn(
                            "h-5 w-5",
                            isLocked
                              ? "text-slate-400"
                              : tableShape === s.value
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate w-full text-center">
                          {isLocked ? "Adăugată" : s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="table-quantity" className="text-slate-700">Număr de Mese</Label>
                  <Input
                    id="table-quantity"
                    type="number"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    required
                  />
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <Label htmlFor="table-capacity" className="text-slate-700">Locuri / Masă</Label>
                  <Input
                    id="table-capacity"
                    type="number"
                    min={1}
                    max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 8)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            /* Room Objects Section */
            <>
              {/* Type Grid */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Alege Tipul de Obiect</Label>
                <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50">
                  {objectTypes.map((o) => {
                    const isLocked =
                      (o.value === "dance_floor" && hasDanceFloor) ||
                      (o.value === "stage" && hasStage) ||
                      (o.value === "dj_booth" && hasDjBooth);

                    return (
                      <button
                        key={o.value}
                        type="button"
                        disabled={isLocked}
                        onClick={() => handleObjectTypeSelect(o.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 py-2 px-1 text-[11px] rounded-lg transition-all border",
                          isLocked
                            ? "border-slate-100 bg-slate-150 text-slate-400 opacity-55 cursor-not-allowed"
                            : selectedObjectType === o.value
                            ? "border-primary/50 bg-white text-primary font-semibold shadow-sm"
                            : "border-transparent text-muted-foreground hover:bg-white/60"
                        )}
                        title={isLocked ? `${o.label} a fost deja adăugat(ă)` : undefined}
                      >
                        <o.icon className="h-4.5 w-4.5" />
                        <span className="truncate w-full text-center">
                          {isLocked ? "Adăugat" : o.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Object Name */}
              <div className="space-y-2">
                <Label htmlFor="object-name" className="text-slate-700">Nume Obiect</Label>
                <Input
                  id="object-name"
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  placeholder="Ex: Ring de Dans, Bar Central..."
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Object Width */}
                <div className="space-y-1">
                  <Label htmlFor="object-width" className="text-xs text-slate-700">Lățime (m)</Label>
                  <Input
                    id="object-width"
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={objectWidthM}
                    onChange={(e) =>
                      setObjectWidthM(snapMeters(parseFloat(e.target.value) || 1))
                    }
                    required
                  />
                </div>

                {/* Object Height */}
                <div className="space-y-1">
                  <Label htmlFor="object-height" className="text-xs text-slate-700">Înălțime (m)</Label>
                  <Input
                    id="object-height"
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={objectHeightM}
                    onChange={(e) =>
                      setObjectHeightM(snapMeters(parseFloat(e.target.value) || 1))
                    }
                    required
                  />
                </div>

                {/* Object Shape */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Formă</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant={objectShape === "round" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-[11px] h-9 p-0"
                      onClick={() => setObjectShape("round")}
                    >
                      Rotund
                    </Button>
                    <Button
                      type="button"
                      variant={objectShape === "rectangular" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-[11px] h-9 p-0"
                      onClick={() => setObjectShape("rectangular")}
                    >
                      Drept.
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              {ro.seating.form.cancel}
            </Button>
            <Button type="submit" disabled={pending} className="flex-1 rounded-xl">
              {pending ? "Se salvează..." : ro.seating.form.add}
            </Button>
          </div>
        </form>
      </div>

      {/* Backdrop click to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
