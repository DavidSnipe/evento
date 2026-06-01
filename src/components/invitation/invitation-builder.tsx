"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ImagePlus,
  Loader2,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";

import {
  removeInvitationCover,
  saveEventInvitation,
  uploadInvitationCover,
} from "@/app/(dashboard)/dashboard/events/[id]/rsvp/invitation/actions";
import { InvitationCoverImage } from "@/components/invitation/invitation-cover-image";
import { PublicInvitationTemplate } from "@/components/invitation/public-invitation-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { previewInvitationView } from "@/lib/invitation/resolve-invitation";
import {
  COLOR_PRESETS,
  FONT_PRESETS,
  INVITATION_TEMPLATES,
} from "@/lib/invitation/templates/registry";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import type {
  InvitationBuilderState,
  InvitationScheduleItem,
  InvitationSections,
  ScheduleItemKind,
} from "@/types/invitation";
import type { EventType } from "@/types";

type InvitationBuilderProps = {
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  rsvpSlug: string | null;
  initialState: InvitationBuilderState;
  storageReady?: boolean;
};

const textareaClass =
  "flex min-h-[72px] w-full rounded-xl border border-[rgba(210,170,185,0.25)] bg-[#FDFBF7] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8516B]/15";

const SECTION_KEYS: (keyof InvitationSections)[] = [
  "invitationText",
  "coupleNames",
  "parents",
  "godparents",
  "date",
  "schedule",
  "venue",
  "civilCeremony",
  "religiousCeremony",
  "party",
  "dressCode",
  "accommodation",
  "transport",
  "additionalNotes",
  "gallery",
  "closingMessage",
  "rsvpCta",
];

export function InvitationBuilder({
  eventId,
  eventTitle,
  eventType,
  rsvpSlug,
  initialState,
  storageReady = true,
}: InvitationBuilderProps) {
  const t = ro.invitationBuilder;
  const [state, setState] = useState<InvitationBuilderState>(initialState);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverUploadInProgress = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSave = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const preview = useMemo(
    () =>
      previewInvitationView(state, {
        eventId,
        eventType,
        fallbackTitle: eventTitle,
      }),
    [state, eventId, eventType, eventTitle]
  );

  const persist = useCallback(async () => {
    if (coverUploadInProgress.current) return;
    setSaveStatus("saving");
    const res = await saveEventInvitation(eventId, stateRef.current);
    if (res.error) {
      setSaveStatus("error");
      return;
    }
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [eventId]);

  useEffect(() => {
    if (!storageReady) return;
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist();
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, persist, storageReady]);

  const updateContent = <K extends keyof InvitationBuilderState["content"]>(
    key: K,
    value: InvitationBuilderState["content"][K]
  ) => {
    setState((s) => ({
      ...s,
      content: { ...s.content, [key]: value },
    }));
  };

  const updateSection = (key: keyof InvitationSections, value: boolean) => {
    setState((s) => ({
      ...s,
      sections: { ...s.sections, [key]: value },
    }));
  };

  const updateScheduleItem = (
    index: number,
    patch: Partial<InvitationScheduleItem>
  ) => {
    setState((s) => ({
      ...s,
      content: {
        ...s.content,
        schedule: s.content.schedule.map((item, i) =>
          i === index ? { ...item, ...patch } : item
        ),
      },
    }));
  };

  const addScheduleItem = (kind: ScheduleItemKind = "other") => {
    setState((s) => ({
      ...s,
      content: {
        ...s.content,
        schedule: [
          ...s.content.schedule,
          { time: null, label: "", location: null, kind },
        ],
      },
    }));
  };

  const removeScheduleItem = (index: number) => {
    setState((s) => ({
      ...s,
      content: {
        ...s.content,
        schedule: s.content.schedule.filter((_, i) => i !== index),
      },
    }));
  };

  const handleCoverUpload = async (file: File) => {
    setCoverError(null);
    setUploadingCover(true);
    coverUploadInProgress.current = true;

    try {
      const formData = new FormData();
      formData.append("cover", file);

      const res = await uploadInvitationCover(eventId, formData);
      if (res.error || !res.coverImageUrl) {
        setCoverError(res.error ?? t.coverUploadError);
        setSaveStatus("error");
        return;
      }

      setState((s) => ({ ...s, coverImageUrl: res.coverImageUrl! }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setCoverError(t.coverUploadError);
      setSaveStatus("error");
    } finally {
      coverUploadInProgress.current = false;
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleRemoveCover = async () => {
    setCoverError(null);
    setUploadingCover(true);
    coverUploadInProgress.current = true;

    try {
      const res = await removeInvitationCover(eventId);
      if (res.error) {
        setCoverError(res.error);
        setSaveStatus("error");
        return;
      }
      setState((s) => ({ ...s, coverImageUrl: null }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setCoverError(t.coverRemoveError);
      setSaveStatus("error");
    } finally {
      coverUploadInProgress.current = false;
      setUploadingCover(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6 order-2 xl:order-1">
        {/* Templates */}
        <section className="rounded-2xl border border-[#FCEAEF]/80 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-[#1A0E14]">{t.templates}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{t.templatesDesc}</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {INVITATION_TEMPLATES.map((tpl) => (
              <button
                key={tpl.slug}
                type="button"
                onClick={() => setState((s) => ({ ...s, templateSlug: tpl.slug }))}
                className={cn(
                  "rounded-xl border p-2 text-left transition-all",
                  state.templateSlug === tpl.slug
                    ? "border-[#B8516B] ring-2 ring-[#B8516B]/20"
                    : "border-slate-200 hover:border-[#FCEAEF]"
                )}
              >
                <div className={cn("h-14 rounded-lg mb-2", tpl.previewClass)} />
                <p className="text-xs font-semibold text-[#1A0E14]">{tpl.name}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Theme */}
        <section className="rounded-2xl border border-[#FCEAEF]/80 bg-white p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#1A0E14]">{t.theme}</h2>
          <div>
            <Label className="text-xs text-text-subtle">{t.colors}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      theme: { ...s.theme, colorPreset: p.id },
                    }))
                  }
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    state.theme.colorPreset === p.id
                      ? "border-[#1A0E14] scale-110"
                      : "border-white shadow-sm"
                  )}
                  style={{ backgroundColor: p.primary }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-text-subtle">{t.fonts}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FONT_PRESETS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      theme: { ...s.theme, fontPreset: f.id },
                    }))
                  }
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium",
                    state.theme.fontPreset === f.id
                      ? "border-[#B8516B] bg-[#FEF0F3] text-[#B8516B]"
                      : "border-slate-200 text-text-secondary"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Cover */}
        <section className="rounded-2xl border border-[#FCEAEF]/80 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-[#1A0E14]">{t.cover}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{t.coverDesc}</p>

          {state.coverImageUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-[#FCEAEF] max-w-xs">
              <InvitationCoverImage
                src={state.coverImageUrl}
                priority
                aspectClassName="aspect-[16/10]"
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#FCEAEF] px-4 py-3 text-xs font-medium text-[#B8516B] hover:bg-[#FEF8F9]",
                uploadingCover && "pointer-events-none opacity-60"
              )}
            >
              {uploadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {state.coverImageUrl ? t.replaceCover : t.uploadCover}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                className="sr-only"
                disabled={uploadingCover || !storageReady}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleCoverUpload(f);
                }}
              />
            </label>
            {state.coverImageUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingCover}
                onClick={() => void handleRemoveCover()}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {t.removeCover}
              </Button>
            )}
          </div>

          {coverError && (
            <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {coverError}
            </p>
          )}
        </section>

        {/* Content */}
        <section className="rounded-2xl border border-[#FCEAEF]/80 bg-white p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#1A0E14]">{t.content}</h2>

          <Field label={t.fields.coupleNames}>
            <Input
              value={state.content.coupleNames ?? ""}
              onChange={(e) => updateContent("coupleNames", e.target.value || null)}
              className="rounded-xl"
            />
          </Field>

          <Field label={t.fields.invitationText}>
            <textarea
              className={textareaClass}
              value={state.content.invitationText ?? ""}
              onChange={(e) => updateContent("invitationText", e.target.value || null)}
              rows={3}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.fields.date}>
              <Input
                type="date"
                value={state.content.dateIso ?? ""}
                onChange={(e) => updateContent("dateIso", e.target.value || null)}
                className="rounded-xl"
              />
            </Field>
            <Field label={t.fields.venue}>
              <Input
                value={state.content.venue ?? ""}
                onChange={(e) => updateContent("venue", e.target.value || null)}
                className="rounded-xl"
              />
            </Field>
          </div>

          <Field label={t.fields.parents}>
            <Input
              value={state.content.parentsLine ?? ""}
              onChange={(e) => updateContent("parentsLine", e.target.value || null)}
              className="rounded-xl"
            />
          </Field>

          <Field label={t.fields.godparents}>
            <Input
              value={state.content.godparentsLine ?? ""}
              onChange={(e) => updateContent("godparentsLine", e.target.value || null)}
              className="rounded-xl"
            />
          </Field>

          <Field label={t.fields.dressCode}>
            <Input
              value={state.content.dressCode ?? ""}
              onChange={(e) => updateContent("dressCode", e.target.value || null)}
              className="rounded-xl"
            />
          </Field>

          <Field label={t.fields.closing}>
            <Input
              value={state.content.closingMessage ?? ""}
              onChange={(e) => updateContent("closingMessage", e.target.value || null)}
              className="rounded-xl"
            />
          </Field>

          <Field label={t.fields.accommodation}>
            <textarea
              className={textareaClass}
              value={state.content.accommodationInfo ?? ""}
              onChange={(e) => updateContent("accommodationInfo", e.target.value || null)}
              rows={2}
            />
          </Field>

          <Field label={t.fields.transport}>
            <textarea
              className={textareaClass}
              value={state.content.transportInfo ?? ""}
              onChange={(e) => updateContent("transportInfo", e.target.value || null)}
              rows={2}
            />
          </Field>

          <Field label={t.fields.notes}>
            <textarea
              className={textareaClass}
              value={state.content.additionalNotes ?? ""}
              onChange={(e) => updateContent("additionalNotes", e.target.value || null)}
              rows={2}
            />
          </Field>

          {/* Schedule editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-text-subtle">{t.fields.schedule}</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addScheduleItem()}>
                + {t.addSchedule}
              </Button>
            </div>
            <div className="space-y-2">
              {state.content.schedule.map((item, i) => (
                <div key={i} className="flex flex-wrap gap-2 rounded-xl border border-slate-100 p-2">
                  <Input
                    placeholder="10:00"
                    value={item.time ?? ""}
                    onChange={(e) => updateScheduleItem(i, { time: e.target.value || null })}
                    className="w-20 h-9 rounded-lg text-xs"
                  />
                  <Input
                    placeholder={t.scheduleLabel}
                    value={item.label}
                    onChange={(e) => updateScheduleItem(i, { label: e.target.value })}
                    className="flex-1 min-w-[120px] h-9 rounded-lg text-xs"
                  />
                  <select
                    value={item.kind ?? "other"}
                    onChange={(e) =>
                      updateScheduleItem(i, { kind: e.target.value as ScheduleItemKind })
                    }
                    className="h-9 rounded-lg border border-input px-2 text-xs"
                  >
                    <option value="civil">{t.scheduleKinds.civil}</option>
                    <option value="religious">{t.scheduleKinds.religious}</option>
                    <option value="party">{t.scheduleKinds.party}</option>
                    <option value="other">{t.scheduleKinds.other}</option>
                  </select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeScheduleItem(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sections toggles */}
        <section className="rounded-2xl border border-[#FCEAEF]/80 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-[#1A0E14]">{t.sections}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{t.sectionsDesc}</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SECTION_KEYS.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs cursor-pointer hover:bg-[#FEF8F9]"
              >
                <input
                  type="checkbox"
                  checked={state.sections[key]}
                  onChange={(e) => updateSection(key, e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>{t.sectionLabels[key]}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      {/* Preview panel */}
      <div className="order-1 xl:order-2 xl:sticky xl:top-4 xl:self-start space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={cn(
                "rounded-md p-1.5",
                previewMode === "mobile" ? "bg-[#FEF0F3] text-[#B8516B]" : "text-text-secondary"
              )}
              title={t.previewMobile}
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={cn(
                "rounded-md p-1.5",
                previewMode === "desktop" ? "bg-[#FEF0F3] text-[#B8516B]" : "text-text-secondary"
              )}
              title={t.previewDesktop}
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-subtle">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> {t.saving}
              </>
            )}
            {saveStatus === "saved" && t.saved}
            {saveStatus === "error" && <span className="text-destructive">{t.saveError}</span>}
            {rsvpSlug && (
              <Link
                href={`/rsvp/${rsvpSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-[#B8516B] hover:underline"
              >
                {t.previewLive}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mx-auto overflow-hidden rounded-[2rem] border-8 border-[#1A0E14]/90 shadow-2xl transition-all bg-[#FDFBF7]",
            previewMode === "mobile" ? "max-w-[340px]" : "max-w-full w-full"
          )}
        >
          <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
            <PublicInvitationTemplate invitation={preview} preview />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-text-subtle mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
