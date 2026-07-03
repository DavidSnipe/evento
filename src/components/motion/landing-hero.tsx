"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MotionFadeUp } from "@/components/motion/fade-up";
import { Button } from "@/components/ui/button";
import { motionStaggerDelay } from "@/lib/motion/premium";
import { ro } from "@/lib/i18n/ro";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center px-5 pb-16 pt-8 text-center sm:px-8 sm:pb-24 sm:pt-12">
      <MotionFadeUp delay={motionStaggerDelay(0)}>
        <div className="mx-auto mb-8 h-px w-16 bg-[var(--color-border-rose-22)]" aria-hidden />
      </MotionFadeUp>

      <MotionFadeUp delay={motionStaggerDelay(1)}>
        <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-tight text-[var(--color-dash-text)] sm:text-[3.5rem]">
          {ro.landing.title}{" "}
          <span className="text-[var(--color-rose-dark)]">{ro.landing.titleHighlight}</span>
        </h1>
      </MotionFadeUp>

      <MotionFadeUp delay={motionStaggerDelay(2)}>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
          {ro.landing.subtitle}
        </p>
      </MotionFadeUp>

      <MotionFadeUp delay={motionStaggerDelay(3)}>
        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
              {ro.landing.ctaStart}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href="/login">{ro.landing.ctaHasAccount}</Link>
          </Button>
        </div>
      </MotionFadeUp>

      <MotionFadeUp delay={motionStaggerDelay(4)}>
        <p className="mt-10 text-sm text-[var(--color-text-subtle)]">
          Planificare pentru nunți și evenimente în România — invitați, mese, buget, furnizori.
        </p>
      </MotionFadeUp>
    </section>
  );
}
