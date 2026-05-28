"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import type { DragAssistResult } from "@/lib/seating/planner-spatial-assist";

export type PlannerAssistOverlayHandle = {
  update: (assist: DragAssistResult | null, draggingId: string | null) => void;
  clear: () => void;
};

function syncTableAssistClasses(
  assist: DragAssistResult | null,
  draggingId: string | null
) {
  if (typeof document === "undefined") return;
  const collisionSet = new Set(assist?.collisionIds ?? []);
  const nearbySet = new Set(assist?.nearbyIds ?? []);

  document.querySelectorAll<HTMLElement>("[data-planner-table-id]").forEach((el) => {
    const id = el.dataset.plannerTableId ?? "";
    const colliding = collisionSet.has(id);
    el.classList.toggle("planner-table-collision", colliding);
    el.classList.toggle("planner-table-nearby", nearbySet.has(id));
    el.classList.toggle("planner-table-dragging", id === draggingId);
    el
      .querySelector<HTMLElement>(".table-visual-collision-host")
      ?.toggleAttribute("data-collision-visual", colliding);
  });
}

export const PlannerAssistOverlay = forwardRef<PlannerAssistOverlayHandle>(
  function PlannerAssistOverlay(_props, ref) {
    const svgRef = useRef<SVGSVGElement>(null);

    useImperativeHandle(ref, () => ({
      update(assist, draggingId) {
        syncTableAssistClasses(assist, draggingId);
        const svg = svgRef.current;
        if (!svg) return;
        if (!assist || assist.guides.length === 0) {
          svg.innerHTML = "";
          return;
        }

        const lines = assist.guides
          .map((g) => {
            const stroke =
              g.kind === "spacing"
                ? "rgba(140, 125, 130, 0.2)"
                : g.kind === "center"
                  ? "rgba(155, 118, 125, 0.26)"
                  : "rgba(148, 120, 128, 0.22)";
            const dash =
              g.kind === "spacing" ? 'stroke-dasharray="3 5"' : "";
            if (g.orientation === "vertical") {
              return `<line x1="${g.position}" y1="${g.from}" x2="${g.position}" y2="${g.to}" stroke="${stroke}" stroke-width="1" ${dash} />`;
            }
            return `<line x1="${g.from}" y1="${g.position}" x2="${g.to}" y2="${g.position}" stroke="${stroke}" stroke-width="1" ${dash} />`;
          })
          .join("");
        svg.innerHTML = lines;
      },
      clear() {
        syncTableAssistClasses(null, null);
        if (typeof document !== "undefined") {
          document
            .querySelectorAll<HTMLElement>("[data-collision-visual]")
            .forEach((el) => el.removeAttribute("data-collision-visual"));
        }
        if (svgRef.current) svgRef.current.innerHTML = "";
      },
    }));

    return (
      <svg
        ref={svgRef}
        className="planner-assist-overlay pointer-events-none absolute inset-0 z-[35] overflow-visible opacity-[0.72] print:hidden"
        aria-hidden
      />
    );
  }
);
