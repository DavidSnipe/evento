"use client";

import { useCallback, useState } from "react";
import { Calendar, Check, Copy, Link2, RefreshCw } from "lucide-react";

import { regenerateCalendarSubscriptionToken } from "@/app/(dashboard)/dashboard/events/[id]/settings/calendar/actions";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type CalendarSubscriptionSettingsProps = {
  eventId: string;
  httpsUrl: string;
  webcalUrl: string;
  canManage: boolean;
};

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function CalendarSubscriptionSettings({
  eventId,
  httpsUrl,
  webcalUrl,
  canManage,
}: CalendarSubscriptionSettingsProps) {
  const [httpsUrlState, setHttpsUrlState] = useState(httpsUrl);
  const [webcalUrlState, setWebcalUrlState] = useState(webcalUrl);
  const [copied, setCopied] = useState<"https" | "webcal" | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(async (value: string, kind: "https" | "webcal") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(ro.calendar.subscription.copyFailed);
    }
  }, []);

  const handleSubscribe = () => {
    if (isAppleMobile()) {
      window.location.href = webcalUrlState;
      return;
    }
    void copy(httpsUrlState, "https");
  };

  const handleRegenerate = async () => {
    if (!canManage) return;
    setRegenerating(true);
    setError(null);
    const result = await regenerateCalendarSubscriptionToken(eventId);
    setRegenerating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.token) {
      const base = httpsUrlState.replace(/\/[^/]+\.ics$/, "");
      const nextHttps = `${base}/${result.token}.ics`;
      setHttpsUrlState(nextHttps);
      setWebcalUrlState(nextHttps.replace(/^https?:/, "webcal:"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[rgba(210,170,185,0.2)] bg-gradient-to-br from-[#FEF8F9] to-white p-5">
        <h2 className="font-serif text-lg font-semibold text-[#1A0E14]">
          {ro.calendar.subscription.title}
        </h2>
        <p className="mt-1 text-sm text-text-secondary leading-relaxed">
          {ro.calendar.subscription.desc}
        </p>
      </div>

      <div className="rounded-2xl border border-[rgba(210,170,185,0.2)] bg-white p-5 space-y-4">
        <Button type="button" onClick={handleSubscribe} className="gap-2 min-h-[48px]">
          <Calendar className="h-4 w-4" />
          {ro.calendar.subscription.subscribe}
        </Button>

        <UrlField
          label={ro.calendar.subscription.httpsUrl}
          value={httpsUrlState}
          onCopy={() => copy(httpsUrlState, "https")}
          copied={copied === "https"}
        />

        <UrlField
          label={ro.calendar.subscription.webcalUrl}
          value={webcalUrlState}
          onCopy={() => copy(webcalUrlState, "webcal")}
          copied={copied === "webcal"}
        />

        <p className="text-xs text-text-subtle leading-relaxed">
          {ro.calendar.compatibleHint}
        </p>

        {canManage && (
          <div className="pt-2 border-t border-[rgba(210,170,185,0.15)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={handleRegenerate}
              className="gap-2"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
              {ro.calendar.subscription.regenerate}
            </Button>
            <p className="mt-2 text-[11px] text-text-subtle">
              {ro.calendar.subscription.regenerateHint}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function UrlField({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
        {label}
      </span>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[rgba(210,170,185,0.25)] bg-[#F3F3F5] px-3 py-2.5 text-xs text-[#1A0E14]">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
          <span className="truncate font-mono">{value}</span>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onCopy} className="shrink-0 gap-1.5">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? ro.calendar.subscription.copied : ro.calendar.subscription.copy}
        </Button>
      </div>
    </label>
  );
}
