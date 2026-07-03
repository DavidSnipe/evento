"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type StepState = "done" | "active" | "todo";

type OnboardingStep = {
  label: string;
  state: StepState;
  action?: React.ReactNode;
};

export function OnboardingChecklist() {
  const t = ro.dashboard.onboarding;

  const steps: OnboardingStep[] = [
    { label: t.stepAccount, state: "done" },
    {
      label: t.stepEvent,
      state: "active",
      action: (
        <Button asChild size="sm" className="mt-3 min-h-11">
          <Link href="/dashboard/events/new">{t.createEvent}</Link>
        </Button>
      ),
    },
    { label: t.stepGuests, state: "todo" },
    { label: t.stepRsvp, state: "todo" },
    { label: t.stepSeating, state: "todo" },
    { label: t.stepVendors, state: "todo" },
  ];

  return (
    <Card className="overflow-hidden rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.title}</h2>
        <p className="mt-1 text-sm text-[var(--dash-text-secondary)]">{t.subtitle}</p>

        <ol className="mt-6 space-y-4">
          {steps.map((step) => (
            <li
              key={step.label}
              className={cn("flex gap-3", step.state === "todo" && "opacity-50")}
            >
              <StepIndicator state={step.state} />
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.state === "active"
                      ? "text-[var(--dash-accent-text)]"
                      : "text-[var(--dash-text)]"
                  )}
                >
                  {step.label}
                </p>
                {step.action}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function StepIndicator({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--dash-sage)] text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--dash-accent)] bg-[var(--dash-accent-soft)]">
        <span className="h-2 w-2 rounded-full bg-[var(--dash-accent)]" />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--dash-hairline)] bg-[var(--dash-surface)]" />
  );
}
