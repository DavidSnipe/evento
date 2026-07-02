"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";

import { ro } from "@/lib/i18n/ro";

export function VendorHintBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const visible = searchParams.get("vendor_hint") === "1";

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("vendor_hint");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [visible, router]);

  if (!visible) return null;

  const dismiss = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("vendor_hint");
    router.replace(url.pathname + url.search, { scroll: false });
  };

  return (
    <div className="mb-6 flex items-start justify-between gap-3 rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-blush)]/25 px-4 py-3">
      <p className="text-sm text-[var(--dash-text)]">{ro.auth.signupRole.vendorHintBanner}</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-[var(--dash-text-muted)] hover:bg-[var(--dash-blush)]/40 hover:text-[var(--dash-text)]"
        aria-label="Închide"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
