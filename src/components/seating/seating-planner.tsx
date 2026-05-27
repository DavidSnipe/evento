"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Sparkles,
  ChevronLeft,
  Check,
  Maximize,
  Minimize
} from "lucide-react";

import {
  assignGuestFromSeating,
  unassignGuest,
  updateTable,
  autoSeatGuestsAction,
  initializeConcentricOnboarding,
  applyRoomTemplate,
  type TableFormState
} from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { AddTableDialog } from "@/components/seating/add-table-dialog";
import { GuestSidebar } from "@/components/seating/guest-sidebar";
import { SeatingToolbar } from "@/components/seating/seating-toolbar";
import { TableAssignView } from "@/components/seating/table-assign-view";
import { TableDetailPanel } from "@/components/seating/table-detail-panel";
import { TableVisual } from "@/components/seating/table-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TableWithGuests } from "@/lib/seating/queries";
import Draggable, { type DraggableData, type DraggableEvent } from "react-draggable";
import { ro } from "@/lib/i18n/ro";
import { parseMetadata } from "@/lib/seating/utils";
import { cn } from "@/lib/utils";

import type { GuestWithTable } from "@/types/guests";

/**
 * Canvas zoom — relative to `base = min(viewportW/3000, viewportH/2400)`.
 * Tables are already drawn at VISUAL_SCALE 1.5 on the 3000×2400 canvas, so fit
 * only needs a modest bump over full-canvas fit (Figma uses ~0.94× base).
 * Old multipliers (3.88 / 5.0) forced min zoom ~140% and blocked room overview.
 */
const CANVAS_FIT_MULTIPLIER = 1.45;
const CANVAS_MIN_MULTIPLIER = 0.82;
const CANVAS_MAX_SCALE = 2.0;
const FIGMA_GUEST_SIDEBAR_WIDTH = 286;

function canTableAccommodateGuest(
  table: TableWithGuests,
  guestId: string,
  allGuests: GuestWithTable[]
): { allowed: boolean; reason?: string } {
  const metadata = parseMetadata(table.notes);
  if (metadata.objectType) {
    return { allowed: false, reason: "Acesta este un obiect decorativ, nu o masă." };
  }
  if (metadata.isLocked) {
    return { allowed: false, reason: "Masa este blocată." };
  }
  const guest = allGuests.find((g) => g.id === guestId);
  if (!guest) return { allowed: false, reason: "Invitatul nu a fost găsit." };

  // If already at this table, allow it
  if (guest.table_id === table.id) {
    return { allowed: true };
  }

  const subGuests = allGuests.filter((g) => g.parent_id === guestId);
  const movingGuests = [guest, ...subGuests];
  const movingGuestIds = movingGuests.map((g) => g.id);

  const currentTableGuests = table.guests.filter((g) => !movingGuestIds.includes(g.id));
  
  // Deduplicate guests to prevent duplicate occupant counting issues
  const uniqueGuestsMap = new Map<string, GuestWithTable>();
  for (const g of [...currentTableGuests, ...movingGuests]) {
    uniqueGuestsMap.set(g.id, g);
  }
  const finalGuests = Array.from(uniqueGuestsMap.values());

  let occupied = 0;
  for (const g of finalGuests) {
    occupied += 1;
    if (!g.parent_id && g.plus_one) {
      const hasCoupleRow = finalGuests.some(
        (sub) => sub.parent_id === g.id && sub.relationship_type === "couple"
      );
      if (!hasCoupleRow) occupied += 1;
    }
  }

  if (occupied > table.capacity) {
    return {
      allowed: false,
      reason: `Masa este plină! (Locuri: ${occupied}/${table.capacity})`,
    };
  }

  return { allowed: true };
}

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
  const [localTables, setLocalTables] = useState<(TableWithGuests & { renderKey: string })[]>(() =>
    tables.map(t => ({ ...t, renderKey: t.id }))
  );
  const [localAllGuests, setLocalAllGuests] = useState(allGuests);
  const [localUnassigned, setLocalUnassigned] = useState(unassigned);

  useEffect(() => {
    setLocalTables(prev => tables.map(t => {
      const existing = prev.find(lt => lt.id === t.id);
      return { ...t, renderKey: existing?.renderKey ?? t.id };
    }));
    setLocalAllGuests(allGuests);
    setLocalUnassigned(unassigned);
  }, [tables, allGuests, unassigned]);

  // Selected states
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState<"guests" | null>(null);
  const [printSort, setPrintSort] = useState<"alpha" | "table">("table");
  const [viewMode, setViewMode] = useState<"canvas" | "list">("canvas");

  // Lifted templates browser state
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({
    ballroom: 8,
    barn: 8,
    garden: 8,
    restaurant: 8,
    long_hall: 8,
  });
  const [selectedVibe, setSelectedVibe] = useState<"all" | "elegant" | "rustic" | "modern">("all");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function handleApplyTemplate(
    type: "ballroom" | "barn" | "garden" | "restaurant" | "long_hall",
    count: number
  ) {
    if (!confirm("Sigur doriți să ștergeți așezarea curentă și să aplicați acest șablon? Toți invitații vor fi nerepartizați.")) {
      return;
    }
    setApplyingTemplate(true);
    setShowTemplateMenu(false);
    const result = await applyRoomTemplate(eventId, type, count);
    setApplyingTemplate(false);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "A apărut o eroare la aplicarea șablonului.");
    }
  }

  // Immersive Focus Mode states
  const [workspaceMode, setWorkspaceMode] = useState(false);
  const [guestSidebarWidth, setGuestSidebarWidth] = useState(FIGMA_GUEST_SIDEBAR_WIDTH);
  const [guestSidebarCollapsed, setGuestSidebarCollapsed] = useState(false);

  // Smart Onboarding states
  const [onboardingSeats, setOnboardingSeats] = useState(10);
  const [initializingOnboarding, setInitializingOnboarding] = useState(false);

  // Pan & Zoom states
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const activePanPointerIdRef = useRef<number | null>(null);
  /** Bumps once per frame when camera moves — keeps LOD/draggable in sync with DOM transform */
  const [cameraRevision, setCameraRevision] = useState(0);
  const cameraNotifyScheduledRef = useRef(false);
  const [globalLock, setGlobalLock] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Zoom & Pan target refs for smooth interpolation
  const targetScaleRef = useRef(1.0);
  const targetPanXRef = useRef(0);
  const targetPanYRef = useRef(0);
  const zoomAnimationRef = useRef<number | null>(null);

  // Zoom & Pan active current refs for high-performance direct DOM manipulation
  const scaleRef = useRef(1.0);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  // Viewport dimensions ref (no React state — avoids re-renders that reset camera transform)
  const viewportDimRef = useRef({ width: 1000, height: 800 });

  const getViewportScaleLimits = useCallback(() => {
    const W = viewportRef.current?.clientWidth ?? viewportDimRef.current.width;
    const H = viewportRef.current?.clientHeight ?? viewportDimRef.current.height;
    const base = Math.min(W / 3000, H / 2400);
    const minScale = base * CANVAS_MIN_MULTIPLIER;
    const fitScale = base * CANVAS_FIT_MULTIPLIER;
    const maxScale = Math.max(CANVAS_MAX_SCALE, fitScale * 1.05);
    return { minScale, fitScale, maxScale, W, H };
  }, []);

  // DOM element refs for direct stylesheet manipulation
  const miniMapBoxRef = useRef<HTMLDivElement>(null);
  const zoomPercentTextRef = useRef<HTMLSpanElement>(null);

  // Initialize camera refs + DOM transform once mounted (transform is not driven by React style)
  useEffect(() => {
    targetScaleRef.current = scale;
    targetPanXRef.current = panX;
    targetPanYRef.current = panY;
    scaleRef.current = scale;
    panXRef.current = panX;
    panYRef.current = panY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleCameraNotify = () => {
    if (cameraNotifyScheduledRef.current) return;
    cameraNotifyScheduledRef.current = true;
    requestAnimationFrame(() => {
      cameraNotifyScheduledRef.current = false;
      setCameraRevision((n) => n + 1);
    });
  };

  // Direct DOM transforms bypassing React render updates for 60 FPS performance
  const updateCanvasDOM = (x: number, y: number, s: number) => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
    }
    if (miniMapBoxRef.current) {
      const W = viewportDimRef.current.width;
      const H = viewportDimRef.current.height;
      const bx = -x / s;
      const by = -y / s;
      const bw = W / s;
      const bh = H / s;

      miniMapBoxRef.current.style.left = `${(bx / 3000) * 100}%`;
      miniMapBoxRef.current.style.top = `${(by / 2400) * 100}%`;
      miniMapBoxRef.current.style.width = `${(bw / 3000) * 100}%`;
      miniMapBoxRef.current.style.height = `${(bh / 2400) * 100}%`;
    }
    if (zoomPercentTextRef.current) {
      zoomPercentTextRef.current.innerText = `${Math.round(s * 100)}%`;
    }
    scheduleCameraNotify();
  };

  useEffect(() => {
    updateCanvasDOM(panXRef.current, panYRef.current, scaleRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Strict boundary clamping so layout/canvas NEVER leaves the viewport
  const constrainPosition = (x: number, y: number, currentScale: number) => {
    const W = viewportRef.current?.clientWidth ?? 1000;
    const H = viewportRef.current?.clientHeight ?? 800;

    const canvasW = 3000 * currentScale;
    const canvasH = 2400 * currentScale;

    let minX = 0;
    let maxX = 0;
    if (canvasW > W) {
      minX = W - canvasW;
      maxX = 0;
    } else {
      // Centered if canvas fits screen
      minX = (W - canvasW) / 2;
      maxX = minX;
    }

    const topPadding = workspaceMode ? 140 : 40;
    const bottomPadding = 100;

    let minY = 0;
    let maxY = 0;
    if (canvasH > H) {
      minY = H - canvasH - bottomPadding;
      maxY = topPadding;
    } else {
      // Centered if canvas fits screen, but with pan nudge allowance
      const centerY = (H - canvasH) / 2;
      minY = centerY - bottomPadding;
      maxY = centerY + topPadding;
    }

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  };

  // Edge resistance clamping (elastic pull past edges - restrained to a subtle 15% factor)
  const constrainPositionWithResistance = (x: number, y: number, currentScale: number) => {
    const W = viewportRef.current?.clientWidth ?? 1000;
    const H = viewportRef.current?.clientHeight ?? 800;

    const canvasW = 3000 * currentScale;
    const canvasH = 2400 * currentScale;

    let minX = 0;
    let maxX = 0;
    if (canvasW > W) {
      minX = W - canvasW;
      maxX = 0;
    } else {
      minX = (W - canvasW) / 2;
      maxX = minX;
    }

    const topPadding = workspaceMode ? 140 : 40;
    const bottomPadding = 100;

    let minY = 0;
    let maxY = 0;
    if (canvasH > H) {
      minY = H - canvasH - bottomPadding;
      maxY = topPadding;
    } else {
      const centerY = (H - canvasH) / 2;
      minY = centerY - bottomPadding;
      maxY = centerY + topPadding;
    }

    let rx = x;
    let ry = y;

    // Apply restrained 15% edge resistance
    if (x > maxX) {
      rx = maxX + (x - maxX) * 0.15;
    } else if (x < minX) {
      rx = minX - (minX - x) * 0.15;
    }

    if (y > maxY) {
      ry = maxY + (y - maxY) * 0.15;
    } else if (y < minY) {
      ry = minY - (minY - y) * 0.15;
    }

    return { x: rx, y: ry };
  };

  // Smooth camera zoom/pan interpolation with zero per-frame React rerenders
  const animateZoom = () => {
    const lerp = (start: number, end: number, amt: number) => {
      return (1 - amt) * start + amt * end;
    };

    const step = () => {
      let isDone = true;
      
      const currentScale = scaleRef.current;
      const targetScale = targetScaleRef.current;
      let nextScale = currentScale;
      if (Math.abs(currentScale - targetScale) > 0.0005) {
        isDone = false;
        nextScale = lerp(currentScale, targetScale, 0.25);
      } else {
        nextScale = targetScale;
      }
      scaleRef.current = nextScale;

      const currentPanX = panXRef.current;
      const targetPanX = targetPanXRef.current;
      let nextPanX = currentPanX;
      if (Math.abs(currentPanX - targetPanX) > 0.2) {
        isDone = false;
        nextPanX = Math.round(lerp(currentPanX, targetPanX, 0.25));
      } else {
        nextPanX = targetPanX;
      }
      panXRef.current = nextPanX;

      const currentPanY = panYRef.current;
      const targetPanY = targetPanYRef.current;
      let nextPanY = currentPanY;
      if (Math.abs(currentPanY - targetPanY) > 0.2) {
        isDone = false;
        nextPanY = Math.round(lerp(currentPanY, targetPanY, 0.25));
      } else {
        nextPanY = targetPanY;
      }
      panYRef.current = nextPanY;

      // Update style directly in DOM (no React state updates during animation!)
      updateCanvasDOM(nextPanX, nextPanY, nextScale);

      if (!isDone) {
        zoomAnimationRef.current = requestAnimationFrame(step);
      } else {
        // Deferred sync to React state only when settles
        setScale(nextScale);
        setPanX(nextPanX);
        setPanY(nextPanY);
        zoomAnimationRef.current = null;
      }
    };

    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
    }
    zoomAnimationRef.current = requestAnimationFrame(step);
  };

  // Toggle workspace-mode-active class on body for CSS selectors
  useEffect(() => {
    document.body.classList.toggle("workspace-mode-active", workspaceMode);
    
    // Smooth camera adjust once layout settled
    const timer = setTimeout(() => {
      if (viewportRef.current) {
        viewportDimRef.current = {
          width: viewportRef.current.clientWidth,
          height: viewportRef.current.clientHeight,
        };
        fitAll();
      }
    }, 350); // wait for focus mode CSS transitions to finish

    return () => {
      document.body.classList.remove("workspace-mode-active");
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceMode]);

  // Sidebar drag resizing pointer handlers
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      const parent = e.currentTarget.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const newWidth = Math.min(480, Math.max(240, e.clientX - rect.left));
        setGuestSidebarWidth(newWidth);
      }
    }
  };

  const handleResizeStop = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Concentric Onboarding trigger
  const handleRunOnboarding = async () => {
    setInitializingOnboarding(true);
    const result = await initializeConcentricOnboarding(eventId, onboardingSeats);
    setInitializingOnboarding(false);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "A apărut o eroare la configurarea inițială.");
    }
  };

  // Auto-Seating animation state
  const [autoSeatingProgress, setAutoSeatingProgress] = useState<{ current: number; total: number; strategy: "family" | "even" } | null>(null);
  const [autoSeatingSummary, setAutoSeatingSummary] = useState<{ seatedCount: number; tablesCount: number } | null>(null);
  const skipAnimationRef = useRef(false);

  // Mini-map drag state
  const [isMiniMapDragging, setIsMiniMapDragging] = useState(false);

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

  // Viewport resize observer — ref + DOM only (no setState during pan/zoom)
  useEffect(() => {
    if (!viewportRef.current) return;
    const updateDimensions = () => {
      if (!viewportRef.current) return;
      viewportDimRef.current = {
        width: viewportRef.current.clientWidth,
        height: viewportRef.current.clientHeight,
      };
      updateCanvasDOM(panXRef.current, panYRef.current, scaleRef.current);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(viewportRef.current);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Listen to Spacebar for panning shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
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

  const handleZoomIn = () => {
    if (viewportRef.current) {
      const W = viewportRef.current.clientWidth;
      const H = viewportRef.current.clientHeight;
      const centerX = W / 2;
      const centerY = H / 2;

      const currentScale = targetScaleRef.current;
      const { maxScale } = getViewportScaleLimits();
      const nextScaleTarget = Math.min(currentScale * 1.25, maxScale);

      const nextPanXTarget = Math.round(centerX - (centerX - targetPanXRef.current) * (nextScaleTarget / currentScale));
      const nextPanYTarget = Math.round(centerY - (centerY - targetPanYRef.current) * (nextScaleTarget / currentScale));

      const constrained = constrainPosition(nextPanXTarget, nextPanYTarget, nextScaleTarget);

      targetScaleRef.current = nextScaleTarget;
      targetPanXRef.current = constrained.x;
      targetPanYRef.current = constrained.y;

      animateZoom();
    }
  };

  const handleZoomOut = () => {
    if (viewportRef.current) {
      const W = viewportRef.current.clientWidth;
      const H = viewportRef.current.clientHeight;
      const centerX = W / 2;
      const centerY = H / 2;

      const { minScale } = getViewportScaleLimits();
      const currentScale = targetScaleRef.current;
      const nextScaleTarget = Math.max(currentScale / 1.25, minScale);

      const nextPanXTarget = Math.round(centerX - (centerX - targetPanXRef.current) * (nextScaleTarget / currentScale));
      const nextPanYTarget = Math.round(centerY - (centerY - targetPanYRef.current) * (nextScaleTarget / currentScale));

      const constrained = constrainPosition(nextPanXTarget, nextPanYTarget, nextScaleTarget);

      targetScaleRef.current = nextScaleTarget;
      targetPanXRef.current = constrained.x;
      targetPanYRef.current = constrained.y;

      animateZoom();
    }
  };

  const fitAll = () => {
    if (viewportRef.current) {
      const W = viewportRef.current.clientWidth;
      const H = viewportRef.current.clientHeight;
      
      const { fitScale, maxScale } = getViewportScaleLimits();
      const targetScale = Math.min(fitScale, maxScale);
      const targetX = Math.round((W - 3000 * targetScale) / 2);
      const targetY = Math.round((H - 2400 * targetScale) / 2);

      targetScaleRef.current = targetScale;
      targetPanXRef.current = targetX;
      targetPanYRef.current = targetY;

      animateZoom();
    }
  };

  const centerLayout = () => {
    fitAll();
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

  const handleRunAutoSeat = async (strategy: "family" | "even") => {
    skipAnimationRef.current = false;
    setAutoSeatingSummary(null);
    
    // Initialize temporary UI progress
    setAutoSeatingProgress({
      current: 0,
      total: 100,
      strategy
    });

    const result = await autoSeatGuestsAction(eventId, strategy);
    
    if (!result.success || !result.updates || result.updates.length === 0) {
      setAutoSeatingProgress(null);
      if (result.error) {
        alert(result.error);
      }
      return;
    }

    const updates = result.updates;
    const L = updates.length;

    // Batching to prevent React rerendering lag
    const batchSize = Math.max(1, Math.ceil(L / 50));
    const totalSteps = Math.ceil(L / batchSize);
    const delay = Math.max(20, Math.min(100, 2000 / totalSteps));

    const applyBatch = (batch: { id: string; table_id: string }[]) => {
      const batchGuestIds = new Set(batch.map(u => u.id));
      
      setLocalAllGuests(prev => prev.map(g => {
        const match = batch.find(u => u.id === g.id);
        return match ? { ...g, table_id: match.table_id } : g;
      }));

      setLocalUnassigned(prev => prev.filter(g => !batchGuestIds.has(g.id)));

      setLocalTables(prev => prev.map(t => {
        const tableUpdates = batch.filter(u => u.table_id === t.id);
        if (tableUpdates.length === 0) return t;

        const newGuests = tableUpdates.map(u => allGuests.find(g => g.id === u.id)).filter(Boolean) as GuestWithTable[];
        const existingIds = new Set(t.guests.map(g => g.id));
        const toAdd = newGuests.filter(g => !existingIds.has(g.id));

        return {
          ...t,
          guests: [...t.guests, ...toAdd]
        };
      }));
    };

    let currentStep = 0;

    const runStep = () => {
      if (skipAnimationRef.current) {
        // Apply remaining updates immediately
        const remainingUpdates = updates.slice(currentStep * batchSize);
        applyBatch(remainingUpdates);

        // Force complete final states
        setLocalAllGuests(prev => prev.map(g => {
          const match = updates.find(u => u.id === g.id);
          return match ? { ...g, table_id: match.table_id } : g;
        }));
        setLocalUnassigned(prev => prev.filter(g => !updates.some(u => u.id === g.id)));
        setLocalTables(prev => prev.map(t => {
          const tableUpdates = updates.filter(u => u.table_id === t.id);
          if (tableUpdates.length === 0) return t;
          const newGuests = tableUpdates.map(u => allGuests.find(g => g.id === u.id)).filter(Boolean) as GuestWithTable[];
          const existingIds = new Set(t.guests.map(g => g.id));
          const toAdd = newGuests.filter(g => !existingIds.has(g.id));
          return {
            ...t,
            guests: [...t.guests, ...toAdd]
          };
        }));

        setAutoSeatingProgress(null);
        setAutoSeatingSummary({
          seatedCount: updates.length,
          tablesCount: Array.from(new Set(updates.map(u => u.table_id))).length
        });
        router.refresh();
        return;
      }

      const startIdx = currentStep * batchSize;
      const endIdx = Math.min(startIdx + batchSize, L);
      const batch = updates.slice(startIdx, endIdx);

      applyBatch(batch);
      currentStep++;

      setAutoSeatingProgress({
        current: Math.min(endIdx, L),
        total: L,
        strategy
      });

      if (endIdx < L) {
        setTimeout(runStep, delay);
      } else {
        setAutoSeatingProgress(null);
        setAutoSeatingSummary({
          seatedCount: updates.length,
          tablesCount: Array.from(new Set(updates.map(u => u.table_id))).length
        });
        router.refresh();
      }
    };

    runStep();
  };

  const updatePanFromMiniMap = (clientX: number, clientY: number, currentTarget: HTMLElement) => {
    if (!viewportRef.current) return;
    const rect = currentTarget.getBoundingClientRect();
    const mx = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const my = Math.max(0, Math.min(rect.height, clientY - rect.top));
    
    const cx = (mx / rect.width) * 3000;
    const cy = (my / rect.height) * 2400;
    
    const VW = viewportRef.current.clientWidth;
    const VH = viewportRef.current.clientHeight;
    
    const nextPanX = Math.round(VW / 2 - cx * scaleRef.current);
    const nextPanY = Math.round(VH / 2 - cy * scaleRef.current);

    const constrained = constrainPosition(nextPanX, nextPanY, scaleRef.current);
    
    panXRef.current = constrained.x;
    panYRef.current = constrained.y;
    updateCanvasDOM(constrained.x, constrained.y, scaleRef.current);
  };

  const handleMiniMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsMiniMapDragging(true);
    updatePanFromMiniMap(e.clientX, e.clientY, e.currentTarget);
  };

  const handleMiniMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMiniMapDragging) return;
    e.preventDefault();
    e.stopPropagation();
    updatePanFromMiniMap(e.clientX, e.clientY, e.currentTarget);
  };

  const handleMiniMapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMiniMapDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      setIsMiniMapDragging(false);
      
      // Sync final position to state
      setScale(scaleRef.current);
      setPanX(panXRef.current);
      setPanY(panYRef.current);
    }
  };

  const handleAddOptimistic = (
    tempTables: TableWithGuests[],
    promise: Promise<TableFormState>
  ) => {
    // Set renderKeys for temps
    const tempsWithKeys = tempTables.map(t => ({ ...t, renderKey: t.id }));
    setLocalTables(prev => [...prev, ...tempsWithKeys]);
    setShowAddDialog(false);

    promise.then((result) => {
      if (result.error) {
        alert(result.error);
        // Rollback
        setLocalTables(prev => prev.filter(t => !tempTables.some(temp => temp.id === t.id)));
      } else if (result.tables && result.tables.length > 0) {
        // Swap temp ids with real DB rows, keeping renderKey stable
        setLocalTables(prev => {
          return prev.map(t => {
            const idx = tempTables.findIndex(temp => temp.id === t.id);
            if (idx !== -1 && result.tables![idx]) {
              const realTable = result.tables![idx] as TableWithGuests;
              return {
                ...realTable,
                renderKey: t.renderKey,
                guests: t.guests
              };
            }
            return t;
          });
        });
      }
      router.refresh();
    }).catch((err) => {
      console.error("Failed to insert tables:", err);
      // Rollback
      setLocalTables(prev => prev.filter(t => !tempTables.some(temp => temp.id === t.id)));
      router.refresh();
    });
  };

  // Scroll wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    // Cancel any ongoing inertia animation on scroll
    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }

    if (viewportRef.current) {
      // Zoom centered on cursor
      const zoomFactor = 1.08;
      const zoomIntensity = Math.min(Math.max(Math.abs(e.deltaY) / 120, 0.05), 1.2);
      const factor = Math.pow(zoomFactor, e.deltaY < 0 ? zoomIntensity : -zoomIntensity);
      
      const rect = viewportRef.current.getBoundingClientRect();
      const base = Math.min(rect.width / 3000, rect.height / 2400);
      const minScale = base * CANVAS_MIN_MULTIPLIER;
      const maxScale = Math.max(CANVAS_MAX_SCALE, base * CANVAS_FIT_MULTIPLIER * 1.05);

      const currentScale = targetScaleRef.current;
      const nextScale = Math.min(Math.max(currentScale * factor, minScale), maxScale);

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentPanX = targetPanXRef.current;
      const currentPanY = targetPanYRef.current;

      const nextPanX = Math.round(mouseX - (mouseX - currentPanX) * (nextScale / currentScale));
      const nextPanY = Math.round(mouseY - (mouseY - currentPanY) * (nextScale / currentScale));

      const constrained = constrainPosition(nextPanX, nextPanY, nextScale);

      targetScaleRef.current = nextScale;
      targetPanXRef.current = constrained.x;
      targetPanYRef.current = constrained.y;

      animateZoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register non-passive wheel event listener to block browser scrolling
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheelEvent = (e: WheelEvent) => {
      handleWheel(e);
    };

    viewport.addEventListener("wheel", onWheelEvent, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheelEvent);
    };
  }, [handleWheel]);

  // Double click viewport to reset zoom/pan to fit layout
  const handleDoubleClickCanvas = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".draggable-table-wrapper") ||
      target.closest("button") ||
      target.closest("select") ||
      target.closest("input")
    ) {
      return;
    }
    e.preventDefault();
    fitAll();
  };

  // Inertia start calculation
  const startInertia = () => {
    const pos = lastPositionsRef.current;
    if (pos.length < 2) {
      // Sync state immediately if no inertia
      setScale(scaleRef.current);
      setPanX(panXRef.current);
      setPanY(panYRef.current);
      return;
    }
    
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
        
        const nextX = panXRef.current + vx * step;
        const nextY = panYRef.current + vy * step;
        
        // Constrain to standard hard boundaries
        const constrained = constrainPosition(nextX, nextY, scaleRef.current);
        
        // If we hit boundaries, stop velocity in that direction
        if (constrained.x !== nextX) vx = 0;
        if (constrained.y !== nextY) vy = 0;
        
        panXRef.current = constrained.x;
        panYRef.current = constrained.y;
        
        updateCanvasDOM(constrained.x, constrained.y, scaleRef.current);
        
        vx *= Math.pow(friction, step / 16);
        vy *= Math.pow(friction, step / 16);
        
        if ((Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) && (vx !== 0 || vy !== 0)) {
          inertiaFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Sync state when inertia completes
          setScale(scaleRef.current);
          setPanX(panXRef.current);
          setPanY(panYRef.current);
          inertiaFrameRef.current = null;
        }
      };

      inertiaFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Sync state immediately if no inertia
      setScale(scaleRef.current);
      setPanX(panXRef.current);
      setPanY(panYRef.current);
    }
    lastPositionsRef.current = [];
  };

  const applyPanPointerMove = (clientX: number, clientY: number) => {
    const nextX = Math.round(clientX - panStartRef.current.x);
    const nextY = Math.round(clientY - panStartRef.current.y);
    const res = constrainPositionWithResistance(nextX, nextY, scaleRef.current);
    panXRef.current = res.x;
    panYRef.current = res.y;
    updateCanvasDOM(res.x, res.y, scaleRef.current);

    const now = Date.now();
    const pos = lastPositionsRef.current;
    pos.push({ x: clientX, y: clientY, t: now });
    if (pos.length > 4) pos.shift();
  };

  const finishPanGesture = () => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    activePanPointerIdRef.current = null;
    setIsPanning(false);

    const hardConstrained = constrainPosition(panXRef.current, panYRef.current, scaleRef.current);
    if (hardConstrained.x !== panXRef.current || hardConstrained.y !== panYRef.current) {
      targetScaleRef.current = scaleRef.current;
      targetPanXRef.current = hardConstrained.x;
      targetPanYRef.current = hardConstrained.y;
      animateZoom();
    } else {
      startInertia();
    }
  };

  const beginPanPointer = (e: React.PointerEvent) => {
    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }

    isPanningRef.current = true;
    activePanPointerIdRef.current = e.pointerId;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panXRef.current, y: e.clientY - panYRef.current };
    lastPositionsRef.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];

    try {
      viewportRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignored
    }
  };

  // Space / middle-click pan over tables (capture, before react-draggable)
  const handlePointerDownCapture = (e: React.PointerEvent) => {
    const forcePan = isSpacePressedRef.current || e.button === 1;
    if (!forcePan) return;
    if (e.button !== 0 && e.button !== 1) return;

    e.preventDefault();
    e.stopPropagation();
    beginPanPointer(e);
  };

  // Canvas pointer events — pan on empty background (bubble phase)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSpacePressedRef.current || e.button === 1) return;
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (
      target.closest(".draggable-table-wrapper") ||
      target.closest("button") ||
      target.closest("select") ||
      target.closest("input")
    ) {
      return;
    }

    beginPanPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    if (activePanPointerIdRef.current !== null && e.pointerId !== activePanPointerIdRef.current) {
      return;
    }
    applyPanPointerMove(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    if (activePanPointerIdRef.current !== null && e.pointerId !== activePanPointerIdRef.current) {
      return;
    }
    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignored
    }
    finishPanGesture();
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
      panStartRef.current = { x: touch.clientX - panXRef.current, y: touch.clientY - panYRef.current };
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
        scale: scaleRef.current,
        panX: panXRef.current,
        panY: panYRef.current,
        centerX,
        centerY
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      const nextX = Math.round(touch.clientX - panStartRef.current.x);
      const nextY = Math.round(touch.clientY - panStartRef.current.y);
      
      const res = constrainPositionWithResistance(nextX, nextY, scaleRef.current);
      
      panXRef.current = res.x;
      panYRef.current = res.y;
      updateCanvasDOM(res.x, res.y, scaleRef.current);
      
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
      
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const base = Math.min(rect.width / 3000, rect.height / 2400);
        const minScale = base * CANVAS_MIN_MULTIPLIER;
        const maxScale = Math.max(CANVAS_MAX_SCALE, base * CANVAS_FIT_MULTIPLIER * 1.05);
        const nextScale = Math.min(Math.max(touchStartRef.current.scale * scaleRatio, minScale), maxScale);

        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;

        const relativeX = centerX - rect.left;
        const relativeY = centerY - rect.top;

        const nextPanX = Math.round(relativeX - (relativeX - touchStartRef.current.panX) * (nextScale / touchStartRef.current.scale));
        const nextPanY = Math.round(relativeY - (relativeY - touchStartRef.current.panY) * (nextScale / touchStartRef.current.scale));

        const res = constrainPositionWithResistance(nextPanX, nextPanY, nextScale);

        scaleRef.current = nextScale;
        panXRef.current = res.x;
        panYRef.current = res.y;
        updateCanvasDOM(res.x, res.y, nextScale);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      
      const hardConstrained = constrainPosition(panXRef.current, panYRef.current, scaleRef.current);
      if (hardConstrained.x !== panXRef.current || hardConstrained.y !== panYRef.current) {
        targetScaleRef.current = scaleRef.current;
        targetPanXRef.current = hardConstrained.x;
        targetPanYRef.current = hardConstrained.y;
        animateZoom();
      } else {
        startInertia();
      }
    } else {
      const hardConstrained = constrainPosition(panXRef.current, panYRef.current, scaleRef.current);
      if (hardConstrained.x !== panXRef.current || hardConstrained.y !== panYRef.current) {
        targetScaleRef.current = scaleRef.current;
        targetPanXRef.current = hardConstrained.x;
        targetPanYRef.current = hardConstrained.y;
        animateZoom();
      } else {
        // Sync state immediately if no snap back zoom
        setScale(scaleRef.current);
        setPanX(panXRef.current);
        setPanY(panYRef.current);
      }
    }
    touchStartRef.current = null;
  };

  // Drag-and-drop / Click assignment handler
  const handleTableClick = useCallback(
    async (tableId: string, e?: React.DragEvent) => {
      const dropGuestId = e ? (e.dataTransfer.getData("guestId") || e.dataTransfer.getData("text/plain")) : null;
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
              updatedGuests = updatedGuests.filter(g => g.id !== targetGuestId && g.parent_id !== targetGuestId);
            }
            if (isTarget) {
              const related = localAllGuests.filter(g => g.parent_id === targetGuestId);
              const toAdd = [guest, ...related].filter(g => !updatedGuests.some(ex => ex.id === g.id));
              updatedGuests = [...updatedGuests, ...toAdd];
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

  const handleAssignGuestFromList = useCallback(
    async (guestId: string, tableId: string) => {
      const guest = localAllGuests.find((g) => g.id === guestId);
      if (!guest) return;

      setLocalUnassigned((prev) => prev.filter((g) => g.id !== guestId && g.parent_id !== guestId));
      setLocalAllGuests((prev) =>
        prev.map((g) =>
          g.id === guestId || g.parent_id === guestId ? { ...g, table_id: tableId } : g
        )
      );
      setLocalTables((prev) =>
        prev.map((t) => {
          const isTarget = t.id === tableId;
          const isSource = t.id === guest.table_id;
          let updatedGuests = t.guests;

          if (isSource) {
            updatedGuests = updatedGuests.filter((g) => g.id !== guestId && g.parent_id !== guestId);
          }
          if (isTarget) {
            const related = localAllGuests.filter((g) => g.parent_id === guestId);
            const toAdd = [guest, ...related].filter((g) => !updatedGuests.some((ex) => ex.id === g.id));
            updatedGuests = [...updatedGuests, ...toAdd];
          }

          return { ...t, guests: updatedGuests };
        })
      );

      const result = await assignGuestFromSeating(eventId, guestId, tableId);
      if (result?.error) {
        alert(result.error);
        router.refresh();
      }
    },
    [eventId, localAllGuests, router]
  );

  const handleRemoveGuestFromList = useCallback(
    async (guestId: string) => {
      const guest = localAllGuests.find((g) => g.id === guestId);
      if (!guest?.table_id) return;

      const sourceTableId = guest.table_id;
      const relatedIds = new Set(
        localAllGuests.filter((g) => g.id === guestId || g.parent_id === guestId).map((g) => g.id)
      );

      setLocalTables((prev) =>
        prev.map((t) =>
          t.id === sourceTableId
            ? { ...t, guests: t.guests.filter((g) => !relatedIds.has(g.id)) }
            : t
        )
      );
      setLocalAllGuests((prev) =>
        prev.map((g) => (relatedIds.has(g.id) ? { ...g, table_id: null } : g))
      );
      setLocalUnassigned((prev) => {
        const addBack = localAllGuests.filter((g) => relatedIds.has(g.id));
        const existing = new Set(prev.map((g) => g.id));
        const merged = [...prev];
        for (const g of addBack) {
          if (!existing.has(g.id)) merged.push({ ...g, table_id: null });
        }
        return merged;
      });

      const result = await unassignGuest(eventId, guestId);
      if (result?.error) {
        alert(result.error);
        router.refresh();
      }
    },
    [eventId, localAllGuests, router]
  );

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
      const canvasBg = getComputedStyle(document.documentElement).getPropertyValue("--ev-bg-canvas").trim() || "rgb(249,244,241)";
      const canvas = await html2canvas(clone, {
        backgroundColor: canvasBg,
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

  // Subscribe children to live camera (DOM-driven); refs hold truth during pan/zoom
  void cameraRevision;
  const cameraScale = scaleRef.current;

  return (
    <>
      <div className={cn(
        "transition-all duration-350 ease-in-out",
        workspaceMode
          ? "fixed inset-0 z-[45] bg-slate-100 flex h-screen w-screen gap-0 overflow-hidden animate-in fade-in duration-300"
          : "flex min-h-0 flex-1 w-full gap-0 overflow-hidden bg-[var(--ev-bg-canvas)] print:h-auto print:block"
      )}>
        {/* LEFT: Guest Sidebar (desktop) */}
        {!guestSidebarCollapsed && (
          <aside
            style={{ width: `${guestSidebarWidth}px` }}
            className={cn(
              "hidden shrink-0 lg:block print:hidden relative h-full select-none transition-all duration-350 ease-in-out",
              workspaceMode
                ? "rounded-none border-none border-r border-slate-200/80 bg-white z-20 shadow-xl"
                : "border-r border-[var(--ev-border-soft)] bg-[var(--ev-bg-sidebar)]"
            )}
          >
            <GuestSidebar
              guests={localAllGuests}
              selectedGuestId={selectedGuestId}
              onSelectGuest={setSelectedGuestId}
              onDragStart={setDraggingGuestId}
              onDragEnd={() => setDraggingGuestId(null)}
              className={cn("h-full transition-all duration-300", workspaceMode && "rounded-none border-none")}
              headerAction={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setGuestSidebarCollapsed(true)}
                  className="h-7 w-7 rounded-lg text-slate-450 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                  title="Ascunde lista de invitați"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </Button>
              }
            />
            {/* Drag Resize Handle */}
            <div
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeStop}
              onPointerLeave={handleResizeStop}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 rounded-r-md"
            />
          </aside>
        )}

        {/* CENTER: Toolbar + Canvas Viewport */}
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden print:overflow-visible transition-all duration-350 ease-in-out",
            workspaceMode ? "h-full gap-0" : "gap-0"
          )}
        >
          {/* Toolbar — full-width band (Figma TopToolbar) */}
          <div className="print:hidden z-30 w-full shrink-0">
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
              onRunAutoSeat={handleRunAutoSeat}
              workspaceMode={workspaceMode}
              isFloating={false}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onToggleWorkspaceMode={() => setWorkspaceMode((prev) => !prev)}
            />
          </div>

          {/* Mobile guest drawer toggle */}
          <div className={cn("flex gap-2 lg:hidden print:hidden", workspaceMode && "p-3 bg-white border-b border-slate-100")}>
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
                  onDragStart={setDraggingGuestId}
                  onDragEnd={() => setDraggingGuestId(null)}
                  className="max-h-80"
                />
              </div>
            </div>
          )}

          {/* Selected guest visual floating indicator */}
          {selectedGuestId && (
            <div className={cn(
              "flex items-center gap-2 text-sm print:hidden animate-bounce transition-all duration-350",
              workspaceMode 
                ? "bg-pink-50/80 border-b border-pink-100 px-6 py-2" 
                : "rounded-xl bg-pink-50 border border-pink-200/50 px-4 py-2.5"
            )}>
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
          {viewMode === "canvas" ? (
            <div
              ref={viewportRef}
              onDoubleClick={handleDoubleClickCanvas}
              onPointerDownCapture={handlePointerDownCapture}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={cn(
                "flex-1 overflow-hidden shadow-inner relative print:border-none print:shadow-none print:bg-transparent print:p-0 print:overflow-visible transition-all duration-350 ease-in-out",
                workspaceMode ? "border-none rounded-none" : "min-h-0",
                isSpacePressed || isPanning
                  ? isPanning
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-default"
              )}
              style={{ background: "var(--ev-bg-canvas)" }}
            >
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 60%, rgba(200,160,170,0.08) 100%)",
              }}
            />
            {/* Floating Guest Sidebar Restore Button */}
            {guestSidebarCollapsed && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setGuestSidebarCollapsed(false)}
                className="absolute left-4 top-4 z-30 h-10 w-10 rounded-full bg-white shadow-lg border border-slate-200 hover:bg-slate-50 text-slate-700 animate-in fade-in zoom-in-75 duration-200"
                title="Afișează lista de invitați"
              >
                <Users className="h-4.5 w-4.5 text-primary" />
              </Button>
            )}

            {/* The Actual transformed Floor Canvas */}
            <div
              ref={canvasRef}
              className="absolute w-[3000px] h-[2400px] shadow-inner canvas-grid origin-top-left"
            >
              {localTables.length === 0 ? (
                /* Onboarding Wizard */
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-500/5 backdrop-blur-xs print:hidden z-10 select-none">
                  <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl border border-slate-150 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    
                    <div className="text-center space-y-1.5">
                      <h3 className="font-serif text-xl font-bold text-slate-800">
                        Configurare Sală de Evenimente
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pentru a începe, introdu numărul preferat de locuri pentru o masă. Sistemul va calcula și va genera automat numărul optim de mese dispuse în cercuri concentrice în jurul ringului de dans, pe baza listei de invitați.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-650">
                        <span>Invitați Total:</span>
                        <span className="font-bold text-slate-800 bg-white border border-slate-150 px-2 py-0.5 rounded-md">
                          {localAllGuests.length} persoane
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Locuri per Masă (implicit 10)
                        </label>
                        <div className="relative flex items-center">
                          <Input
                            type="number"
                            min={4}
                            max={24}
                            value={onboardingSeats}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 10;
                              setOnboardingSeats(val);
                            }}
                            className="h-10 pr-16 font-semibold text-sm rounded-xl"
                          />
                          <span className="absolute right-3 text-xs font-medium text-slate-400">
                            locuri
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold text-slate-650 pt-2 border-t border-slate-200/50">
                        <span>Mese estimate de generat:</span>
                        <span className="font-bold text-primary">
                          {Math.max(1, Math.ceil(localAllGuests.length / (onboardingSeats || 10)))} mese
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Button
                        onClick={handleRunOnboarding}
                        disabled={initializingOnboarding}
                        className="w-full rounded-xl text-xs h-11 font-bold bg-gradient-to-r from-primary to-pink-500 hover:from-primary/95 hover:to-pink-500/95 text-white shadow-md active:scale-98 transition-all"
                      >
                        {initializingOnboarding ? "Se generează schema..." : "Generează Schema Inteligentă"}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        onClick={() => setShowTemplateMenu(true)}
                        className="w-full text-xs text-slate-600 hover:text-slate-800 font-semibold h-9 rounded-xl hover:bg-slate-100"
                      >
                        Sau alege un șablon manual
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tables and Room Objects */}
                  {sortedTables.map((table) => {
                    const activeId = draggingGuestId || selectedGuestId;
                    const validation = activeId
                      ? canTableAccommodateGuest(table, activeId, localAllGuests)
                      : { allowed: true };

                    return (
                      <DraggableWrapper
                        key={table.renderKey}
                        table={table}
                        scale={cameraScale}
                        globalLock={globalLock}
                        isMobile={isMobile}
                        isSpacePressed={isSpacePressed}
                        isSelected={selectedTableId === table.id}
                        isDropTarget={!!activeId}
                        isValidDrop={validation.allowed}
                        validationReason={validation.reason}
                        onClick={() => handleTableClick(table.id)}
                        onDrop={(e) => handleTableClick(table.id, e)}
                        onStop={handleTableDragStop}
                      />
                    );
                  })}
                </>
              )}
            </div>

            {/* Canvas HUD Controls overlay */}
            <div
              className="absolute select-none print:hidden z-30"
              style={{
                position: "absolute",
                right: 20,
                bottom: 20,
                zIndex: 40,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  minWidth: 42,
                  height: 24,
                  borderRadius: 10,
                  border: "1px solid var(--ev-border-soft)",
                  background: "rgba(255,253,251,0.94)",
                  boxShadow: "var(--ev-shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--ev-text-label)",
                  fontFamily: "Inter, sans-serif",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span ref={zoomPercentTextRef}>{Math.round(cameraScale * 100)}%</span>
              </div>
              <div
                style={{
                  background: "rgba(255,253,251,0.94)",
                  backdropFilter: "blur(16px)",
                  borderRadius: 12,
                  border: "1px solid var(--ev-border-soft)",
                  boxShadow: "var(--ev-shadow-md)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "6px 5px",
                }}
              >
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-650 hover:bg-slate-100" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-650 hover:bg-slate-100" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <div style={{ width: 16, height: 1, background: "var(--ev-border-soft)", margin: "2px 0" }} />
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-650 hover:bg-slate-100" onClick={fitAll} title="Ajustează pe ecran">
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-650 hover:bg-slate-100" onClick={centerLayout} title="Centrează schema">
                  <Move className="h-3.5 w-3.5" />
                </Button>
                <div style={{ width: 16, height: 1, background: "var(--ev-border-soft)", margin: "2px 0" }} />
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-lg transition-all duration-300 ease-out press-scale",
                    workspaceMode ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-slate-650 hover:bg-slate-100"
                  )}
                  onClick={() => setWorkspaceMode((prev) => !prev)}
                  title={workspaceMode ? "Ieși din Modul Focus" : "Intră în Modul Focus"}
                >
                  {workspaceMode ? <Minimize className="h-3.5 w-3.5 text-primary animate-pulse" /> : <Maximize className="h-3.5 w-3.5 text-slate-500" />}
                </Button>
              </div>
            </div>

            {/* Canvas Status Bar (bottom left) */}
            <div
              className="absolute print:hidden z-30"
              style={{
                position: "absolute",
                bottom: 14,
                left: 20,
                zIndex: 40,
                background: "rgba(255,253,251,0.92)",
                backdropFilter: "blur(12px)",
                borderRadius: 11,
                border: "1px solid var(--ev-border-soft)",
                boxShadow: "var(--ev-shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 0,
                padding: "4px 10px",
                height: 30,
                fontSize: 10,
                fontFamily: "Inter, sans-serif",
              }}
            >
              <span style={{ color: "var(--ev-text-muted)", fontWeight: 500 }}>Liber</span>
              <span style={{ margin: "0 6px", color: "var(--ev-border-rose)" }}>-</span>
              <span style={{ color: "var(--ev-text-label)", fontWeight: 600 }}>MESE</span>
              <span style={{ margin: "0 6px", color: "var(--ev-text-muted)" }}>-</span>
              <span style={{ color: "var(--ev-rose-500)", fontWeight: 700 }}>
                {totalCapacity > 0 ? Math.round((totalSeated / totalCapacity) * 100) : 0}%
              </span>
              <span style={{ margin: "0 6px", color: "var(--ev-border-rose)" }}>-</span>
              <span style={{ color: "var(--ev-text-label)", fontWeight: 600 }}>LOCURI</span>
              <span style={{ margin: "0 6px", color: "var(--ev-text-muted)" }}>-</span>
              <span style={{ color: "var(--ev-rose-500)", fontWeight: 700 }}>
                {localAllGuests.length > 0 ? Math.round((totalSeated / localAllGuests.length) * 100) : 0}%
              </span>
            </div>

            {/* Mini-Map HUD */}
            <div
              onPointerDown={handleMiniMapPointerDown}
              onPointerMove={handleMiniMapPointerMove}
              onPointerUp={handleMiniMapPointerUp}
              onPointerLeave={handleMiniMapPointerUp}
              className="absolute bottom-14 left-4 w-24 h-[78px] sm:w-30 sm:h-[92px] bg-white/70 hover:bg-white/80 border border-slate-200/50 rounded-xl shadow-lg backdrop-blur-md overflow-hidden select-none cursor-crosshair z-30 transition-colors hidden md:block"
            >
              <div className="relative w-full h-full text-[10px]">
                {/* Mini Tables */}
                {localTables.map((t) => {
                  const meta = parseMetadata(t.notes);
                  const isObj = !!meta.objectType;
                  const tx = ((t.pos_x ?? 0) / 3000) * 100;
                  const ty = ((t.pos_y ?? 0) / 2400) * 100;
                  const tw = (meta.width || (meta.customShape === "long_banquet" ? 320 : 192)) / 3000 * 100;
                  const th = (meta.height || 160) / 2400 * 100;
                  
                  return (
                    <div
                      key={`mini-${t.id}`}
                      className={cn(
                        "absolute rounded-xs pointer-events-none",
                        isObj ? "bg-amber-300/40 border border-amber-400/20" : "bg-slate-400/40 border border-slate-500/20"
                      )}
                      style={{
                        left: `${tx}%`,
                        top: `${ty}%`,
                        width: `${tw}%`,
                        height: `${th}%`
                      }}
                    />
                  );
                })}
                
                {/* Viewport Box */}
                <div
                  ref={miniMapBoxRef}
                  className="absolute border border-primary bg-primary/5 pointer-events-none rounded-md"
                />
              </div>
            </div>

            {/* Auto-Seating Progress Overlay HUD */}
            {autoSeatingProgress && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[400px] bg-white/95 border border-slate-200/50 rounded-2xl shadow-xl backdrop-blur-md p-4 select-none z-40 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-bold text-slate-800">
                      Repartizare Automată...
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {Math.round((autoSeatingProgress.current / autoSeatingProgress.total) * 100)}%
                  </span>
                </div>
                
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                  <div
                    className="bg-gradient-to-r from-primary to-pink-500 h-full rounded-full transition-all duration-150 ease-out"
                    style={{
                      width: `${(autoSeatingProgress.current / autoSeatingProgress.total) * 100}%`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Se așează {autoSeatingProgress.current} din {autoSeatingProgress.total} invitați
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      skipAnimationRef.current = true;
                    }}
                    className="h-7 text-xs font-semibold px-2 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  >
                    Sari Peste
                  </Button>
                </div>
              </div>
            )}

            {/* Spacebar Panning Help overlay */}
            {isSpacePressed && !autoSeatingProgress && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-xl shadow-lg pointer-events-none select-none animate-in fade-in duration-200">
                <Move className="h-3.5 w-3.5" />
                <span>Trage cu mouse-ul pentru a muta camera</span>
              </div>
            )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <TableAssignView
                guests={localAllGuests}
                tables={localTables}
                onAssignGuest={handleAssignGuestFromList}
                onRemoveGuest={handleRemoveGuestFromList}
              />
            </div>
          )}
        </div>

        {/* RIGHT: Table Inspector Panel (desktop) */}
        {selectedTable && (
          <aside className={cn(
            "hidden w-76 shrink-0 lg:block print:hidden transition-all duration-350 ease-in-out border-slate-200/60 bg-white/70",
            workspaceMode ? "h-full rounded-none border-none border-l border-slate-200/80 bg-white z-20 shadow-xl" : ""
          )}>
            <TableDetailPanel
              table={selectedTable}
              allGuests={localAllGuests}
              eventId={eventId}
              onClose={() => setSelectedTableId(null)}
              className={cn("h-full transition-all duration-300", workspaceMode && "rounded-none border-none")}
            />
          </aside>
        )}
      </div>

      {/* Mobile Table Inspector bottom sheet drawer */}
      {selectedTable && (
        <div className="lg:hidden print:hidden">
          <div
            className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-auto p-4"
            style={{
              background: "rgba(255,253,251,0.97)",
              backdropFilter: "blur(24px)",
              borderRadius: "20px 20px 0 0",
              border: "1px solid var(--ev-border-soft)",
              boxShadow: "0 -8px 32px rgba(140,60,90,0.14)",
            }}
          >
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
          tables={localTables}
          onClose={() => {
            setShowAddDialog(false);
            router.refresh();
          }}
          onAddOptimistic={handleAddOptimistic}
        />
      </div>

      {/* Auto-Seating Summary Modal */}
      {autoSeatingSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 max-w-sm w-full p-6 shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="font-serif text-lg font-bold text-slate-800 mb-2">
              Așezare Completă!
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Am reușit să așezăm în mod inteligent invitații la mese conform strategiei.
            </p>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-5 flex justify-around text-center">
              <div>
                <span className="block text-xl font-bold text-slate-800">
                  {autoSeatingSummary.seatedCount}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Invitați Așezați
                </span>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <span className="block text-xl font-bold text-slate-800">
                  {autoSeatingSummary.tablesCount}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Mese Ocupate
                </span>
              </div>
            </div>

            <Button
              onClick={() => setAutoSeatingSummary(null)}
              className="w-full rounded-xl font-semibold text-sm h-10"
            >
              Excelent
            </Button>
          </div>
        </div>
      )}

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

      {/* ── Immersive Full-Page Templates Browser ──────────────── */}
      {showTemplateMenu && isMounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-300 h-screen w-screen p-6 md:p-12 select-none"
          onClick={() => setShowTemplateMenu(false)}
        >
          {/* Main Container */}
          <div
            className="mx-auto max-w-6xl w-full flex flex-col h-full relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-serif text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                  Design-ul Sălii de Evenimente
                </h3>
                <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  Selectează un stil care se potrivește cu tematica nunții tale. Fiecare șablon include elemente de bază implicite (ring de dans, scenă, DJ booth, masa mirilor) și un set de mese gata aranjate pe care le poți personaliza ulterior.
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowTemplateMenu(false)}
                className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors shrink-0 shadow-xs bg-white/50 border border-slate-100"
                title="Închide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Vibe filter tabs */}
            <div className="flex gap-1.5 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200/60 w-fit">
              {([
                { id: "all", label: "Toate stilurile" },
                { id: "elegant", label: "Elegant & Clasic" },
                { id: "rustic", label: "Rustic & Bohemian" },
                { id: "modern", label: "Modern & Minimalist" }
              ] as const).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVibe(v.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200",
                    selectedVibe === v.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-550 hover:text-slate-800"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Filtered Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1 pb-6 flex-1 max-h-[calc(100vh-14rem)]">
              {templates
                .filter((t) => selectedVibe === "all" || t.vibe === selectedVibe)
                .map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex flex-col rounded-3xl border border-slate-200/60 bg-white p-5 hover:border-primary/45 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
                  >
                    {/* Abstract Mini Preview with animations */}
                    <div className={cn(
                       "w-full h-36 rounded-2xl border border-slate-100 relative overflow-hidden flex items-center justify-center mb-4 bg-slate-50 transition-all duration-500 group-hover:bg-slate-50/50",
                      tpl.previewType === "garden" && "bg-emerald-50/10"
                    )}>
                      {/* Sweetheart table (top center) */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-amber-400 shadow-xs" />
                      
                      {/* Dance Floor */}
                      <div className={cn(
                        "w-11 h-9 border border-dashed flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                        tpl.previewType === "ballroom" || tpl.previewType === "garden" ? "rounded-full" : "rounded-sm",
                        "border-pink-300 bg-pink-50/20 text-[8px] text-pink-400 font-semibold"
                      )}>
                        Dans
                      </div>

                      {/* Relative Tables representations */}
                      {tpl.previewType === "ballroom" && (
                        <>
                          <div className="absolute top-5 left-16 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute top-16 left-12 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute bottom-6 left-16 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute top-5 right-16 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute top-16 right-12 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute bottom-6 right-16 w-2 h-2 rounded-full bg-slate-300" />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300" />
                        </>
                      )}
                      
                      {tpl.previewType === "barn" && (
                        <>
                          <div className="absolute top-6 left-6 w-5 h-2 rounded-xs bg-slate-300" />
                          <div className="absolute top-16 left-6 w-5 h-2 rounded-xs bg-slate-300" />
                          <div className="absolute bottom-6 left-6 w-5 h-2 rounded-xs bg-slate-300" />
                          <div className="absolute top-6 right-6 w-5 h-2 rounded-xs bg-slate-300" />
                          <div className="absolute top-16 right-6 w-5 h-2 rounded-xs bg-slate-300" />
                          <div className="absolute bottom-6 right-6 w-5 h-2 rounded-xs bg-slate-300" />
                        </>
                      )}

                      {tpl.previewType === "garden" && (
                        <>
                          <div className="absolute top-5 left-10 w-3.5 h-3.5 rounded-full bg-slate-300" />
                          <div className="absolute top-20 left-8 w-3.5 h-3.5 rounded-full bg-slate-300" />
                          <div className="absolute bottom-5 left-14 w-3.5 h-3.5 rounded-full bg-slate-300" />
                          <div className="absolute top-5 right-10 w-3.5 h-3.5 rounded-full bg-slate-300" />
                          <div className="absolute top-20 right-8 w-3.5 h-3.5 rounded-full bg-slate-300" />
                          <div className="absolute bottom-5 right-14 w-3.5 h-3.5 rounded-full bg-slate-300" />
                        </>
                      )}

                      {tpl.previewType === "restaurant" && (
                        <>
                          <div className="absolute top-5 left-10 w-2.5 h-2.5 rounded-sm bg-slate-300" />
                          <div className="absolute top-18 left-8 w-4 h-2.5 rounded-sm bg-slate-300" />
                          <div className="absolute bottom-5 left-12 w-3 h-3 rounded-full bg-slate-300" />
                          <div className="absolute top-5 right-10 w-2.5 h-2.5 rounded-sm bg-slate-300" />
                          <div className="absolute top-18 right-8 w-4 h-2.5 rounded-sm bg-slate-300" />
                          <div className="absolute bottom-5 right-12 w-3 h-3 rounded-full bg-slate-300" />
                        </>
                      )}

                      {tpl.previewType === "long_hall" && (
                        <>
                          <div className="absolute top-6 left-12 w-2 h-24 rounded-xs bg-slate-300" />
                          <div className="absolute top-6 right-12 w-2 h-24 rounded-xs bg-slate-300" />
                        </>
                      )}
                    </div>

                    {/* Template Meta Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">
                            {tpl.title}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 capitalize px-2 py-0.5 rounded-md bg-slate-100">
                            {tpl.vibe === "elegant" ? "Elegant" : tpl.vibe === "rustic" ? "Rustic" : "Modern"}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2 mb-4">
                          {tpl.desc}
                        </p>

                        {/* Dynamic Room Features Checklist */}
                        <div className="space-y-1.5 mb-5">
                          {tpl.features.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        {/* Table count picker */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Număr de mese
                          </label>
                          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                            {[8, 12, 20].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setSelectedCounts((prev: Record<string, number>) => ({ ...prev, [tpl.id]: c }))}
                                className={cn(
                                  "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                  selectedCounts[tpl.id] === c
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-550 hover:text-slate-800"
                                )}
                              >
                                {c} Mese
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Apply CTA */}
                        <Button
                          type="button"
                          className="w-full rounded-xl text-xs h-9.5 font-bold bg-slate-900 text-white hover:bg-slate-850"
                          onClick={() => handleApplyTemplate(tpl.id, selectedCounts[tpl.id])}
                        >
                          Aplică Șablon ({selectedCounts[tpl.id]} mese)
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>,
        document.body
      )}
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
  isValidDrop?: boolean;
  validationReason?: string;
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
  isValidDrop = true,
  validationReason,
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

  const [dragEnterCount, setDragEnterCount] = useState(0);
  const isHovered = dragEnterCount > 0;

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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (isTableLocked || metadata.objectType) return;
    setDragEnterCount(prev => prev + 1);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (isTableLocked || metadata.objectType) return;
    setDragEnterCount(prev => Math.max(0, prev - 1));
  };

  const handleDropWrapper = (e: React.DragEvent) => {
    e.preventDefault();
    setDragEnterCount(0);
    if (!isTableLocked && !metadata.objectType && isValidDrop) {
      onDrop(e);
    }
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
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isTableLocked && !metadata.objectType) {
            e.dataTransfer.dropEffect = isValidDrop ? "move" : "none";
          }
        }}
        onDrop={handleDropWrapper}
        className={cn(
          "absolute draggable-table-wrapper select-none",
          isDragDisabled ? "cursor-default" : "cursor-move",
          table.id.startsWith("temp-") && "animate-in fade-in zoom-in-90 duration-350 ease-out"
        )}
      >
        <TableVisual
          table={table}
          isSelected={isSelected}
          isDropTarget={isDropTarget}
          isHovered={isHovered}
          isValidDrop={isValidDrop}
          validationReason={validationReason}
          onClick={() => {}} // Handled via wrapper onClick
          onDrop={() => {}} // Handled via wrapper onDrop
          scale={scale}
        />
      </div>
    </Draggable>
  );
}

const templates = [
  {
    id: "ballroom",
    title: "Ballroom Clasic",
    desc: "Mese rotunde dispuse concentric în jurul unui ring de dans central circular. Ideal pentru nunți clasice, elegante.",
    previewType: "ballroom",
    vibe: "elegant",
    features: ["Masa Mirilor (Secționată)", "Ring de Dans Central", "Mese Rotunde Consecutive"]
  },
  {
    id: "barn",
    title: "Hambar Rustic",
    desc: "Design cald cu mese lungi de banquet aliniate în coloane simetrice pe lateral. Ideal pentru nunți retro, rustice sau în hambar.",
    previewType: "barn",
    vibe: "rustic",
    features: ["Masa Mirilor în Centru", "Coloane Paralele Symmetrice", "Mese Rectangulare Lungi"]
  },
  {
    id: "garden",
    title: "Grădină Aer Liber",
    desc: "Mese rotunde aerisite, distanțate lejer pe gazon, ferite de zona de dans. Perfect pentru petreceri în aer liber sau cort.",
    previewType: "garden",
    vibe: "rustic",
    features: ["Mese Rotunde Distanțate", "Ring de Dans Rotund", "Aranjament Aerisit & Fluid"]
  },
  {
    id: "restaurant",
    title: "Restaurant Clasic",
    desc: "Configurație organizată tip grid cu mese pătrate și rectangulare combinate. Perfect pentru saloane clasice de restaurant.",
    previewType: "restaurant",
    vibe: "elegant",
    features: ["Mese Pătrate & Rectangulare", "Optimizare Spațiu Tip Grid", "Configurație Compactă"]
  },
  {
    id: "long_hall",
    title: "Salon Lung",
    desc: "Două rânduri masive paralele de mese lungi pe lungimea sălii, ideale pentru spații lungi și înguste sau corturi liniare.",
    previewType: "long_hall",
    vibe: "modern",
    features: ["Mese Lungi Tip Banquet", "Două Culoare de Trecere", "Ring de Dans Alungit"]
  }
] as const;
