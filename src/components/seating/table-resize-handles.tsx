"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type MutableRefObject } from "react";

import type { LocalPlannerTable } from "@/lib/seating/planner-table-state";
import { canEditLayout } from "@/lib/seating/planner-lock";
import { clientPointToCanvasPx } from "@/lib/seating/spatial";
import { getDisplayRotationDeg } from "@/lib/seating/table-rotation";
import {
  applyResizeCollisionDOM,
  applyResizeOverlayPosition,
  applyTableResizeDOM,
  clearResizeCollisionDOM,
  footprintPxFromResizeRect,
  resolveResizeVisualKind,
  type ResizeVisualKind,
} from "@/lib/seating/table-resize-dom";
import type { DragAssistResult } from "@/lib/seating/planner-spatial-assist";
import {
  computeResizeAnchorCanvas,
  computeResizeFromHandle,
  isTableCanvasResizable,
  RESIZE_HANDLES,
  type ResizeHandleId,
  type ResizeRectPx,
} from "@/lib/seating/table-resize";
import { getTableVisualBoundsPx } from "@/lib/seating/table-spatial";
import { parseMetadata } from "@/lib/seating/utils";

const BRAND_ROSE = "#B8516B";
const HANDLE_SIZE_PX = 8;

type DragCameraSnapshot = {
  viewportRect: DOMRect | null;
  panX: number;
  panY: number;
  scale: number;
};

export type TableResizeCommitPayload = {
  tableId: string;
  widthM: number;
  heightM: number;
  posX: number;
  posY: number;
  initialWidthM: number;
  initialHeightM: number;
  initialPosX: number;
  initialPosY: number;
};

type TableResizeHandlesProps = {
  selectedTableId: string | null;
  tables: LocalPlannerTable[];
  zoom: number;
  globalLock: boolean;
  readCamera: () => DragCameraSnapshot;
  dragPositionRef?: MutableRefObject<{
    tableId: string;
    x: number;
    y: number;
  } | null>;
  checkResizeAssist: (
    tableId: string,
    posX: number,
    posY: number,
    footprintWidthPx: number,
    footprintHeightPx: number
  ) => DragAssistResult;
  onResizeCommit: (payload: TableResizeCommitPayload) => void;
  onResizeActiveChange: (tableId: string | null) => void;
};

function canvasPointFromClient(
  clientX: number,
  clientY: number,
  camera: DragCameraSnapshot
) {
  if (!camera.viewportRect) return null;
  return clientPointToCanvasPx(
    clientX,
    clientY,
    camera.viewportRect,
    camera.panX,
    camera.panY,
    camera.scale
  );
}

function toResizeRectFromTable(table: LocalPlannerTable): ResizeRectPx {
  const meta = parseMetadata(table.notes);
  const shape = meta.customShape ?? table.shape;
  const bounds = getTableVisualBoundsPx(meta, shape);
  return {
    posX: table.pos_x ?? 0,
    posY: table.pos_y ?? 0,
    widthPx: bounds.widthPx,
    heightPx: bounds.heightPx,
    widthM: bounds.widthM,
    heightM: bounds.heightM,
    renderScale: bounds.renderScale,
  };
}

export function TableResizeHandles({
  selectedTableId,
  tables,
  zoom,
  globalLock,
  readCamera,
  dragPositionRef,
  checkResizeAssist,
  onResizeCommit,
  onResizeActiveChange,
}: TableResizeHandlesProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const selectedTableRef = useRef<LocalPlannerTable | null>(null);
  const sessionRef = useRef<{
    tableId: string;
    handle: ResizeHandleId;
    initial: ResizeRectPx;
    latest: ResizeRectPx;
    anchorCanvas: { x: number; y: number };
    startPointer: { x: number; y: number };
    aspectRatio: number;
    rotationDeg: number;
    visualKind: ResizeVisualKind;
    hasCollision: boolean;
    collisionMarkedIds: string[];
    moved: boolean;
  } | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const selectedTable =
    selectedTableId != null
      ? tables.find(
          (t) => t.id === selectedTableId || t.renderKey === selectedTableId
        ) ?? null
      : null;

  selectedTableRef.current = selectedTable;

  useEffect(() => {
    if (!selectedTableId || !dragPositionRef) return;

    let rafId = 0;

    const tick = () => {
      const drag = dragPositionRef.current;
      const overlay = overlayRef.current;
      const table = selectedTableRef.current;

      if (
        drag &&
        overlay &&
        table &&
        !sessionRef.current &&
        (drag.tableId === table.id || drag.tableId === table.renderKey)
      ) {
        applyResizeOverlayPosition(overlay, drag.x, drag.y);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [selectedTableId, dragPositionRef]);

  const finishSession = useCallback(
    (session: NonNullable<typeof sessionRef.current>) => {
      const {
        tableId,
        initial,
        latest,
        visualKind,
        hasCollision,
        collisionMarkedIds,
        moved,
      } = session;

      sessionRef.current = null;
      onResizeActiveChange(null);

      clearResizeCollisionDOM(
        tableId,
        overlayRef.current,
        collisionMarkedIds
      );

      if (!moved) return;

      if (hasCollision) {
        applyTableResizeDOM(
          tableId,
          initial,
          overlayRef.current,
          visualKind
        );
        return;
      }

      const sizeChanged =
        latest.widthM !== initial.widthM || latest.heightM !== initial.heightM;
      const posChanged =
        latest.posX !== initial.posX || latest.posY !== initial.posY;

      if (!sizeChanged && !posChanged) return;

      onResizeCommit({
        tableId,
        widthM: latest.widthM,
        heightM: latest.heightM,
        posX: latest.posX,
        posY: latest.posY,
        initialWidthM: initial.widthM,
        initialHeightM: initial.heightM,
        initialPosX: initial.posX,
        initialPosY: initial.posY,
      });
    },
    [onResizeCommit, onResizeActiveChange]
  );

  useEffect(() => {
    const overlay = overlayRef.current;
    return () => {
      const session = sessionRef.current;
      if (session) {
        clearResizeCollisionDOM(
          session.tableId,
          overlay,
          session.collisionMarkedIds
        );
        onResizeActiveChange(null);
        sessionRef.current = null;
      }
    };
  }, [onResizeActiveChange]);

  useLayoutEffect(() => {
    const session = sessionRef.current;
    if (!session && selectedTable && overlayRef.current) {
      const rect = toResizeRectFromTable(selectedTable);
      applyResizeOverlayPosition(overlayRef.current, rect.posX, rect.posY);
    }
    if (!session) return;
    applyTableResizeDOM(
      session.tableId,
      session.latest,
      overlayRef.current,
      session.visualKind
    );
  });

  if (!selectedTable) return null;

  const meta = parseMetadata(selectedTable.notes);
  const shape = meta.customShape ?? selectedTable.shape;

  if (
    !canEditLayout(globalLock, meta) ||
    !isTableCanvasResizable(meta, shape)
  ) {
    return null;
  }

  const rect = toResizeRectFromTable(selectedTable);
  const rotation = getDisplayRotationDeg(meta, shape);
  const counterScale = zoom > 0 ? 1 / zoom : 1;

  const handlePointerDown = (
    handle: ResizeHandleId,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const camera = readCamera();
    const startPointer = canvasPointFromClient(e.clientX, e.clientY, camera);
    if (!startPointer) return;

    const initial = toResizeRectFromTable(selectedTable);
    const aspectRatio = initial.widthM / initial.heightM;
    const anchorCanvas = computeResizeAnchorCanvas(handle, initial, rotation);
    const visualKind = resolveResizeVisualKind(!!meta.objectType, shape);

    sessionRef.current = {
      tableId: selectedTable.id,
      handle,
      initial,
      latest: initial,
      anchorCanvas,
      startPointer,
      aspectRatio,
      rotationDeg: rotation,
      visualKind,
      hasCollision: false,
      collisionMarkedIds: [],
      moved: false,
    };
    onResizeActiveChange(selectedTable.id);

    e.currentTarget.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;

      const cam = readCamera();
      const pointer = canvasPointFromClient(ev.clientX, ev.clientY, cam);
      if (!pointer) return;

      const next = computeResizeFromHandle(
        session.handle,
        session.initial,
        session.anchorCanvas,
        pointer,
        session.startPointer,
        session.rotationDeg,
        session.aspectRatio
      );

      session.moved = true;
      session.latest = next;
      applyTableResizeDOM(
        session.tableId,
        next,
        overlayRef.current,
        session.visualKind
      );

      const footprint = footprintPxFromResizeRect(next);
      const assist = checkResizeAssist(
        session.tableId,
        next.posX,
        next.posY,
        footprint.width,
        footprint.height
      );
      session.hasCollision = assist.collisionIds.length > 0;
      session.collisionMarkedIds = applyResizeCollisionDOM(
        session.tableId,
        overlayRef.current,
        assist,
        session.collisionMarkedIds
      );
    };

    const onPointerUp = (ev: PointerEvent) => {
      const session = sessionRef.current;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      try {
        (ev.target as HTMLElement)?.releasePointerCapture?.(ev.pointerId);
      } catch {
        // ignored
      }

      if (session && isMountedRef.current) {
        finishSession(session);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return (
    <div
      ref={overlayRef}
      className="table-resize-handles pointer-events-none absolute z-[25] select-none"
      style={{
        left: rect.posX,
        top: rect.posY,
        width: rect.widthPx,
        height: rect.heightPx,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      <div
        className="table-resize-handles-frame absolute inset-0"
        style={{
          border: `1px dashed ${BRAND_ROSE}`,
          pointerEvents: "none",
        }}
      />

      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle.id}
          className="table-resize-handle pointer-events-auto absolute touch-none"
          style={{
            ...handle.style,
            width: HANDLE_SIZE_PX,
            height: HANDLE_SIZE_PX,
            transform: `translate(-50%, -50%) scale(${counterScale})`,
            transformOrigin: "center center",
            cursor: handle.cursor,
            background: BRAND_ROSE,
            border: "1.5px solid white",
            borderRadius: handle.rounded ? "9999px" : 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
          }}
          onPointerDown={(e) => handlePointerDown(handle.id, e)}
        />
      ))}
    </div>
  );
}
