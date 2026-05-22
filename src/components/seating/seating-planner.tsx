"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useEffect } from "react";
import {
  Users,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move
} from "lucide-react";

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
import { parseMetadata } from "@/lib/seating/utils";
import { cn } from "@/lib/utils";

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
  
  // Viewport and Canvas references
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Synchronized local state
  const [localTables, setLocalTables] = useState(tables);
  const [localAllGuests, setLocalAllGuests] = useState(allGuests);
  const [localUnassigned, setLocalUnassigned] = useState(unassigned);

  useEffect(() => {
    setLocalTables(tables);
    setLocalAllGuests(allGuests);
    setLocalUnassigned(unassigned);
  }, [tables, allGuests, unassigned]);

  // Selected states
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState<"guests" | null>(null);
  const [printSort, setPrintSort] = useState<"alpha" | "table">("table");

  // Pan & Zoom states
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [globalLock, setGlobalLock] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // References for dragging/touching coordinates and inertia
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<{ dist: number; scale: number; panX: number; panY: number; centerX: number; centerY: number } | null>(null);
  const lastPositionsRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const inertiaFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (inertiaFrameRef.current !== null) {
        cancelAnimationFrame(inertiaFrameRef.current);
      }
    };
  }, []);

  const selectedTable = localTables.find((t) => t.id === selectedTableId) ?? null;

  // Stats
  const totalSeated = localAllGuests.filter((g) => g.table_id).length;
  const totalCapacity = localTables.reduce((s, t) => {
    const meta = parseMetadata(t.notes);
    return s + (meta.objectType ? 0 : t.capacity);
  }, 0);

  // Sort tables: Sweetheart tables first, then by sort_order
  const sortedTables = [...localTables].sort((a, b) => {
    const metaA = parseMetadata(a.notes);
    const metaB = parseMetadata(b.notes);
    if (metaA.customShape === "sweetheart" && metaB.customShape !== "sweetheart") return -1;
    if (metaB.customShape === "sweetheart" && metaA.customShape !== "sweetheart") return 1;
    return a.sort_order - b.sort_order;
  });

  // Client-side mobile detection
  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 1024px)").matches || "ontouchstart" in window);
  }, []);

  // Listen to Spacebar for panning shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Zoom HUD triggers smooth CSS transition
  const triggerTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleZoomIn = () => {
    triggerTransition();
    setScale(prev => Math.min(prev * 1.25, 3.0));
  };

  const handleZoomOut = () => {
    triggerTransition();
    setScale(prev => Math.max(prev / 1.25, 0.2));
  };

  const centerLayout = () => {
    if (viewportRef.current) {
      triggerTransition();
      const viewportW = viewportRef.current.clientWidth;
      const viewportH = viewportRef.current.clientHeight;
      setScale(1.0);
      setPanX(Math.round(viewportW / 2 - 1500)); // center of 3000px canvas
      setPanY(Math.round(viewportH / 2 - 1200)); // center of 2400px canvas
    }
  };

  const fitAll = () => {
    if (localTables.length === 0) {
      centerLayout();
      return;
    }
    triggerTransition();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    localTables.forEach(t => {
      const x = t.pos_x ?? 0;
      const y = t.pos_y ?? 0;
      const meta = parseMetadata(t.notes);
      
      const width = meta.width || (meta.customShape === "long_banquet" ? 320 : 192);
      const height = meta.height || 160;

      if (x < minX) minX = x;
      if (x + width > maxX) maxX = x + width;
      if (y < minY) minY = y;
      if (y + height > maxY) maxY = y + height;
    });

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const bboxCenterX = minX + bboxW / 2;
    const bboxCenterY = minY + bboxH / 2;

    const viewportW = viewportRef.current?.clientWidth ?? 1000;
    const viewportH = viewportRef.current?.clientHeight ?? 800;

    const scaleX = (viewportW * 0.85) / bboxW;
    const scaleY = (viewportH * 0.85) / bboxH;
    const nextScale = Math.max(0.2, Math.min(Math.min(scaleX, scaleY), 1.5));

    setScale(nextScale);
    setPanX(Math.round(viewportW / 2 - bboxCenterX * nextScale));
    setPanY(Math.round(viewportH / 2 - bboxCenterY * nextScale));
  };

  // Run fitAll once on layout load
  useEffect(() => {
    // Wait for elements to layout on screen
    const timer = setTimeout(() => {
      fitAll();
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.length]);

  // Scroll wheel zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Cancel any ongoing inertia animation on scroll
    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }

    if (e.ctrlKey) {
      // Zoom centered on cursor
      const zoomFactor = 1.05;
      const zoomIntensity = Math.min(Math.max(Math.abs(e.deltaY) / 100, 0.1), 2.0);
      const factor = Math.pow(zoomFactor, e.deltaY < 0 ? zoomIntensity : -zoomIntensity);
      const nextScale = Math.min(Math.max(scale * factor, 0.15), 3.0);

      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setPanX(prev => Math.round(mouseX - (mouseX - prev) * (nextScale / scale)));
        setPanY(prev => Math.round(mouseY - (mouseY - prev) * (nextScale / scale)));
        setScale(nextScale);
      }
    } else {
      // Pan canvas
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      
      setPanX(prev => Math.round(prev - dx));
      setPanY(prev => Math.round(prev - dy));
    }
  };

  // Inertia start calculation
  const startInertia = () => {
    const pos = lastPositionsRef.current;
    if (pos.length < 2) return;
    
    const first = pos[0];
    const last = pos[pos.length - 1];
    const dt = last.t - first.t;
    
    if (dt > 10 && dt < 150) {
      let vx = (last.x - first.x) / dt;
      let vy = (last.y - first.y) / dt;
      
      // Speed check
      const speed = Math.sqrt(vx * vx + vy * vy);
      const maxSpeed = 3.0; // max pixels per ms
      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
      }

      const friction = 0.95;
      let lastTime = performance.now();

      const animate = (time: number) => {
        const delta = time - lastTime;
        lastTime = time;
        const step = Math.min(delta, 30); // clamp frame delta
        
        setPanX(prev => Math.round(prev + vx * step));
        setPanY(prev => Math.round(prev + vy * step));
        
        vx *= Math.pow(friction, step / 16);
        vy *= Math.pow(friction, step / 16);
        
        if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
          inertiaFrameRef.current = requestAnimationFrame(animate);
        } else {
          inertiaFrameRef.current = null;
        }
      };

      inertiaFrameRef.current = requestAnimationFrame(animate);
    }
    lastPositionsRef.current = [];
  };

  // Canvas Mouse events (Panning background)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return; // Left or middle click
    
    if (e.button === 1) {
      e.preventDefault(); // Prevent browser default auto-scroll
    }

    // Check if clicked target is table element or button/input
    const target = e.target as HTMLElement;
    if (target.closest(".draggable-table-wrapper") || target.closest("button") || target.closest("select") || target.closest("input")) {
      return;
    }

    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }

    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panX, y: e.clientY - panY };
    lastPositionsRef.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const nextX = Math.round(e.clientX - panStartRef.current.x);
    const nextY = Math.round(e.clientY - panStartRef.current.y);
    setPanX(nextX);
    setPanY(nextY);

    const now = Date.now();
    const pos = lastPositionsRef.current;
    pos.push({ x: e.clientX, y: e.clientY, t: now });
    if (pos.length > 4) pos.shift();
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      startInertia();
    }
  };

  // Canvas Touch gestures (Multi-touch panning/pinching)
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".draggable-table-wrapper") || target.closest("button") || target.closest("select") || target.closest("input")) {
      return;
    }

    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }

    if (e.touches.length === 1) {
      // Single touch pan
      const touch = e.touches[0];
      setIsPanning(true);
      panStartRef.current = { x: touch.clientX - panX, y: touch.clientY - panY };
      lastPositionsRef.current = [{ x: touch.clientX, y: touch.clientY, t: Date.now() }];
    } else if (e.touches.length === 2) {
      // Pinch to Zoom
      setIsPanning(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      touchStartRef.current = {
        dist,
        scale,
        panX,
        panY,
        centerX,
        centerY
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setPanX(Math.round(touch.clientX - panStartRef.current.x));
      setPanY(Math.round(touch.clientY - panStartRef.current.y));
      
      const now = Date.now();
      const pos = lastPositionsRef.current;
      pos.push({ x: touch.clientX, y: touch.clientY, t: now });
      if (pos.length > 4) pos.shift();
    } else if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const scaleRatio = dist / touchStartRef.current.dist;
      const nextScale = Math.min(Math.max(touchStartRef.current.scale * scaleRatio, 0.2), 3.0);

      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const relativeX = centerX - rect.left;
        const relativeY = centerY - rect.top;

        setPanX(Math.round(relativeX - (relativeX - touchStartRef.current.panX) * (nextScale / touchStartRef.current.scale)));
        setPanY(Math.round(relativeY - (relativeY - touchStartRef.current.panY) * (nextScale / touchStartRef.current.scale)));
        setScale(nextScale);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      startInertia();
    }
    touchStartRef.current = null;
  };

  // Drag-and-drop / Click assignment handler
  const handleTableClick = useCallback(
    async (tableId: string, e?: React.DragEvent) => {
      const dropGuestId = e ? e.dataTransfer.getData("guestId") : null;
      const targetGuestId = dropGuestId || selectedGuestId;

      if (targetGuestId) {
        const guest = localAllGuests.find(g => g.id === targetGuestId);
        if (guest) {
          // Optimistic UI updates
          setLocalUnassigned(prev => prev.filter(g => g.id !== targetGuestId && g.parent_id !== targetGuestId));
          setLocalAllGuests(prev => prev.map(g => {
            if (g.id === targetGuestId || g.parent_id === targetGuestId) {
              return { ...g, table_id: tableId };
            }
            return g;
          }));
          setLocalTables(prev => prev.map(t => {
            const isTarget = t.id === tableId;
            const isSource = t.id === guest.table_id;

            let updatedGuests = t.guests;
            if (isSource) {
              updatedGuests = t.guests.filter(g => g.id !== targetGuestId && g.parent_id !== targetGuestId);
            }
            if (isTarget) {
              const related = localAllGuests.filter(g => g.parent_id === targetGuestId);
              updatedGuests = [...t.guests, guest, ...related];
            }
            return { ...t, guests: updatedGuests };
          }));
        }

        setSelectedGuestId(null);

        // Server action triggers couples / sub-guests assignment sync
        const result = await assignGuestFromSeating(eventId, targetGuestId, tableId);
        if (result?.error) {
          alert(result.error);
          router.refresh();
        }
      } else {
        setSelectedTableId((prev) => (prev === tableId ? null : tableId));
      }
    },
    [selectedGuestId, eventId, router, localAllGuests]
  );

  const handleTableDragStop = async (tableId: string, e: DraggableEvent, data: DraggableData) => {
    const nextX = Math.round(data.x);
    const nextY = Math.round(data.y);

    // Optimistic coordinates update
    setLocalTables(prev => prev.map(t => t.id === tableId ? { ...t, pos_x: nextX, pos_y: nextY } : t));

    const result = await updateTable(eventId, tableId, { pos_x: nextX, pos_y: nextY });
    if (result?.error) {
      alert(result.error);
      router.refresh();
    }
  };

  // High-Resolution Export with Layout Reset (Flicker-Free Clone Method)
  async function exportAsImage(format: "png" | "pdf") {
    if (!canvasRef.current) return;

    const original = canvasRef.current;
    
    // Create an off-screen clone of the canvas
    const clone = original.cloneNode(true) as HTMLDivElement;
    clone.style.transform = "translate(0px, 0px) scale(1)";
    clone.style.transition = "none";
    
    // Wrap it in a hidden container off-screen
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = "3000px";
    container.style.height = "2400px";
    container.style.overflow = "hidden";
    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf")
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jspdfModule.jsPDF;

      // Render clone canvas at 2x resolution
      const canvas = await html2canvas(clone, {
        backgroundColor: "#fafbfe",
        scale: 2,
        useCORS: true,
        logging: false
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
    } catch (e) {
      console.error("Export failure:", e);
    } finally {
      // Clean up off-screen clone container
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  }

  return (
    <>
      <div className="flex h-[calc(100vh-14rem)] min-h-[550px] gap-4 print:h-auto print:block">
        {/* LEFT: Guest Sidebar (desktop) */}
        <aside className="hidden w-76 shrink-0 lg:block print:hidden">
          <GuestSidebar
            guests={localAllGuests}
            selectedGuestId={selectedGuestId}
            onSelectGuest={setSelectedGuestId}
            className="h-full"
          />
        </aside>

        {/* CENTER: Toolbar + Canvas Viewport */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden print:overflow-visible">
          {/* Toolbar */}
          <div className="print:hidden">
            <SeatingToolbar
              eventId={eventId}
              totalSeated={totalSeated}
              totalGuests={localAllGuests.length}
              totalCapacity={totalCapacity}
              onAddTable={() => setShowAddDialog(true)}
              onExportPng={() => exportAsImage("png")}
              onExportPdf={() => exportAsImage("pdf")}
              printSort={printSort}
              onTogglePrintSort={() => setPrintSort(s => s === "alpha" ? "table" : "alpha")}
              globalLock={globalLock}
              onToggleGlobalLock={() => setGlobalLock(!globalLock)}
            />
          </div>

          {/* Mobile guest drawer toggle */}
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

          {/* Mobile guest sidebar drawer */}
          {mobileSidebar === "guests" && (
            <div className="lg:hidden print:hidden">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSidebar(null)}
                  className="absolute right-2 top-2 z-20"
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
                  className="max-h-80"
                />
              </div>
            </div>
          )}

          {/* Selected guest visual floating indicator */}
          {selectedGuestId && (
            <div className="flex items-center gap-2 rounded-xl bg-pink-50 border border-pink-200/50 px-4 py-2.5 text-sm print:hidden animate-bounce">
              <span className="font-semibold text-primary">
                {(() => {
                  const g = localAllGuests.find((g) => g.id === selectedGuestId);
                  return g
                    ? (g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name)
                    : "";
                })()}
              </span>
              <span className="text-muted-foreground text-xs">
                — {ro.seating.unassignedDesc} (Apasă pe o masă pentru repartizare)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGuestId(null)}
                className="ml-auto h-7 rounded-lg text-xs hover:bg-slate-200"
              >
                {ro.seating.form.cancel}
              </Button>
            </div>
          )}

          {/* Canvas Viewport Container */}
          <div
            ref={viewportRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={cn(
              "flex-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-[#f1f5f9]/70 shadow-inner relative print:border-none print:shadow-none print:bg-transparent print:p-0 print:overflow-visible",
              isSpacePressed ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            )}
          >
            {/* The Actual transformed Floor Canvas */}
            <div
              ref={canvasRef}
              className={cn(
                "absolute w-[3000px] h-[2400px] bg-[#fafbfe] shadow-inner canvas-grid origin-top-left",
                isTransitioning && "transition-transform duration-300 ease-out"
              )}
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${scale})`
              }}
            >
              {localTables.length === 0 ? (
                /* Empty state */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 print:hidden">
                  <div className="rounded-full bg-primary/10 p-6">
                    <Users className="h-10 w-10 text-primary/60" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold">
                    {ro.seating.empty.title}
                  </h3>
                  <p className="max-w-sm text-center text-muted-foreground text-sm">
                    {ro.seating.empty.desc}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="mt-2 rounded-xl font-semibold"
                  >
                    {ro.seating.empty.cta}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Tables and Room Objects */}
                  {sortedTables.map((table) => (
                    <DraggableWrapper
                      key={table.id}
                      table={table}
                      scale={scale}
                      globalLock={globalLock}
                      isMobile={isMobile}
                      isSpacePressed={isSpacePressed}
                      isSelected={selectedTableId === table.id}
                      isDropTarget={!!selectedGuestId}
                      onClick={() => handleTableClick(table.id)}
                      onDrop={(e) => handleTableClick(table.id, e)}
                      onStop={handleTableDragStop}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Canvas HUD Controls overlay */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/95 px-3 py-1.5 rounded-2xl shadow-lg border border-slate-100 select-none print:hidden z-30">
              <span className="text-[11px] font-mono font-bold text-slate-500 mr-2 w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 lg:h-8 lg:w-8 rounded-xl lg:rounded-lg text-slate-650 hover:bg-slate-100"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4.5 w-4.5 lg:h-4 lg:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 lg:h-8 lg:w-8 rounded-xl lg:rounded-lg text-slate-650 hover:bg-slate-100"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4.5 w-4.5 lg:h-4 lg:w-4" />
              </Button>
              
              <div className="h-4 w-px bg-slate-200 mx-1" />

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 lg:h-8 lg:w-8 rounded-xl lg:rounded-lg text-slate-650 hover:bg-slate-100"
                onClick={fitAll}
                title="Ajustează pe ecran"
              >
                <Maximize2 className="h-4.5 w-4.5 lg:h-4 lg:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 lg:h-8 lg:w-8 rounded-xl lg:rounded-lg text-slate-650 hover:bg-slate-100"
                onClick={centerLayout}
                title="Centrează schema"
              >
                <Move className="h-4.5 w-4.5 lg:h-4 lg:w-4" />
              </Button>
            </div>

            {/* Spacebar Panning Help overlay */}
            {isSpacePressed && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-xl shadow-lg pointer-events-none select-none animate-in fade-in duration-200">
                <Move className="h-3.5 w-3.5" />
                <span>Trage cu mouse-ul pentru a muta camera</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Table Inspector Panel (desktop) */}
        {selectedTable && (
          <aside className="hidden w-76 shrink-0 lg:block print:hidden">
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

      {/* Mobile Table Inspector bottom sheet drawer */}
      {selectedTable && (
        <div className="lg:hidden print:hidden">
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-auto rounded-t-3xl border-t border-border bg-white/95 p-4 shadow-2xl backdrop-blur-md">
            <TableDetailPanel
              table={selectedTable}
              allGuests={localAllGuests}
              eventId={eventId}
              onClose={() => setSelectedTableId(null)}
            />
          </div>
          <div
            className="fixed inset-0 z-35 bg-black/30 backdrop-blur-xs"
            onClick={() => setSelectedTableId(null)}
          />
        </div>
      )}

      {/* Add Table & Room Objects Dialog */}
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

      {/* High-fidelity layout print listings */}
      <div className="hidden print:block mt-8 break-before-page">
        <h2 className="text-2xl font-serif font-bold mb-6 border-b pb-2">Aranjarea Salii & Lista Invitați</h2>
        {printSort === "alpha" ? (
          <div className="columns-2 gap-8 text-sm">
            {[...localAllGuests].sort((a, b) => {
              const nameA = `${a.last_name || ""} ${a.first_name}`.trim();
              const nameB = `${b.last_name || ""} ${b.first_name}`.trim();
              return nameA.localeCompare(nameB);
            }).map(g => (
              <div key={g.id} className="mb-2">
                <span className="font-semibold">{g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name}</span>
                {g.plus_one && <span className="ml-1 text-xs bg-slate-100 border px-1 rounded">+1</span>}
                <span className="text-gray-500 float-right">
                  {g.seating_tables?.name ?? "Nerepartizat"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="columns-2 gap-8 text-sm">
            {sortedTables.map(t => {
              const meta = parseMetadata(t.notes);
              if (meta.objectType) return null; // skip print objects
              return (
                <div key={t.id} className="mb-6 break-inside-avoid">
                  <h3 className="font-bold text-lg border-b border-gray-300 mb-2">{t.name} <span className="text-gray-500 text-sm font-normal">({t.guests.length} inv.)</span></h3>
                  {t.guests.map(g => (
                    <div key={g.id} className="py-1 border-b border-gray-100 flex justify-between">
                      <span>{g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name} {g.plus_one && <span className="ml-1 text-xs bg-slate-100 border px-1 rounded">+1</span>}</span>
                    </div>
                  ))}
                  {t.guests.length === 0 && <span className="text-gray-400 italic">Masa goală</span>}
                </div>
              );
            })}
            <div className="mb-6 break-inside-avoid">
              <h3 className="font-bold text-lg border-b border-gray-300 mb-2">Nerepartizați <span className="text-gray-500 text-sm font-normal">({localUnassigned.length} inv.)</span></h3>
              {localUnassigned.map(g => (
                <div key={g.id} className="py-1 border-b border-gray-100 flex justify-between">
                  <span>{g.last_name ? `${g.last_name} ${g.first_name}` : g.first_name} {g.plus_one && <span className="ml-1 text-xs bg-slate-100 border px-1 rounded">+1</span>}</span>
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

type DraggableWrapperProps = {
  table: TableWithGuests;
  scale: number;
  globalLock: boolean;
  isMobile: boolean;
  isSpacePressed: boolean;
  isSelected: boolean;
  isDropTarget: boolean;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onStop: (tableId: string, e: DraggableEvent, data: DraggableData) => void;
};

// Extracted Draggable table component to encapsulate drag-displacement logic
function DraggableWrapper({
  table,
  scale,
  globalLock,
  isMobile,
  isSpacePressed,
  isSelected,
  isDropTarget,
  onClick,
  onDrop,
  onStop,
}: DraggableWrapperProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const metadata = parseMetadata(table.notes);
  const isTableLocked = metadata.isLocked === true;
  
  // Disable dragging if table or layout is locked, or if space bar panning is active
  const isDragDisabled = isTableLocked || globalLock || isSpacePressed;

  const dragStartPos = useRef({ x: 0, y: 0 });
  const [dragged, setDragged] = useState(false);

  const handleStart = (e: DraggableEvent, data: DraggableData) => {
    dragStartPos.current = { x: data.x, y: data.y };
    setDragged(false);
  };

  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    const dx = data.x - dragStartPos.current.x;
    const dy = data.y - dragStartPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const threshold = isMobile ? 8 : 4;
    if (dist > threshold) {
      setDragged(true);
    }
  };

  const handleDragStop = (e: DraggableEvent, data: DraggableData) => {
    const dx = data.x - dragStartPos.current.x;
    const dy = data.y - dragStartPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const threshold = isMobile ? 8 : 4;
    
    // Only update position if actual drag displacement exceeded threshold
    if (dist > threshold) {
      onStop(table.id, e, data);
    }
  };

  const handleWrapperClick = (e: React.MouseEvent) => {
    // If it was dragged, ignore click event to avoid opening details panel
    if (dragged) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Otherwise, trigger details panel open
    onClick();
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      scale={scale}
      disabled={isDragDisabled}
      defaultPosition={{ x: table.pos_x ?? 0, y: table.pos_y ?? 0 }}
      bounds={{ left: 0, top: 0, right: 3000 - 150, bottom: 2400 - 150 }} // canvas boundary clamping
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
    >
      <div
        ref={nodeRef}
        onClick={handleWrapperClick}
        className={cn(
          "absolute draggable-table-wrapper select-none",
          isDragDisabled ? "cursor-default" : "cursor-move"
        )}
      >
        <TableVisual
          table={table}
          isSelected={isSelected}
          isDropTarget={isDropTarget}
          onClick={() => {}} // Handled via wrapper onClick
          onDrop={onDrop}
        />
      </div>
    </Draggable>
  );
}
