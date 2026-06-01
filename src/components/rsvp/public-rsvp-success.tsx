"use client";

import { Calendar, Check, Download, MapPin } from "lucide-react";

import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  buildMapsUrl,
  downloadIcsFile,
} from "@/lib/rsvp/calendar";
import type { PublicInvitationView } from "@/lib/invitation/resolve-invitation";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type PublicRsvpSuccessProps = {
  invitation: PublicInvitationView;
  householdName?: string;
  onEdit?: () => void;
};

export function PublicRsvpSuccess({
  invitation,
  householdName,
  onEdit,
}: PublicRsvpSuccessProps) {
  const t = ro.rsvp.public.success;

  const calendarTitle = invitation.coupleNames
    ? `${t.calendarTitle} — ${invitation.coupleNames}`
    : invitation.title;

  const calendarEvent = {
    title: calendarTitle,
    description: invitation.invitationText ?? undefined,
    location: invitation.venue ?? undefined,
    startDate: invitation.dateIso ?? new Date().toISOString().slice(0, 10),
  };

  const handleIcs = () => {
    const ics = buildIcsContent(calendarEvent);
    const slug = invitation.coupleNames?.replace(/\s+/g, "-") ?? "eveniment";
    downloadIcsFile(ics, `${slug}.ics`);
  };

  return (
    <div className="py-8 text-center animate-in fade-in duration-500">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF0F3] text-[#B8516B]">
        <Check className="h-8 w-8" strokeWidth={2} />
      </div>
      <h2 className="font-serif text-2xl font-semibold text-[#1A0E14]">
        {t.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {householdName ? t.descNamed.replace("{name}", householdName) : t.desc}
      </p>

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        {invitation.dateIso && (
          <a
            href={buildGoogleCalendarUrl(calendarEvent)}
            target="_blank"
            rel="noopener noreferrer"
            className={actionBtnClass}
          >
            <Calendar className="h-4 w-4" />
            {t.addGoogleCalendar}
          </a>
        )}
        {invitation.dateIso && (
          <button type="button" onClick={handleIcs} className={actionBtnClass}>
            <Download className="h-4 w-4" />
            {t.downloadIcs}
          </button>
        )}
        {invitation.venue && (
          <a
            href={buildMapsUrl(invitation.venue)}
            target="_blank"
            rel="noopener noreferrer"
            className={actionBtnClass}
          >
            <MapPin className="h-4 w-4" />
            {t.openMaps}
          </a>
        )}
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-8 text-sm font-medium text-[#B8516B] underline-offset-2 hover:underline"
        >
          {t.editResponse}
        </button>
      )}
    </div>
  );
}

const actionBtnClass = cn(
  "inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl",
  "border border-[#FCEAEF] bg-white px-4 text-sm font-medium text-[#1A0E14]",
  "shadow-sm transition-colors hover:bg-[#FEF8F9] active:scale-[0.99]"
);
