"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Plus,
  Wand2,
  Download,
  ImageIcon,
  FileText,
  Printer,
  LayoutGrid,
  List,
  Share2,
  Maximize2,
  Minimize2,
  Users,
  Lock,
  Unlock,
} from "lucide-react";

import { autoSeatGuestsAction } from "@/app/(dashboard)/dashboard/events/[id]/seating/actions";
import { cn } from "@/lib/utils";

type SeatingToolbarProps = {
  eventId: string;
  totalSeated: number;
  totalGuests: number;
  totalCapacity: number;
  onAddTable: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  printSort: "alpha" | "table";
  onTogglePrintSort: () => void;
  globalLock: boolean;
  onToggleGlobalLock: () => void;
  onRunAutoSeat?: (strategy: "family" | "even") => Promise<void>;
  onToggleTemplateMenu: (show: boolean) => void;
  applyingTemplate?: boolean;
  workspaceMode: boolean;
  isFloating?: boolean;
  viewMode?: "canvas" | "list";
  onViewModeChange?: (mode: "canvas" | "list") => void;
  onToggleWorkspaceMode?: () => void;
};

export function SeatingToolbar({
  eventId,
  totalSeated,
  totalGuests,
  totalCapacity,
  onAddTable,
  onExportPng,
  onExportPdf,
  printSort,
  onTogglePrintSort,
  globalLock,
  onToggleGlobalLock,
  onRunAutoSeat,
  workspaceMode,
  isFloating = false,
  viewMode = "canvas",
  onViewModeChange,
  onToggleWorkspaceMode,
}: SeatingToolbarProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAutoSeatMenu, setShowAutoSeatMenu] = useState(false);
  const [strategy, setStrategy] = useState<"family" | "even">("family");

  async function handleAutoAssign() {
    setAssigning(true);
    setShowAutoSeatMenu(false);
    if (onRunAutoSeat) {
      await onRunAutoSeat(strategy);
    } else {
      const result = await autoSeatGuestsAction(eventId, strategy);
      if (result.success) {
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    }
    setAssigning(false);
  }

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      alert("Link-ul pentru partajare a fost copiat în clipboard!");
    } catch {
      alert("Nu s-a putut copia link-ul de partajare.");
    }
  };

  const pct = totalCapacity > 0 ? Math.round((totalSeated / totalCapacity) * 100) : 0;
  const unassigned = totalGuests - totalSeated;

  const dropdownItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    background: "transparent",
    border: "none",
    color: "var(--ev-text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Inter, sans-serif",
    textAlign: "left",
    width: "100%",
  };

  return (
    <div
      className={cn("print:hidden", isFloating && "absolute left-0 right-0 top-0 z-50")}
      style={{
        position: isFloating ? "absolute" : "relative",
        width: "100%",
        height: 54,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 10,
        fontFamily: "Inter, sans-serif",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(210,170,185,0.18)",
        boxShadow:
          "0 1px 0 rgba(210,170,185,0.12), 0 4px 16px rgba(180,100,120,0.06)",
      }}
    >
      {/* Occupancy stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(145deg, #FEF0F3, #FCEAEF)",
            border: "1px solid rgba(210,170,185,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Users size={13} color="#B8516B" />
        </div>
        <div className="hidden sm:block">
          <div style={{ lineHeight: 1, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A0E14", letterSpacing: "-0.3px" }}>
              {totalSeated}
            </span>
            <span style={{ fontSize: 11, color: "#C4A8B4" }}>/{totalCapacity}</span>
          </div>
          <div
            style={{
              fontSize: 9.5,
              color: "#C4A8B4",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Locuri
          </div>
        </div>
        <div className="hidden md:flex flex-col gap-1">
          <div
            style={{
              width: 72,
              height: 4,
              borderRadius: 4,
              background: "rgba(210,170,185,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "linear-gradient(90deg, #E8748A, #B8516B)",
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ fontSize: 9, color: "#D4B8C4", letterSpacing: "0.04em", fontWeight: 500 }}>
            {pct}% alocat · {unassigned} liberi
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 22, background: "rgba(210,170,185,0.2)", flexShrink: 0 }} />

      {/* Plan / Tabel */}
      {onViewModeChange && (
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "rgba(245,240,243,0.7)",
            border: "1px solid rgba(210,170,185,0.2)",
            borderRadius: 12,
            padding: 3,
            flexShrink: 0,
          }}
        >
          {[
            { key: "canvas" as const, label: "Plan", icon: LayoutGrid },
            { key: "list" as const, label: "Tabel", icon: List },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onViewModeChange(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
                background: viewMode === key ? "#FFFFFF" : "transparent",
                color: viewMode === key ? "#B8516B" : "#8A7080",
                border: "none",
                cursor: "pointer",
                boxShadow: viewMode === key ? "0 1px 6px rgba(180,100,120,0.14)" : "none",
              }}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 8 }} />

      <button
        type="button"
        onClick={onToggleGlobalLock}
        title={
          globalLock
            ? "Deblochează editarea layout-ului"
            : "Blochează mutarea/redimensionarea meselor"
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          border: globalLock
            ? "1px solid rgba(184,81,107,0.45)"
            : "1px solid rgba(210,170,185,0.25)",
          background: globalLock
            ? "linear-gradient(145deg, #FEF0F3, #FCE8EE)"
            : "rgba(255,255,255,0.7)",
          color: globalLock ? "#B8516B" : "#8A7080",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {globalLock ? <Lock size={14} /> : <Unlock size={14} />}
        <span className="hidden sm:inline">
          {globalLock ? "Plan blocat" : "Blochează plan"}
        </span>
      </button>

      <div style={{ width: 1, height: 22, background: "rgba(210,170,185,0.2)", flexShrink: 0 }} />

      {/* Center actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "rgba(245,240,243,0.6)",
            border: "1px solid rgba(210,170,185,0.18)",
            borderRadius: 12,
            padding: 3,
          }}
        >
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowAutoSeatMenu(!showAutoSeatMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #E8748A, #B8516B)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 2px 10px rgba(184,81,107,0.3)",
              }}
            >
              <Wand2 size={13} />
              <span className="hidden sm:inline">Auto-Așezare</span>
              <span className="sm:hidden">Auto</span>
            </button>
            {showAutoSeatMenu && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowAutoSeatMenu(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    zIndex: 50,
                    marginTop: 8,
                    width: 220,
                    background: "white",
                    borderRadius: 12,
                    border: "1px solid rgba(210,170,185,0.25)",
                    boxShadow: "0 8px 32px rgba(180,100,120,0.18)",
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#C4A8B4",
                      textTransform: "uppercase",
                    }}
                  >
                    Alege Strategia
                  </span>
                  <button
                    type="button"
                    onClick={() => setStrategy("family")}
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: strategy === "family" ? "#FEF0F3" : "transparent",
                      color: strategy === "family" ? "#B8516B" : "#8A7080",
                      fontSize: 11.5,
                      fontWeight: strategy === "family" ? 600 : 500,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Prioritizează Familiile
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrategy("even")}
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: strategy === "even" ? "#FEF0F3" : "transparent",
                      color: strategy === "even" ? "#B8516B" : "#8A7080",
                      fontSize: 11.5,
                      fontWeight: strategy === "even" ? 600 : 500,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Distribuie Egal
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoAssign}
                    disabled={assigning}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "#B8516B",
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {assigning ? "Se așează..." : "Rulează Asistentul"}
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onAddTable}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "#8A7080",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Nou</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 8 }} />

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, position: "relative" }}>
        <GhostBtn icon={<Share2 size={13} />} label="Partajează" onClick={handleShare} />
        <div style={{ position: "relative" }}>
          <GhostBtn
            icon={<Download size={13} />}
            label="Exportă"
            onClick={() => setShowExportMenu(!showExportMenu)}
          />
          {showExportMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowExportMenu(false)} />
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 50,
                  marginTop: 8,
                  width: 180,
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid rgba(210,170,185,0.25)",
                  boxShadow: "0 8px 32px rgba(180,100,120,0.18)",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <button type="button" onClick={() => { onExportPng(); setShowExportMenu(false); }} style={dropdownItemStyle}>
                  <ImageIcon size={13} />
                  Exportă PNG
                </button>
                <button type="button" onClick={() => { onExportPdf(); setShowExportMenu(false); }} style={dropdownItemStyle}>
                  <FileText size={13} />
                  Exportă PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setShowExportMenu(false);
                  }}
                  style={dropdownItemStyle}
                >
                  <Printer size={13} />
                  Printează schema
                </button>
                <div style={{ height: 1, background: "rgba(210,170,185,0.2)", margin: "4px 0" }} />
                <button
                  type="button"
                  onClick={() => {
                    onTogglePrintSort();
                    setShowExportMenu(false);
                  }}
                  style={{ ...dropdownItemStyle, fontSize: 11, color: "#C4A8B4" }}
                >
                  Sortare listă: {printSort === "alpha" ? "Alfabetic" : "Pe Mese"}
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleWorkspaceMode?.()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 8,
            border: workspaceMode
              ? "1px solid rgba(184,81,107,0.35)"
              : "1px solid rgba(210,170,185,0.25)",
            background: workspaceMode
              ? "linear-gradient(145deg, #FEF0F3, #FCEAEF)"
              : "transparent",
            color: workspaceMode ? "#B8516B" : "#8A7080",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {workspaceMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span className="hidden sm:inline">{workspaceMode ? "Ieși" : "Focus"}</span>
        </button>
      </div>
    </div>
  );
}

function GhostBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 8,
        background: "transparent",
        border: "none",
        color: "#8A7080",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(254,240,243,0.85)";
        e.currentTarget.style.color = "#B8516B";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#8A7080";
      }}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
