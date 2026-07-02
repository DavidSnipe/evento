"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";

import { ro } from "@/lib/i18n/ro";

export function VendorAccessNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const visible = searchParams.get("notice") === "vendor_required";

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("notice");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [visible, router]);

  if (!visible) return null;

  const dismiss = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    router.replace(url.pathname + url.search, { scroll: false });
  };

  return (
    <div className="mb-6 flex items-start justify-between gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-900">{ro.auth.modeSwitch.vendorRequired}</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100"
        aria-label="Închide"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
