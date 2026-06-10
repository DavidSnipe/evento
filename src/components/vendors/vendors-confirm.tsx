"use client";

import * as React from "react";
import { GeistSans } from "geist/font/sans";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import "@/components/layout/dashboard-foundation.css";
import "./vendors-theme.css";

export type VendorsConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
};

export function useVendorsConfirm() {
  const [mounted, setMounted] = React.useState(false);
  const [state, setState] = React.useState<{
    options: VendorsConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (state) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [state]);

  const confirm = React.useCallback((options: VendorsConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const close = React.useCallback(
    (value: boolean) => {
      if (!state) return;
      state.resolve(value);
      setState(null);
      setLoading(false);
    },
    [state]
  );

  const dialog =
    state && mounted
      ? createPortal(
          <div className={cn("dashboard-shell vendors-workspace", GeistSans.className)}>
            <>
            <div
              className="fixed inset-0 z-[10000] h-[100dvh] w-screen bg-[#1C1816]/20 backdrop-blur-[1px]"
              onClick={() => close(false)}
              aria-hidden
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="vendors-confirm-title"
              aria-describedby="vendors-confirm-desc"
              className="fixed left-1/2 top-1/2 z-[10001] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--vk-ivory)] shadow-[0_24px_80px_rgba(28,24,22,0.14)]"
            >
              <div className="px-6 pt-6 pb-4">
                <h2
                  id="vendors-confirm-title"
                  className="text-[18px] font-semibold tracking-tight text-[var(--vk-text)]"
                >
                  {state.options.title}
                </h2>
                <p
                  id="vendors-confirm-desc"
                  className="mt-2 text-[14px] leading-relaxed text-[var(--vk-text-secondary)]"
                >
                  {state.options.description}
                </p>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => close(false)}
                  className="h-9 px-2 text-[13px] font-medium text-[var(--vk-text-secondary)] transition-colors hover:text-[var(--vk-text)] disabled:opacity-50"
                >
                  {state.options.cancelLabel ?? "Anulează"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setLoading(true);
                    close(true);
                  }}
                  className={
                    state.options.variant === "destructive"
                      ? "h-9 rounded-lg bg-red-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      : "h-9 rounded-lg bg-[var(--vk-text)] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  }
                >
                  {state.options.confirmLabel ?? "Confirmă"}
                </button>
              </div>
            </div>
            </>
          </div>,
          document.body
        )
      : null;

  return { confirm, dialog };
}
