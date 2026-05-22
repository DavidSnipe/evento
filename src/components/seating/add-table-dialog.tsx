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
import { useState } from "react";

import { createTable } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type { TableShape } from "@/types/guests";

type AddTableDialogProps = {
  eventId: string;
  open: boolean;
  existingTablesCount: number;
  onClose: () => void;
};

type TabType = "tables" | "objects";

const tableShapes: { value: TableShape; label: string; icon: LucideIcon }[] = [
  { value: "round", label: ro.seating.shapes.round, icon: Circle },
  { value: "square", label: "Pătrată", icon: Square },
  { value: "long_banquet", label: "Banquet Lung", icon: RectangleHorizontal },
  { value: "sweetheart", label: ro.seating.shapes.sweetheart, icon: Heart },
];

type ObjectTypePreset = {
  value: string;
  label: string;
  icon: LucideIcon;
  defaultWidth: number;
  defaultHeight: number;
  defaultShape: "round" | "rectangular";
};

const objectTypes: ObjectTypePreset[] = [
  { value: "dance_floor", label: "Ring de Dans", icon: Music, defaultWidth: 320, defaultHeight: 320, defaultShape: "round" },
  { value: "stage", label: "Scenă", icon: Mic, defaultWidth: 320, defaultHeight: 120, defaultShape: "rectangular" },
  { value: "dj_booth", label: "DJ Booth", icon: Sliders, defaultWidth: 160, defaultHeight: 80, defaultShape: "rectangular" },
  { value: "bar", label: "Cocktail Bar", icon: GlassWater, defaultWidth: 180, defaultHeight: 96, defaultShape: "rectangular" },
  { value: "candy_bar", label: "Candy Bar", icon: Cake, defaultWidth: 180, defaultHeight: 96, defaultShape: "rectangular" },
  { value: "photo_booth", label: "Cabina Foto", icon: Camera, defaultWidth: 160, defaultHeight: 96, defaultShape: "rectangular" },
  { value: "entrance", label: "Intrare", icon: DoorOpen, defaultWidth: 160, defaultHeight: 48, defaultShape: "rectangular" },
];

export function AddTableDialog({ eventId, open, existingTablesCount: _existingTablesCount, onClose }: AddTableDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tables");
  
  // Table state
  const [tableShape, setTableShape] = useState<TableShape>("round");
  const [quantity, setQuantity] = useState(1);
  const [capacity, setCapacity] = useState(8);

  // Object state
  const [selectedObjectType, setSelectedObjectType] = useState("dance_floor");
  const [objectName, setObjectName] = useState("Ring de Dans");
  const [objectWidth, setObjectWidth] = useState(320);
  const [objectHeight, setObjectHeight] = useState(320);
  const [objectShape, setObjectShape] = useState<"round" | "rectangular">("round");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  // Sync capacity when shape changes
  const handleShapeSelect = (shape: TableShape) => {
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
    setSelectedObjectType(typeVal);
    const preset = objectTypes.find(o => o.value === typeVal);
    if (preset) {
      setObjectName(preset.label);
      setObjectWidth(preset.defaultWidth);
      setObjectHeight(preset.defaultHeight);
      setObjectShape(preset.defaultShape);
    }
  };

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");

    if (activeTab === "tables") {
      formData.set("shape", tableShape);
      formData.set("quantity", String(quantity));
      formData.set("capacity", String(capacity));
    } else {
      formData.set("objectType", selectedObjectType);
      formData.set("name", objectName);
      formData.set("shape", objectShape);
      formData.set("width", String(objectWidth));
      formData.set("height", String(objectHeight));
    }

    const result = await createTable(eventId, formData);
    setPending(false);
    
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
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

        <form action={handleSubmit} className="space-y-5">
          {activeTab === "tables" ? (
            /* Tables Section */
            <>
              {/* Shape Selector */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Forma Mesei</Label>
                <div className="grid grid-cols-4 gap-2">
                  {tableShapes.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleShapeSelect(s.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-xs transition-all",
                        tableShape === s.value
                          ? "border-primary bg-primary/10 text-primary-foreground font-semibold"
                          : "border-slate-100 bg-slate-50 text-muted-foreground hover:bg-slate-100"
                      )}
                    >
                      <s.icon
                        className={cn(
                          "h-5 w-5",
                          tableShape === s.value ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate w-full text-center">{s.label}</span>
                    </button>
                  ))}
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
                  {objectTypes.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => handleObjectTypeSelect(o.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 px-1 text-[11px] rounded-lg transition-all border",
                        selectedObjectType === o.value
                          ? "border-primary/50 bg-white text-primary font-semibold shadow-sm"
                          : "border-transparent text-muted-foreground hover:bg-white/60"
                      )}
                    >
                      <o.icon className="h-4.5 w-4.5" />
                      <span className="truncate w-full text-center">{o.label}</span>
                    </button>
                  ))}
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
                  <Label htmlFor="object-width" className="text-xs text-slate-700">Lățime (px)</Label>
                  <Input
                    id="object-width"
                    type="number"
                    min={40}
                    max={600}
                    value={objectWidth}
                    onChange={(e) => setObjectWidth(parseInt(e.target.value, 10) || 100)}
                    required
                  />
                </div>

                {/* Object Height */}
                <div className="space-y-1">
                  <Label htmlFor="object-height" className="text-xs text-slate-700">Înălțime (px)</Label>
                  <Input
                    id="object-height"
                    type="number"
                    min={40}
                    max={600}
                    value={objectHeight}
                    onChange={(e) => setObjectHeight(parseInt(e.target.value, 10) || 100)}
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
