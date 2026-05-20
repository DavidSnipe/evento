"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useEffect } from "react";
import { Users, X } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

import { assignGuestFromSeating, updateTable } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { AddTableDialog } from "@/components/seating/add-table-dialog";
import { GuestSidebar } from "@/components/seating/guest-sidebar";
import { SeatingToolbar } from "@/components/seating/seating-toolbar";
import { TableDetailPanel } from "@/components/seating/table-detail-panel";
import { TableVisual } from "@/components/seating/table-visual";
import { Button } from "@/components/ui/button";
import type { TableWithGuests } from "@/lib/seating/queries";
import Draggable, { type DraggableData, type DraggableEvent } from "react-draggable";
import { ro } from "@/lib/i18n/ro";

import type { GuestWithTable } from "@/types/guests";

type SeatingPlannerProps = {
  eventId: string;
  tables: TableWithGuests[];
  unassigned: GuestWithTable[];
  allGuests: GuestWithTable[];
};

export function SeatingPlanner({
  eventId,
  tables,
  unassigned,
  allGuests,
}: SeatingPlannerProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [localTables, setLocalTables] = useState(tables);
  const [localAllGuests, setLocalAllGuests] = useState(allGuests);
  const [localUnassigned, setLocalUnassigned] = useState(unassigned);

  // Sync with server state
  useEffect(() => {
    setLocalTables(tables);
    setLocalAllGuests(allGuests);
    setLocalUnassigned(unassigned);
  }, [tables, allGuests, unassigned]);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStage, setShowStage] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState<"guests" | null>(null);
  const [printSort, setPrintSort] = useState<"alpha" | "table">("table");

  const selectedTable = localTables.find((t) => t.id === selectedTableId) ?? null;

  // Calculate stats
  const totalSeated = localAllGuests.filter((g) => g.table_id).length;
  const totalCapacity = localTables.reduce((s, t) => s + t.capacity, 0);

  // Sweetheart tables always first, then by sort_order
  const sortedTables = [...localTables].sort((a, b) => {
    if (a.shape === "sweetheart" && b.shape !== "sweetheart") return -1;
    if (b.shape === "sweetheart" && a.shape !== "sweetheart") return 1;
    return a.sort_order - b.sort_order;
  });

  const _sweetheartTables = sortedTables.filter((t) => t.shape === "sweetheart");
  const _regularTables = sortedTables.filter((t) => t.shape !== "sweetheart");

  // Handle assigning a guest to a table (click guest then click table)
  const handleTableClick = useCallback(
    async (tableId: string, e?: React.DragEvent) => {
      const dropGuestId = e ? e.dataTransfer.getData("guestId") : null;
      const targetGuestId = dropGuestId || selectedGuestId;

      if (targetGuestId) {
        // Optimistic UI Update
        const guest = localAllGuests.find(g => g.id === targetGuestId);
        if (guest) {
          // Remove from unassigned if present
          setLocalUnassigned(prev => prev.filter(g => g.id !== targetGuestId));
          // Update allGuests table_id
          setLocalAllGuests(prev => prev.map(g => g.id === targetGuestId ? { ...g, table_id: tableId } : g));
          // Update tables
          setLocalTables(prev => prev.map(t => {
            if (t.id === guest.table_id) {
              return { ...t, guests: t.guests.filter(g => g.id !== targetGuestId) };
            }
            if (t.id === tableId) {
              return { ...t, guests: [...t.guests, guest] };
            }
            return t;
          }));
        }

        setSelectedGuestId(null);

        // Assign the selected/dropped guest to this table (Server Action)
        const result = await assignGuestFromSeating(
          eventId,
          targetGuestId,
          tableId
        );
        if (result?.error) {
          alert(result.error);
        }
        router.refresh();
      } else {
        // Select/deselect table for detail panel
        setSelectedTableId((prev) => (prev === tableId ? null : tableId));
      }
    },
    [selectedGuestId, eventId, router, localAllGuests]
  );

  const handleTableDragStop = async (tableId: string, e: DraggableEvent, data: DraggableData) => {
    // Save new coordinates to DB
    await updateTable(eventId, tableId, { pos_x: Math.round(data.x), pos_y: Math.round(data.y) });
  };

  // Export functions
  async function exportAsImage(format: "png" | "pdf") {
    if (!canvasRef.current) return;

    const el = canvasRef.current;
    const canvas = await html2canvas(el, {
      backgroundColor: "#faf8f5",
      scale: 2,
      useCORS: true,
    });

    if (format === "png") {
      const link = document.createElement("a");
      link.download = `aranjare-mese-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`aranjare-mese-${Date.now()}.pdf`);
    }
  }

  return (
    <>
      <div className="flex h-[calc(100vh-14rem)] min-h-[500px] gap-4 print:h-auto print:block">
        {/* LEFT: Guest Sidebar — desktop only */}
        <aside className="hidden w-72 shrink-0 lg:block print:hidden">
          <GuestSidebar
            guests={localAllGuests}
            selectedGuestId={selectedGuestId}
            onSelectGuest={setSelectedGuestId}
            className="h-full"
          />
        </aside>

        {/* CENTER: Toolbar + Canvas */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden print:overflow-visible">
          {/* Toolbar */}
          <div className="print:hidden">
            <SeatingToolbar
              eventId={eventId}
              totalSeated={totalSeated}
              totalGuests={localAllGuests.length}
              totalCapacity={totalCapacity}
              showStage={showStage}
              onToggleStage={() => setShowStage((v) => !v)}
              onAddTable={() => setShowAddDialog(true)}
              onExportPng={() => exportAsImage("png")}
              onExportPdf={() => exportAsImage("pdf")}
              printSort={printSort}
              onTogglePrintSort={() => setPrintSort(s => s === "alpha" ? "table" : "alpha")}
            />
          </div>

          {/* Mobile guest toggle */}
          <div className="flex gap-2 lg:hidden print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileSidebar(mobileSidebar === "guests" ? null : "guests")}
              className="gap-2 rounded-xl"
            >
              <Users className="h-4 w-4" />
              {ro.seating.mobile.guests} ({localUnassigned.length})
            </Button>
          </div>

          {/* Mobile guest sidebar slide-over */}
          {mobileSidebar === "guests" && (
            <div className="lg:hidden print:hidden">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSidebar(null)}
                  className="absolute right-2 top-2 z-10"
                >
                  <X className="h-4 w-4" />
                </Button>
                <GuestSidebar
                  guests={localAllGuests}
                  selectedGuestId={selectedGuestId}
                  onSelectGuest={(id) => {
                    setSelectedGuestId(id);
                    setMobileSidebar(null);
                  }}
                  className="max-h-64"
                />
              </div>
            </div>
          )}

          {/* Selected guest indicator */}
          {selectedGuestId && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm print:hidden">
              <span className="font-medium">
                {(() => {
                  const g = localAllGuests.find((g) => g.id === selectedGuestId);
                  return g
                    ? `${g.first_name} ${g.last_name || ""}`.trim()
                    : "";
                })()}
              </span>
              <span className="text-muted-foreground">
                — {ro.seating.unassignedDesc}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGuestId(null)}
                className="ml-auto h-7 rounded-lg text-xs"
              >
                {ro.seating.form.cancel}
              </Button>
            </div>
          )}

          {/* Canvas area */}
          <div className="flex-1 overflow-auto rounded-2xl border border-border/40 bg-white/40 p-6 shadow-inner backdrop-blur-sm relative print:border-none print:shadow-none print:bg-transparent print:p-0 print:overflow-visible">
            <div ref={canvasRef} className="relative min-h-[1200px] min-w-[1200px] print:min-h-0 print:min-w-0 print:w-[1000px] print:h-[1000px] print:mx-auto print:scale-[0.8] print:origin-top">
              {localTables.length === 0 ? (
                /* Empty state */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 print:hidden">
                  <div className="rounded-full bg-primary/10 p-6">
                    <Users className="h-10 w-10 text-primary/60" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold">
                    {ro.seating.empty.title}
                  </h3>
                  <p className="max-w-sm text-center text-muted-foreground">
                    {ro.seating.empty.desc}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="mt-2 rounded-xl"
                  >
                    {ro.seating.empty.cta}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Stage / DJ */}
                  {showStage && <DraggableStage />}

                  {/* Tables */}
                  {sortedTables.map((table) => (
                    <DraggableTable
                      key={table.id}
                      table={table}
                      isSelected={selectedTableId === table.id}
                      isDropTarget={!!selectedGuestId}
                      onClick={() => handleTableClick(table.id)}
                      onDrop={(e) => handleTableClick(table.id, e)}
                      onStop={(e, data) => handleTableDragStop(table.id, e, data)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Table Detail Panel — desktop */}
        {selectedTable && (
          <aside className="hidden w-72 shrink-0 lg:block print:hidden">
            <TableDetailPanel
              table={selectedTable}
              allGuests={localAllGuests}
              eventId={eventId}
              onClose={() => setSelectedTableId(null)}
              className="h-full"
            />
          </aside>
        )}
      </div>

      {/* Mobile table detail (bottom sheet style) */}
      {selectedTable && (
        <div className="lg:hidden print:hidden">
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-auto rounded-t-2xl border-t border-border/60 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
            <TableDetailPanel
              table={selectedTable}
              allGuests={localAllGuests}
              eventId={eventId}
              onClose={() => setSelectedTableId(null)}
            />
          </div>
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setSelectedTableId(null)}
          />
        </div>
      )}

      {/* Add table dialog */}
      <div className="print:hidden">
        <AddTableDialog
          eventId={eventId}
          open={showAddDialog}
          existingTablesCount={localTables.length}
          onClose={() => {
            setShowAddDialog(false);
            router.refresh();
          }}
        />
      </div>

      {/* Print-only list */}
      <div className="hidden print:block mt-8 break-before-page">
        <h2 className="text-2xl font-serif font-bold mb-6 border-b pb-2">Lista Invitați</h2>
        {printSort === "alpha" ? (
          <div className="columns-2 gap-8 text-sm">
            {[...localAllGuests].sort((a, b) => a.first_name.localeCompare(b.first_name)).map(g => (
              <div key={g.id} className="mb-2">
                <span className="font-semibold">{g.first_name} {g.last_name}</span>
                {g.plus_one && <span className="ml-1 text-xs bg-gray-200 px-1 rounded">+1</span>}
                <span className="text-gray-500 float-right">
                  {g.seating_tables?.name ?? "Nerepartizat"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="columns-2 gap-8 text-sm">
            {sortedTables.map(t => (
              <div key={t.id} className="mb-6 break-inside-avoid">
                <h3 className="font-bold text-lg border-b border-gray-300 mb-2">{t.name} <span className="text-gray-500 text-sm font-normal">({t.guests.length} inv.)</span></h3>
                {t.guests.map(g => (
                  <div key={g.id} className="py-1 border-b border-gray-100 flex justify-between">
                    <span>{g.first_name} {g.last_name} {g.plus_one && <span className="ml-1 text-xs bg-gray-200 px-1 rounded">+1</span>}</span>
                  </div>
                ))}
                {t.guests.length === 0 && <span className="text-gray-400 italic">Masa goală</span>}
              </div>
            ))}
            <div className="mb-6 break-inside-avoid">
              <h3 className="font-bold text-lg border-b border-gray-300 mb-2">Nerepartizați <span className="text-gray-500 text-sm font-normal">({localUnassigned.length} inv.)</span></h3>
              {localUnassigned.map(g => (
                <div key={g.id} className="py-1 border-b border-gray-100 flex justify-between">
                  <span>{g.first_name} {g.last_name} {g.plus_one && <span className="ml-1 text-xs bg-gray-200 px-1 rounded">+1</span>}</span>
                </div>
              ))}
              {localUnassigned.length === 0 && <span className="text-gray-400 italic">-</span>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DraggableStage() {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <Draggable nodeRef={nodeRef} bounds="parent">
      <div ref={nodeRef} className="absolute left-1/2 top-4 flex h-16 w-80 -translate-x-1/2 cursor-move items-center justify-center rounded-2xl border-2 border-dashed border-accent/40 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 shadow-sm print:border-black/50 print:bg-gray-100">
        <span className="text-sm font-medium text-accent-foreground/70 print:text-black">
          {ro.seating.stage.label}
        </span>
      </div>
    </Draggable>
  );
}

function DraggableTable({
  table,
  isSelected,
  isDropTarget,
  onClick,
  onDrop,
  onStop,
}: {
  table: TableWithGuests;
  isSelected: boolean;
  isDropTarget: boolean;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onStop: (e: DraggableEvent, data: DraggableData) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={{ x: table.pos_x ?? 0, y: table.pos_y ?? 0 }}
      bounds="parent"
      onStop={onStop}
    >
      <div ref={nodeRef} className="absolute w-max cursor-move">
        <TableVisual
          table={table}
          isSelected={isSelected}
          isDropTarget={isDropTarget}
          onClick={onClick}
          onDrop={onDrop}
        />
      </div>
    </Draggable>
  );
}
