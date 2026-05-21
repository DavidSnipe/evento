"use client";

import { useState, useEffect } from "react";
import { X, Phone, Mail, StickyNote, UtensilsCrossed, Trash2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { RsvpPill } from "@/components/guests/rsvp-pill";
import { GUEST_TAGS } from "@/types/guests";
import type { GuestWithTable, RsvpStatus, SeatingTableRow } from "@/types/guests";
import { createSubGuest, deleteSubGuest, updateGuestField } from "@/app/(dashboard)/dashboard/events/[id]/guests/actions";

type GuestDetailPanelProps = {
  guest: GuestWithTable;
  tables: SeatingTableRow[];
  onClose: () => void;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateField: (field: string, value: string | boolean | null) => void;
  onDelete: () => void;
};

function getAvatarGradient(name: string): string {
  const gradients = [
    "from-rose-300 to-pink-400",
    "from-violet-300 to-purple-400",
    "from-sky-300 to-blue-400",
    "from-emerald-300 to-green-400",
    "from-amber-300 to-orange-400",
    "from-teal-300 to-cyan-400",
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
}: GuestDetailPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const triggerAutoSave = () => {
    setSaveStatus("saved");
  };

  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const fullName = `${guest.first_name} ${guest.last_name ?? ""}`.trim();
  const gradient = getAvatarGradient(fullName);
  const initials = `${guest.first_name.charAt(0)}${guest.last_name?.charAt(0) ?? ""}`.toUpperCase();
  const guestTags = guest.tags ?? [];

  const toggleTag = (tag: string) => {
    const newTags = guestTags.includes(tag)
      ? guestTags.filter((t) => t !== tag)
      : [...guestTags, tag];
    onUpdateTags(newTags);
    triggerAutoSave();
  };

  const handleAddSubGuest = async (type: "couple" | "family" | "child") => {
    const res = await createSubGuest(guest.event_id, guest.id, type);
    if (res.error) {
      alert(res.error);
    } else {
      triggerAutoSave();
    }
  };

  const handleDeleteSubGuest = async (subId: string) => {
    if (!confirm("Ștergi acest membru asociat?")) return;
    const res = await deleteSubGuest(guest.event_id, subId);
    if (res.error) {
      alert(res.error);
    } else {
      triggerAutoSave();
    }
  };

  const handleUpdateSubField = async (subId: string, field: string, value: string | null) => {
    const res = await updateGuestField(guest.event_id, subId, field, value);
    if (res.error) {
      alert(res.error);
    } else {
      triggerAutoSave();
    }
  };

  const content = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/30 transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ zIndex: 9998 }}
        onClick={handleClose}
      />

      {/* Panel - Desktop: right side, Mobile: bottom sheet */}
      <div
        className={cn(
          // Desktop
          "fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col",
          "hidden md:flex",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
        style={{ zIndex: 9999 }}
      >
        <PanelContent
          guest={guest}
          gradient={gradient}
          initials={initials}
          guestTags={guestTags}
          tables={tables}
          saveStatus={saveStatus}
          onClose={handleClose}
          onRsvpChange={onRsvpChange}
          onUpdateField={onUpdateField}
          toggleTag={toggleTag}
          onDelete={onDelete}
          triggerAutoSave={triggerAutoSave}
          handleAddSubGuest={handleAddSubGuest}
          handleDeleteSubGuest={handleDeleteSubGuest}
          handleUpdateSubField={handleUpdateSubField}
        />
      </div>

      {/* Mobile bottom sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col",
          "flex md:hidden",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
        style={{ zIndex: 9999 }}
      >
        {/* Handle */}
        <div className="flex justify-center py-2 shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PanelContent
            guest={guest}
            gradient={gradient}
            initials={initials}
            guestTags={guestTags}
            tables={tables}
            saveStatus={saveStatus}
            onClose={handleClose}
            onRsvpChange={onRsvpChange}
            onUpdateField={onUpdateField}
            toggleTag={toggleTag}
            onDelete={onDelete}
            triggerAutoSave={triggerAutoSave}
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
  gradient,
  initials,
  guestTags,
  tables,
  saveStatus,
  onClose,
  onRsvpChange,
  onUpdateField,
  toggleTag,
  onDelete,
  triggerAutoSave,
  handleAddSubGuest,
  handleDeleteSubGuest,
  handleUpdateSubField,
}: {
  guest: GuestWithTable;
  gradient: string;
  initials: string;
  guestTags: string[];
  tables: SeatingTableRow[];
  saveStatus: "idle" | "saved";
  onClose: () => void;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onUpdateField: (field: string, value: string | boolean | null) => void;
  toggleTag: (tag: string) => void;
  onDelete: () => void;
  triggerAutoSave: () => void;
  handleAddSubGuest: (type: "couple" | "family" | "child") => void;
  handleDeleteSubGuest: (subId: string) => void;
  handleUpdateSubField: (subId: string, field: string, value: string | null) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border/10 shrink-0">
        <div className="flex items-center gap-4 flex-1 mr-4 min-w-0">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-md",
              gradient
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
                    triggerAutoSave();
                  }
                }}
                className="font-serif text-lg font-semibold text-foreground bg-transparent border-0 p-0 focus:outline-none focus:ring-0 focus:border-b-2 focus:border-primary/20 placeholder:text-muted-foreground/30 min-w-[100px]"
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
                    triggerAutoSave();
                  }
                }}
                className="font-serif text-lg font-semibold text-foreground bg-transparent border-0 p-0 focus:outline-none focus:ring-0 focus:border-b-2 focus:border-primary/20 placeholder:text-muted-foreground/30 min-w-[100px]"
                placeholder="Nume de familie"
              />
            </div>
            {guest.plus_one && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="h-3 w-3 text-rose-400" />
                {guest.plus_one_name || "Partener asociat"}
              </p>
            )}
          </div>
        </div>
        
        {/* Top Actions */}
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 animate-in fade-in slide-in-from-top-1 duration-200">
              <svg className="h-3.5 w-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Salvat
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* RSVP */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status RSVP
          </p>
          <RsvpPill
            status={guest.rsvp_status}
            onChange={(s) => {
              onRsvpChange(guest.id, s);
              triggerAutoSave();
            }}
          />
        </div>

        {/* Tags */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tag-uri
          </p>
          <div className="flex flex-wrap gap-1.5">
            {GUEST_TAGS.map((tag) => {
              const isActive = guestTags.includes(tag.value);
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all transform duration-150 active:scale-95 hover:scale-[1.02]",
                    isActive
                      ? tag.color
                      : "border-border/40 bg-muted/30 text-muted-foreground/60 hover:bg-muted/50"
                  )}
                >
                  <span>{tag.icon}</span>
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact (Inline Editable) */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3.5 py-2 hover:bg-muted/50 transition-colors">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                defaultValue={guest.phone ?? ""}
                key={`ph-${guest.phone}`}
                onBlur={(e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== guest.phone) {
                    onUpdateField("phone", val);
                    triggerAutoSave();
                  }
                }}
                className="flex-1 bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                placeholder="Adăugați telefon..."
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3.5 py-2 hover:bg-muted/50 transition-colors">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="email"
                defaultValue={guest.email ?? ""}
                key={`em-${guest.email}`}
                onBlur={(e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== guest.email) {
                    onUpdateField("email", val);
                    triggerAutoSave();
                  }
                }}
                className="flex-1 bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                placeholder="Adăugați email..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Masă
          </p>
          <select
            value={guest.table_id ?? ""}
            onChange={(e) => {
              onUpdateField("table_id", e.target.value || null);
              triggerAutoSave();
            }}
            className="h-10 w-full rounded-xl border border-border/40 bg-muted/20 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
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
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Grup
          </p>
          <input
            type="text"
            defaultValue={guest.group_name ?? ""}
            key={`gr-${guest.group_name}`}
            onBlur={(e) => {
              const val = e.target.value.trim() || null;
              if (val !== guest.group_name) {
                onUpdateField("group_name", val);
                triggerAutoSave();
              }
            }}
            placeholder="ex. Familie mireasă"
            className="h-10 w-full rounded-xl border border-border/40 bg-muted/20 px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Associated Guests (Sub-Guests Relationship Management) */}
        <div className="border-t border-border/20 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Membri asociați (Cuplu / Familie)
            </p>
            <div className="flex gap-2">
              {!guest.subGuests?.some((s) => s.relationship_type === "couple") && (
                <button
                  type="button"
                  onClick={() => handleAddSubGuest("couple")}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  + Partener (Cuplu)
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAddSubGuest("family")}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                + Familie
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {guest.subGuests && guest.subGuests.length > 0 ? (
              guest.subGuests.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 rounded-xl bg-muted/20 p-2 border border-border/30 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
                  <div className="min-w-0 flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      defaultValue={sub.first_name}
                      key={`sub-fn-${sub.id}-${sub.first_name}`}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && val !== sub.first_name) {
                          handleUpdateSubField(sub.id, "first_name", val);
                        }
                      }}
                      className="h-8 bg-white border border-border/30 rounded-lg px-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="Prenume"
                    />
                    <input
                      type="text"
                      defaultValue={sub.last_name ?? ""}
                      key={`sub-ln-${sub.id}-${sub.last_name}`}
                      onBlur={(e) => {
                        const val = e.target.value.trim() || null;
                        if (val !== sub.last_name) {
                          handleUpdateSubField(sub.id, "last_name", val);
                        }
                      }}
                      className="h-8 bg-white border border-border/30 rounded-lg px-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="Nume"
                    />
                  </div>
                  <select
                    value={sub.relationship_type ?? "family"}
                    onChange={(e) => handleUpdateSubField(sub.id, "relationship_type", e.target.value)}
                    className="h-8 bg-white border border-border/30 rounded-lg px-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="couple">Partener</option>
                    <option value="family">Familie</option>
                    <option value="child">Copil</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubGuest(sub.id)}
                    className="p-1 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">Niciun membru asociat.</p>
            )}
          </div>
        </div>

        {/* Dietary */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
            <UtensilsCrossed className="mr-1.5 h-3.5 w-3.5" />
            Preferințe alimentare
          </p>
          <textarea
            defaultValue={guest.dietary_notes ?? ""}
            key={`dn-${guest.dietary_notes}`}
            onBlur={(e) => {
              const val = e.target.value.trim() || null;
              if (val !== guest.dietary_notes) {
                onUpdateField("dietary_notes", val);
                triggerAutoSave();
              }
            }}
            placeholder="Vegetarian, alergii, etc."
            rows={2}
            className="w-full rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
            <StickyNote className="mr-1.5 h-3.5 w-3.5" />
            Note
          </p>
          <textarea
            defaultValue={guest.notes ?? ""}
            key={`nt-${guest.notes}`}
            onBlur={(e) => {
              const val = e.target.value.trim() || null;
              if (val !== guest.notes) {
                onUpdateField("notes", val);
                triggerAutoSave();
              }
            }}
            placeholder="Note suplimentare..."
            rows={3}
            className="w-full rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Added date */}
        <p className="text-xs text-muted-foreground/60">
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
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
        >
          <Trash2 className="h-4 w-4" />
          Șterge invitatul
        </button>
      </div>
    </div>
  );
}
