"use client";

import { Calendar, MapPin } from "lucide-react";
import Image from "next/image";

import { InvitationCoverImage } from "@/components/invitation/invitation-cover-image";
import {
  getInvitationTemplateMeta,
  getInvitationThemeVars,
} from "@/lib/invitation/resolve-invitation";
import type { PublicInvitationView } from "@/lib/invitation/resolve-invitation";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type PublicInvitationTemplateProps = {
  invitation: PublicInvitationView;
  onRsvpClick?: () => void;
  className?: string;
  preview?: boolean;
};

function Ornament({
  type,
  color,
}: {
  type: ReturnType<typeof getInvitationTemplateMeta>["ornament"];
  color: string;
}) {
  if (type === "none") return null;
  if (type === "floral") {
    return (
      <p className="text-lg tracking-[0.3em]" style={{ color }} aria-hidden>
        ✿ ❀ ✿
      </p>
    );
  }
  if (type === "diamond") {
    return (
      <p className="text-xs tracking-[0.5em] uppercase" style={{ color }} aria-hidden>
        ◆ ◆ ◆
      </p>
    );
  }
  if (type === "line") {
    return (
      <div className="mx-auto h-px w-12" style={{ backgroundColor: color }} aria-hidden />
    );
  }
  return (
    <div className="mx-auto flex items-center gap-2" aria-hidden>
      <div className="h-px w-8" style={{ backgroundColor: color }} />
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <div className="h-px w-8" style={{ backgroundColor: color }} />
    </div>
  );
}

export function PublicInvitationTemplate({
  invitation,
  onRsvpClick,
  className,
  preview = false,
}: PublicInvitationTemplateProps) {
  const t = ro.rsvp.public.invitation;
  const template = getInvitationTemplateMeta(invitation.templateSlug);
  const { colors, fonts } = getInvitationThemeVars(invitation.theme);
  const handleRsvpClick =
    onRsvpClick ??
    (() => {
      document.getElementById("rsvp")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

  const isLuxury = invitation.templateSlug === "luxury";
  const textColor = isLuxury ? "#FAF7F4" : colors.text;
  const mutedColor = isLuxury ? "rgba(250,247,244,0.75)" : colors.textMuted;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl text-center",
        template.wrapperClass,
        preview && "pointer-events-none",
        className
      )}
      style={{
        backgroundColor: isLuxury ? colors.text : colors.background,
        color: textColor,
        ["--inv-primary" as string]: colors.primary,
        ["--inv-border" as string]: colors.border,
        ["--inv-accent" as string]: colors.accent,
      }}
    >
      {invitation.coverImageUrl && (
        <div className="relative w-full">
          <InvitationCoverImage
            src={invitation.coverImageUrl}
            priority={!preview}
            sizes="(max-width: 512px) 100vw, 512px"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isLuxury
                ? "linear-gradient(to bottom, transparent 40%, rgba(26,14,20,0.85))"
                : "linear-gradient(to bottom, transparent 50%, rgba(253,251,247,0.92))",
            }}
          />
        </div>
      )}

      <div className={cn("space-y-8 px-5 py-8 sm:px-8 sm:py-10", invitation.coverImageUrl && "-mt-6 relative z-10")}>
        <div className="space-y-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: isLuxury ? colors.primaryMuted : colors.primary }}
          >
            {t.eyebrow}
          </p>
          <Ornament type={template.ornament} color={colors.primary} />
        </div>

        {invitation.invitationText && (
          <p
            className={cn("mx-auto max-w-sm text-sm leading-relaxed whitespace-pre-line", fonts.bodyClass)}
            style={{ color: mutedColor }}
          >
            {invitation.invitationText}
          </p>
        )}

        {invitation.coupleNames && (
          <h1
            className={cn(
              "text-[2rem] leading-tight font-semibold sm:text-[2.35rem]",
              fonts.headingClass,
              invitation.templateSlug === "modern" && "uppercase tracking-wide text-[1.75rem]"
            )}
            style={{ color: textColor }}
          >
            {invitation.coupleNames}
          </h1>
        )}

        {invitation.parentsLine && (
          <p className="text-xs" style={{ color: mutedColor }}>
            {t.parents}: {invitation.parentsLine}
          </p>
        )}

        {invitation.godparentsLine && (
          <p className="text-xs" style={{ color: mutedColor }}>
            {t.godparents}: {invitation.godparentsLine}
          </p>
        )}

        {invitation.dateFormatted && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: mutedColor }}>
              {t.dateLabel}
            </p>
            <p className={cn("text-xl font-semibold", fonts.headingClass)} style={{ color: textColor }}>
              {invitation.dateFormatted}
            </p>
          </div>
        )}

        {invitation.visibleSchedule.length > 0 && (
          <div className="mx-auto max-w-sm text-left">
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: mutedColor }}>
              {t.schedule}
            </p>
            <ul
              className="space-y-3 rounded-2xl px-4 py-4"
              style={{
                backgroundColor: isLuxury ? "rgba(255,255,255,0.06)" : colors.accent,
                border: `1px solid ${isLuxury ? "rgba(255,255,255,0.12)" : colors.border}`,
              }}
            >
              {invitation.visibleSchedule.map((item, i) => (
                <li
                  key={`${item.label}-${i}`}
                  className="flex gap-3 border-b pb-3 last:border-0 last:pb-0"
                  style={{ borderColor: isLuxury ? "rgba(255,255,255,0.1)" : colors.border }}
                >
                  {item.time && (
                    <span className="w-12 shrink-0 font-mono text-xs font-medium" style={{ color: colors.primary }}>
                      {item.time}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: textColor }}>{item.label}</p>
                    {item.location && (
                      <p className="mt-0.5 text-xs" style={{ color: mutedColor }}>{item.location}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {invitation.venue && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: mutedColor }}>
              {t.location}
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm" style={{ color: textColor }}>
              <MapPin className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              {invitation.venue}
            </p>
          </div>
        )}

        {invitation.dressCode && (
          <div
            className="mx-auto max-w-xs rounded-2xl px-4 py-3"
            style={{ backgroundColor: isLuxury ? "rgba(255,255,255,0.08)" : colors.accent }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: mutedColor }}>
              {t.dressCode}
            </p>
            <p className="mt-1 text-sm" style={{ color: textColor }}>{invitation.dressCode}</p>
          </div>
        )}

        {invitation.accommodationInfo && (
          <InfoBlock label={t.accommodation} text={invitation.accommodationInfo} muted={mutedColor} textColor={textColor} />
        )}

        {invitation.transportInfo && (
          <InfoBlock label={t.transport} text={invitation.transportInfo} muted={mutedColor} textColor={textColor} />
        )}

        {invitation.additionalNotes && (
          <InfoBlock label={t.notes} text={invitation.additionalNotes} muted={mutedColor} textColor={textColor} />
        )}

        {invitation.galleryImageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {invitation.galleryImageUrls.slice(0, 6).map((url, i) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-xl">
                <Image src={url} alt="" fill className="object-cover" sizes="120px" />
              </div>
            ))}
          </div>
        )}

        {invitation.closingMessage && (
          <p className={cn("text-sm italic", fonts.headingClass)} style={{ color: mutedColor }}>
            {invitation.closingMessage}
          </p>
        )}

        {invitation.sections.rsvpCta && !preview && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRsvpClick}
              className="inline-flex min-h-[48px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0 2px 16px ${colors.primary}55`,
              }}
            >
              <Calendar className="h-4 w-4" />
              {t.cta}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function InfoBlock({
  label,
  text,
  muted,
  textColor,
}: {
  label: string;
  text: string;
  muted: string;
  textColor: string;
}) {
  return (
    <div className="mx-auto max-w-sm text-left">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: muted }}>
        {label}
      </p>
      <p className="mt-1 text-sm whitespace-pre-line" style={{ color: textColor }}>
        {text}
      </p>
    </div>
  );
}
