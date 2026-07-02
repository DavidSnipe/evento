import { Check } from "lucide-react";

import { SectionCard } from "@/components/nuntiki/section-card";
import { Progress } from "@/components/ui/progress";
import { ro } from "@/lib/i18n/ro";
import type { DashboardPlanningProgress } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

type PlanningProgressProps = {
  planning: DashboardPlanningProgress;
};

export function PlanningProgress({ planning }: PlanningProgressProps) {
  const steps = [
    { key: "guests", label: ro.dashboard.progressSteps.guests, done: planning.guestsAdded },
    { key: "rsvp", label: ro.dashboard.progressSteps.rsvp, done: planning.rsvpConfigured },
    { key: "seating", label: ro.dashboard.progressSteps.seating, done: planning.seatingCreated },
    { key: "budget", label: ro.dashboard.progressSteps.budget, done: planning.budgetSet },
    { key: "vendors", label: ro.dashboard.progressSteps.vendors, done: planning.vendorsAdded },
    {
      key: "timeline",
      label: ro.dashboard.progressSteps.timeline,
      done: planning.timelinePlanned,
    },
  ];

  const overallPercent = Math.round((planning.completedCount / planning.totalSteps) * 100);

  return (
    <SectionCard
      title={ro.dashboard.planningProgress}
      description={ro.dashboard.planningSummary
        .replace("{completed}", String(planning.completedCount))
        .replace("{total}", String(planning.totalSteps))}
    >
      <Progress value={overallPercent} className="mb-5 h-2" />
      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                step.done
                  ? "bg-[var(--dash-sage)] text-white"
                  : "border border-[var(--dash-hairline)] bg-white"
              )}
            >
              {step.done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            <span
              className={cn(
                "text-sm",
                step.done
                  ? "font-medium text-[var(--dash-text)]"
                  : "text-[var(--dash-text-secondary)]"
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
