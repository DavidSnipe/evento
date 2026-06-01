"use client";

import { useCallback, useState } from "react";
import { Calendar, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type CalendarSubscribeButtonProps = {
  httpsUrl: string;
  webcalUrl: string;
  variant?: "default" | "secondary" | "outline";
  size?: "sm" | "default";
  className?: string;
};

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function CalendarSubscribeButton({
  httpsUrl,
  webcalUrl,
  variant = "secondary",
  size = "sm",
  className,
}: CalendarSubscribeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    if (isAppleMobile()) {
      window.location.href = webcalUrl;
      return;
    }
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(ro.calendar.subscription.copyPrompt, httpsUrl);
    }
  }, [httpsUrl, webcalUrl]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn("gap-1.5", className)}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Calendar className="h-3.5 w-3.5" />
      )}
      {copied ? ro.calendar.subscription.copied : ro.calendar.subscription.subscribe}
    </Button>
  );
}

export function CalendarSubscribeMenuActions({
  httpsUrl,
  webcalUrl,
}: {
  httpsUrl: string;
  webcalUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleSubscribe = () => {
    if (isAppleMobile()) {
      window.location.href = webcalUrl;
      return;
    }
    void navigator.clipboard.writeText(httpsUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        window.prompt(ro.calendar.subscription.copyPrompt, httpsUrl);
      }
    );
  };

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#FEF0F3]/60 min-h-[44px]"
    >
      {copied ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Calendar className="h-3.5 w-3.5 shrink-0" />}
      {copied ? ro.calendar.subscription.copied : ro.calendar.subscription.subscribe}
    </button>
  );
}
