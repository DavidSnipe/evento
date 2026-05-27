"use client";

import { useState, useEffect } from "react";
import { X, Phone, Mail, StickyNote, UtensilsCrossed, Trash2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { RsvpPill } from "@/components/guests/rsvp-pill";
import { GUEST_TAGS } from "@/types/guests";
import type { GuestWithTable, RsvpStatus, SeatingTableRow } from "@/types/guests";

type GuestDetailPanelProps = {
  guest: GuestWithTable;
  tables: SeatingTableRow[];
  onClose: () => void;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateField: (field: string, value: string | boolean | null) => void;
  onDelete: () => void;
  onAddSubGuest: (type: "couple" | "family" | "child") => void;
  onDeleteSubGuest: (subGuestId: string) => void;
  onUpdateSubField: (subGuestId: string, field: string, value: string | null) => void;
  isSyncing: boolean;
};

type AvatarTheme = {
  bg: string;
  text: string;
};

// Premium styling for each semantic tag value
const TAG_THEME: Record<string, string> = {
  vip: "bg-[#FFF9E6] text-[#B8860B] border-[#FCE49F]", // Gold
  godparents: "bg-[#FAF3FB] text-[#7030A0] border-[#F2DDF5]", // Lavender / Violet
  family: "bg-[#FEF0F3] text-[#B8516B] border-[#FCE2E9]", // Brand Blush / Rose
  friends: "bg-[#EEF6FC] text-[#2B6CB0] border-[#D2E7F7]", // Soft Blue
  kids: "bg-[#F2FAF3] text-[#2E7D32] border-[#D5EED8]", // Soft Green
  transport: "bg-[#F4F5F7] text-[#4E5D6C] border-[#E4E6EA]", // Slate / Grey
  accommodation: "bg-[#EDFAF8] text-[#007A78] border-[#CEF1ED]", // Teal
  vegetarian: "bg-[#F5FAF0] text-[#558B2F] border-[#E1F0D5]", // Olive / Herb Green
  allergies: "bg-[#FFF0F0] text-[#C53030] border-[#FFD2D2]", // Soft Coral / Red
};

// Generate premium gradient avatar colors from name
function getAvatarGradient(name: string): AvatarTheme {
  const gradients: AvatarTheme[] = [
    { bg: "from-[#FEF0F3] to-[#FCEAEF]", text: "text-[#B8516B] border border-[#FCE2E9]" },
    { bg: "from-[#FAF3FB] to-[#F2DDF5]", text: "text-[#7030A0] border border-[#F2DDF5]" },
    { bg: "from-[#FFF9E6] to-[#FFEAA7]", text: "text-[#B8860B] border border-[#FCE49F]" },
    { bg: "from-[#EEF6FC] to-[#D2E7F7]", text: "text-[#2B6CB0] border border-[#D2E7F7]" },
    { bg: "from-[#F2FAF3] to-[#D5EED8]", text: "text-[#2E7D32] border border-[#D5EED8]" },
    { bg: "from-[#EDFAF8] to-[#CEF1ED]", text: "text-[#007A78] border border-[#CEF1ED]" }
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function GuestDetailPanel({
  guest,
  tables,
  onClose,
  onRsvpChange,
  onUpdateTags,
  onUpdateField,
  onDelete,
  onAddSubGuest,
  onDeleteSubGuest,
  onUpdateSubField,
  isSyncing,
}: GuestDetailPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [visualState, setVisualState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (isSyncing) {
      setVisualState("saving");
      return;
    }

    if (visualState === "saving") {
      const timer = setTimeout(() => {
        setVisualState("saved");
      }, 500); // 500ms settle delay
      return () => clearTimeout(timer);
    }

    if (visualState === "saved") {
      const timer = setTimeout(() => {
        setVisualState("idle");
      }, 2000); // 2000ms display duration
      return () => clearTimeout(timer);
    }
  }, [isSyncing, visualState]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const fullName = guest.last_name ? `${guest.last_name} ${guest.first_name}` : guest.first_name;
  const theme = getAvatarGradient(fullName);
  const initials = guest.last_name
    ? `${guest.last_name.charAt(0)}${guest.first_name.charAt(0)}`.toUpperCase()
    : guest.first_name.charAt(0).toUpperCase();
  const guestTags = guest.tags ?? [];

  const toggleTag = (tag: string) => {
    const newTags = guestTags.includes(tag)
      ? guestTags.filter((t) => t !== tag)
      : [...guestTags, tag];
    onUpdateTags(newTags);
  };

  const handleAddSubGuest = (type: "couple" | "family" | "child") => {
    onAddSubGuest(type);
  };

  const handleDeleteSubGuest = (subId: string) => {
    onDeleteSubGuest(subId);
  };

  const handleUpdateSubField = (subId: string, field: string, value: string | null) => {
    onUpdateSubField(subId, field, value);
  };

  const content = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-[#1A0E14]/15 transition-opacity duration-300 ease-out backdrop-blur-[2px]",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ zIndex: 9998 }}
        onClick={handleClose}
      />

      {/* Panel - Desktop: right side, Mobile: bottom sheet */}
      <div
        className={cn(
          // Desktop
          "fixed top-0 right-0 bottom-0 w-full max-w-md bg-white/95 border-l border-border-rose-18 shadow-[0_0_40px_rgba(180,100,120,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col backdrop-blur-md",
          "hidden md:flex",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
        style={{ zIndex: 9999 }}
      >
        <PanelContent
          guest={guest}
          theme={theme}
          initials={initials}
          guestTags={guestTags}
          tables={tables}
          visualState={visualState}
          isSyncing={isSyncing}
          onClose={handleClose}
          onRsvpChange={onRsvpChange}
          onUpdateField={onUpdateField}
          toggleTag={toggleTag}
          onDelete={onDelete}
          handleAddSubGuest={handleAddSubGuest}
          handleDeleteSubGuest={handleDeleteSubGuest}
          handleUpdateSubField={handleUpdateSubField}
        />
      </div>

      {/* Mobile bottom sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 max-h-[90vh] rounded-t-[24px] border-t border-border-rose-18 bg-white/95 shadow-[0_-8px_48px_rgba(180,100,120,0.15)] transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col backdrop-blur-md",
          "flex md:hidden",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
        style={{ zIndex: 9999 }}
      >
        {/* Handle */}
        <div className="flex justify-center py-2.5 shrink-0">
          <div className="h-1 w-12 rounded-full bg-[#D2AAA9]/40" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PanelContent
            guest={guest}
            theme={theme}
            initials={initials}
            guestTags={guestTags}
            tables={tables}
            visualState={visualState}
            isSyncing={isSyncing}
            onClose={handleClose}
            onRsvpChange={onRsvpChange}
            onUpdateField={onUpdateField}
            toggleTag={toggleTag}
            onDelete={onDelete}
            handleAddSubGuest={handleAddSubGuest}
            handleDeleteSubGuest={handleDeleteSubGuest}
            handleUpdateSubField={handleUpdateSubField}
          />
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

// ── Panel Content (shared between desktop & mobile) ──
function PanelContent({
  guest,
  theme,
  initials,
  guestTags,
  tables,
  visualState,
  isSyncing,
  onClose,
  onRsvpChange,
  onUpdateField,
  toggleTag,
  onDelete,
  handleAddSubGuest,
  handleDeleteSubGuest,
  handleUpdateSubField,
}: {
  guest: GuestWithTable;
  theme: AvatarTheme;
  initials: string;
  guestTags: string[];
  tables: SeatingTableRow[];
  visualState: "idle" | "saving" | "saved";
  isSyncing: boolean;
  onClose: () => void;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onUpdateField: (field: string, value: string | boolean | null) => void;
  toggleTag: (tag: string) => void;
  onDelete: () => void;
  handleAddSubGuest: (type: "couple" | "family" | "child") => void;
  handleDeleteSubGuest: (subId: string) => void;
  handleUpdateSubField: (subId: string, field: string, value: string | null) => void;
}) {
  return (
    <div className="flex h-full flex-col font-sans">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border-rose-18/30 shrink-0">
        <div className="flex items-center gap-4 flex-1 mr-4 min-w-0">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br text-base font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
              theme.bg, theme.text
            )}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {/* Inline Names */}
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <input
                type="text"
                defaultValue={guest.first_name}
                key={`fn-${guest.first_name}`}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== guest.first_name) {
                    onUpdateField("first_name", val);
                  }
                }}
                className="font-serif text-lg font-bold text-foreground bg-transparent border-0 p-0 focus:outline-none focus:ring-0 focus:border-b focus:border-[#B8516B]/40 placeholder:text-text-subtle/30 min-w-[90px] hover:bg-[#FEF0F3]/30 rounded px-1 transition-all"
                placeholder="Prenume"
              />
              <input
                type="text"
                defaultValue={guest.last_name ?? ""}
                key={`ln-${guest.last_name}`}
                onBlur={(e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== guest.last_name) {
                    onUpdateField("last_name", val);
                  }
                }}
                className="font-serif text-lg font-bold text-foreground bg-transparent border-0 p-0 focus:outline-none focus:ring-0 focus:border-b focus:border-[#B8516B]/40 placeholder:text-text-subtle/30 min-w-[90px] hover:bg-[#FEF0F3]/30 rounded px-1 transition-all"
                placeholder="Nume"
              />
            </div>
            {guest.plus_one && (
              <p className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-[#B8516B]">
                <Heart className="h-3 w-3 fill-[#B8516B]/10 text-[#B8516B] shrink-0" />
                {guest.plus_one_name || "Partener asociat"}
              </p>
            )}
          </div>
        </div>
        
        {/* Top Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {visualState === "saving" && (
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#B8516B] animate-in fade-in duration-200">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8516B] animate-ping" />
              Salvare...
            </span>
          )}
          {visualState === "saved" && (
            <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 animate-in fade-in slide-in-from-top-1 duration-200">
              <svg className="h-3 w-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Salvat
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary hover:text-[#B8516B] hover:bg-[#FEF0F3] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* RSVP */}
        <div className="animate-fade-in-up" style={{ animationDelay: "30ms" }}>
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
            Status RSVP
          </p>
          <RsvpPill
            status={guest.rsvp_status}
            onChange={(s) => {
              onRsvpChange(guest.id, s);
            }}
          />
        </div>

        {/* Tags */}
        <div className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
            Tag-uri
          </p>
          <div className="flex flex-wrap gap-1.5">
            {GUEST_TAGS.map((tag) => {
              const isActive = guestTags.includes(tag.value);
              const customColorClass = isActive 
                ? (TAG_THEME[tag.value] ?? tag.color) 
                : "border-border-rose-18 bg-[#F3F3F5]/60 text-text-secondary hover:bg-[#FEF0F3]/60 hover:text-[#B8516B] hover:border-[#FCEAEF]";
              
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-[7px] border px-2.5 py-1 text-xs font-semibold transition-all duration-200 ease-out active:scale-95 hover:scale-[1.02] cursor-pointer",
                    customColorClass,
                    isSyncing && "animate-soft-pulse"
                  )}
                >
                  <span className="leading-none text-[11px]">{tag.icon}</span>
                  <span className="tracking-wide">{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact (Inline Editable) */}
        <div className="animate-fade-in-up" style={{ animationDelay: "90ms" }}>
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
            Contact
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-[10px] bg-[#f3f3f5] border border-transparent px-3 py-2.5 hover:bg-[#FEF0F3]/30 focus-within:bg-[#FEF0F3]/15 focus-within:border-border-rose-30 focus-within:ring-2 focus-within:ring-[#B8516B]/5 transition-all duration-200">
              <Phone className="h-4 w-4 text-text-subtle shrink-0" />
              <input
                type="text"
                defaultValue={guest.phone ?? ""}
                key={`ph-${guest.phone}`}
                onBlur={(e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== guest.phone) {
                    onUpdateField("phone", val);
                  }
                }}
                className="flex-1 bg-transparent border-0 p-0 text-xs font-semibold text-foreground focus:outline-none focus:ring-0 placeholder:text-text-subtle/50"
                placeholder="Adăugați telefon..."
              />
            </div>
            <div className="flex items-center gap-3 rounded-[10px] bg-[#f3f3f5] border border-transparent px-3 py-2.5 hover:bg-[#FEF0F3]/30 focus-within:bg-[#FEF0F3]/15 focus-within:border-border-rose-30 focus-within:ring-2 focus-within:ring-[#B8516B]/5 transition-all duration-200">
              <Mail className="h-4 w-4 text-text-subtle shrink-0" />
              <input
                type="email"
                defaultValue={guest.email ?? ""}
                key={`em-${guest.email}`}
                onBlur={(e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== guest.email) {
                    onUpdateField("email", val);
                  }
                }}
                className="flex-1 bg-transparent border-0 p-0 text-xs font-semibold text-foreground focus:outline-none focus:ring-0 placeholder:text-text-subtle/50"
                placeholder="Adăugați email..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
            Masă repartizată
          </p>
          <select
            value={guest.table_id ?? ""}
            onChange={(e) => {
              onUpdateField("table_id", e.target.value || null);
            }}
            className="h-10 w-full rounded-[10px] border border-[#d2aaa9]/20 bg-[#F3F3F5] px-3.5 text-xs font-semibold text-text-secondary outline-none focus:bg-[#FEF0F3]/20 focus:border-[#B8516B]/50 transition-all cursor-pointer"
          >
            <option value="">Fără masă</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Group */}
        <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
            Grup / Familie
          </p>
          <input
            type="text"
            defaultValue={guest.group_name ?? ""}
            key={`gr-${guest.group_name}`}
            onBlur={(e) => {
              const val = e.target.value.trim() || null;
              if (val !== guest.group_name) {
                onUpdateField("group_name", val);
              }
            }}
            placeholder="ex. Familie mireasă, Colegi de facultate..."
            className="h-10 w-full rounded-[10px] border border-[#d2aaa9]/20 bg-[#F3F3F5] px-3.5 text-xs font-semibold text-text-secondary outline-none placeholder:text-text-subtle/50 focus:bg-[#FEF0F3]/20 focus:border-[#B8516B]/50 transition-all"
          />
        </div>

        {/* Associated Guests (Sub-Guests Relationship Management) */}
        <div className="border-t border-border-rose-18/30 pt-5 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-text-subtle">
              Membri asociați
            </p>
            <div className="flex gap-3">
              {!guest.subGuests?.some((s) => s.relationship_type === "couple") && (
                <button
                  type="button"
                  onClick={() => handleAddSubGuest("couple")}
                  className="text-[10px] font-bold text-[#B8516B] hover:text-[#AA3F58] hover:underline cursor-pointer"
                >
                  + Partener
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAddSubGuest("family")}
                className="text-[10px] font-bold text-[#B8516B] hover:text-[#AA3F58] hover:underline cursor-pointer"
              >
                + Familie
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {guest.subGuests && guest.subGuests.length > 0 ? (
              guest.subGuests.map((sub) => {
                const isTemp = sub.id.startsWith("temp-");
                return (
                  <div
                    key={sub.id}
                    className={cn(
                      "flex items-center gap-2 rounded-[12px] bg-[#F3F3F5]/40 p-2.5 border border-border-rose-18/30 shadow-[0_1px_2px_rgba(180,100,120,0.02)] transition-all",
                      isTemp && "pointer-events-none bg-gradient-to-r from-gray-50 via-pink-50/20 to-gray-50 bg-[length:200%_100%] animate-shimmer opacity-85"
                    )}
                  >
                    <div className="min-w-0 flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        defaultValue={sub.first_name}
                        key={`sub-fn-${sub.id}-${sub.first_name}`}
                        disabled={isTemp}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== sub.first_name) {
                            handleUpdateSubField(sub.id, "first_name", val);
                          }
                        }}
                        className="h-8 bg-white border border-[#d2aaa9]/20 rounded-[8px] px-2 text-xs font-semibold outline-none focus:border-[#B8516B]/40 focus:ring-1 focus:ring-[#B8516B]/10 disabled:bg-gray-50 transition-all"
                        placeholder="Prenume"
                      />
                      <input
                        type="text"
                        defaultValue={sub.last_name ?? ""}
                        key={`sub-ln-${sub.id}-${sub.last_name}`}
                        disabled={isTemp}
                        onBlur={(e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== sub.last_name) {
                            handleUpdateSubField(sub.id, "last_name", val);
                          }
                        }}
                        className="h-8 bg-white border border-[#d2aaa9]/20 rounded-[8px] px-2 text-xs font-semibold outline-none focus:border-[#B8516B]/40 focus:ring-1 focus:ring-[#B8516B]/10 disabled:bg-gray-50 transition-all"
                        placeholder="Nume"
                      />
                    </div>
                    <select
                      value={sub.relationship_type ?? "family"}
                      disabled={isTemp}
                      onChange={(e) => handleUpdateSubField(sub.id, "relationship_type", e.target.value)}
                      className="h-8 bg-white border border-[#d2aaa9]/20 rounded-[8px] px-1.5 text-xs font-semibold outline-none focus:border-[#B8516B]/40 focus:ring-1 focus:ring-[#B8516B]/10 disabled:bg-gray-50 transition-all cursor-pointer"
                    >
                      <option value="couple">Partener</option>
                      <option value="family">Familie</option>
                      <option value="child">Copil</option>
                    </select>
                    <button
                      type="button"
                      disabled={isTemp}
                      onClick={() => handleDeleteSubGuest(sub.id)}
                      className="p-1 rounded-lg text-text-secondary hover:text-[#FF3B30] hover:bg-[#FFF0F0] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-text-subtle font-medium italic py-1">Niciun membru asociat.</p>
            )}
          </div>
        </div>

        {/* Dietary */}
        <div className="animate-fade-in-up" style={{ animationDelay: "210ms" }}>
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-text-subtle flex items-center">
            <UtensilsCrossed className="mr-1.5 h-3.5 w-3.5 text-text-subtle" />
            Preferințe alimentare / Alergii
          </p>
          <textarea
            defaultValue={guest.dietary_notes ?? ""}
            key={`dn-${guest.dietary_notes}`}
            onBlur={(e) => {
              const val = e.target.value.trim() || null;
              if (val !== guest.dietary_notes) {
                onUpdateField("dietary_notes", val);
              }
            }}
            placeholder="Vegetarian, vegan, fără gluten, alergie alune, etc..."
            rows={2}
            className="w-full rounded-[10px] border border-[#d2aaa9]/20 bg-[#F3F3F5] px-3.5 py-2.5 text-xs font-semibold text-text-secondary outline-none placeholder:text-text-subtle/50 focus:bg-[#FEF0F3]/20 focus:border-[#B8516B]/50 transition-all resize-none"
          />
        </div>

        {/* Notes */}
        <div className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-text-subtle flex items-center">
            <StickyNote className="mr-1.5 h-3.5 w-3.5 text-text-subtle" />
            Observații / Note
          </p>
          <textarea
            defaultValue={guest.notes ?? ""}
            key={`nt-${guest.notes}`}
            onBlur={(e) => {
              const val = e.target.value.trim() || null;
              if (val !== guest.notes) {
                onUpdateField("notes", val);
              }
            }}
            placeholder="Note suplimentare despre cazare, transport sau cerințe speciale..."
            rows={3}
            className="w-full rounded-[10px] border border-[#d2aaa9]/20 bg-[#F3F3F5] px-3.5 py-2.5 text-xs font-semibold text-text-secondary outline-none placeholder:text-text-subtle/50 focus:bg-[#FEF0F3]/20 focus:border-[#B8516B]/50 transition-all resize-none"
          />
        </div>

        {/* Added date */}
        <p className="text-[10px] font-semibold text-text-faint/80 animate-fade-in-up" style={{ animationDelay: "270ms" }}>
          Adăugat pe {new Date(guest.created_at).toLocaleDateString("ro-RO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#FF3B30]/30 py-2.5 text-xs font-bold text-[#FF3B30] transition-all hover:bg-[#FFF0F0] cursor-pointer animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <Trash2 className="h-4 w-4" />
          Șterge invitatul
        </button>
      </div>
    </div>
  );
}
