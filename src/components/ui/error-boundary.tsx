"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";

function sanitizeErrorMessage(error: Error): string {
  const message = error.message?.trim();
  if (!message) return ro.common.errors.generic;

  if (process.env.NODE_ENV === "production") {
    const looksTechnical =
      message.includes("\n    at ") ||
      message.startsWith("at ") ||
      message.length > 220 ||
      /^(TypeError|ReferenceError|Error:)/i.test(message);

    if (looksTechnical) return ro.common.errors.generic;
  }

  return message;
}

export type ErrorBoundaryFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  backHref?: string;
};

export function ErrorBoundaryFallback({
  error,
  reset,
  backHref = "/dashboard",
}: ErrorBoundaryFallbackProps) {
  const subtitle = sanitizeErrorMessage(error);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[#FCEAEF] bg-gradient-to-br from-[#FEF8F9] to-white p-8 text-center shadow-sm">
        <div className="mb-5 flex items-center justify-center gap-2 text-[#B8516B]">
          <Heart className="h-5 w-5 fill-[#FCEAEF]" strokeWidth={2} />
          <span className="font-serif text-lg font-semibold tracking-tight text-[#1A0E14]">
            Evento
          </span>
        </div>

        <h1 className="font-serif text-2xl font-semibold text-[#1A0E14]">
          {ro.common.errors.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#7A6270]">{subtitle}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset} className="rounded-xl">
            {ro.common.errors.tryAgain}
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href={backHref}>{ro.common.errors.backToDashboard}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Default export for Next.js `error.tsx` route files. */
export default function RouteErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} />;
}
