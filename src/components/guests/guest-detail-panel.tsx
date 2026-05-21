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

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
          "fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out",
          "hidden md:flex md:flex-col",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
        style={{ zIndex: 9999 }}
      >
        <PanelContent
          guest={guest}
          fullName={fullName}
          gradient={gradient}
          initials={initials}
          guestTags={guestTags}
          tables={tables}
          onClose={handleClose}
          onRsvpChange={onRsvpChange}
          onUpdateField={onUpdateField}
          toggleTag={toggleTag}
          onDelete={onDelete}
        />
      </div>

      {/* Mobile bottom sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out",
          "flex flex-col md:hidden",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
        style={{ zIndex: 9999 }}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PanelContent
            guest={guest}
            fullName={fullName}
            gradient={gradient}
            initials={initials}
            guestTags={guestTags}
            tables={tables}
            onClose={handleClose}
            onRsvpChange={onRsvpChange}
            onUpdateField={onUpdateField}
            toggleTag={toggleTag}
            onDelete={onDelete}
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
  fullName,
  gradient,
  initials,
  guestTags,
  tables,
  onClose,
  onRsvpChange,
  onUpdateField,
  toggleTag,
  onDelete,
}: {
  guest: GuestWithTable;
  fullName: string;
  gradient: string;
  initials: string;
  guestTags: string[];
  tables: SeatingTableRow[];
  onClose: () => void;
  onRsvpChange: (guestId: string, status: RsvpStatus) => void;
  onUpdateField: (field: string, value: string | boolean | null) => void;
  toggleTag: (tag: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-md",
              gradient
            )}
          >
            {initials}
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-foreground">
              {fullName}
            </h2>
            {guest.plus_one && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <Heart className="h-3 w-3 text-rose-400" />
                {guest.plus_one_name || "+1"}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
        {/* RSVP */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status RSVP
          </p>
          <RsvpPill
            status={guest.rsvp_status}
            onChange={(s) => onRsvpChange(guest.id, s)}
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
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
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

        {/* Contact */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {guest.phone || "Fără telefon"}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {guest.email || "Fără email"}
              </span>
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
            onChange={(e) => onUpdateField("table_id", e.target.value || null)}
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
            onBlur={(e) => onUpdateField("group_name", e.target.value || null)}
            placeholder="ex. Familie mireasă"
            className="h-10 w-full rounded-xl border border-border/40 bg-muted/20 px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Dietary */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <UtensilsCrossed className="mr-1 inline h-3.5 w-3.5" />
            Preferințe alimentare
          </p>
          <textarea
            defaultValue={guest.dietary_notes ?? ""}
            onBlur={(e) => onUpdateField("dietary_notes", e.target.value || null)}
            placeholder="Vegetarian, alergii, etc."
            rows={2}
            className="w-full rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <StickyNote className="mr-1 inline h-3.5 w-3.5" />
            Note
          </p>
          <textarea
            defaultValue={guest.notes ?? ""}
            onBlur={(e) => onUpdateField("notes", e.target.value || null)}
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
