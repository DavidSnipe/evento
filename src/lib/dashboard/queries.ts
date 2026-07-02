import { createClient } from "@/lib/supabase/server";
import { getBudgetSnapshot } from "@/lib/budget/queries";
import { getGuestStats } from "@/lib/guests/queries";
import { isTimelineTableMissing } from "@/lib/timeline/queries";
import { getEventActiveCategorySlugs } from "@/lib/vendors/queries";

export type DashboardPlanningProgress = {
  guestsAdded: boolean;
  rsvpConfigured: boolean;
  seatingCreated: boolean;
  budgetSet: boolean;
  vendorsAdded: boolean;
  timelinePlanned: boolean;
  completedCount: number;
  totalSteps: number;
};

export type DashboardSummary = {
  guests: {
    total: number;
    seated: number;
    unassigned: number;
    pendingRsvp: number;
    accepted: number;
  };
  seating: {
    assignedGuests: number;
    totalGuests: number;
    tablesCount: number;
    progressPercent: number;
  };
  budget: {
    spent: number;
    total: number | null;
    consumedPercent: number | null;
    remainingPercent: number | null;
  };
  vendors: {
    categoriesCount: number;
  };
  planning: DashboardPlanningProgress;
};

function buildPlanningProgress(input: {
  guestTotal: number;
  rsvpSlug: string | null;
  tablesCount: number;
  budgetTarget: number | null;
  vendorCategoriesCount: number;
  timelineTasksCount: number;
}): DashboardPlanningProgress {
  const steps = {
    guestsAdded: input.guestTotal > 0,
    rsvpConfigured: Boolean(input.rsvpSlug),
    seatingCreated: input.tablesCount > 0,
    budgetSet: input.budgetTarget != null && input.budgetTarget > 0,
    vendorsAdded: input.vendorCategoriesCount > 0,
    timelinePlanned: input.timelineTasksCount > 0,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  return {
    ...steps,
    completedCount,
    totalSteps: 6,
  };
}

export async function getDashboardSummary(eventId: string): Promise<DashboardSummary> {
  const supabase = await createClient();

  const [
    guestStats,
    eventResult,
    tablesResult,
    budgetSnapshot,
    vendorCategorySlugs,
    timelineTasksResult,
  ] = await Promise.all([
    getGuestStats(eventId),
    supabase
      .from("events")
      .select("rsvp_slug, budget_target")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("seating_tables")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    getBudgetSnapshot(eventId),
    getEventActiveCategorySlugs(eventId),
    supabase
      .from("timeline_tasks")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  const rsvpSlug = eventResult.data?.rsvp_slug ?? null;
  const budgetTarget =
    eventResult.data?.budget_target != null ? Number(eventResult.data.budget_target) : null;
  const tablesCount = tablesResult.count ?? 0;

  let timelineTasksCount = timelineTasksResult.count ?? 0;
  if (timelineTasksResult.error && !isTimelineTableMissing(timelineTasksResult.error)) {
    console.error("[getDashboardSummary] timeline_tasks", timelineTasksResult.error.message);
    timelineTasksCount = 0;
  }

  const totalGuests = guestStats.total;
  const assignedGuests = guestStats.seated;
  const progressPercent =
    totalGuests > 0 ? Math.round((assignedGuests / totalGuests) * 100) : 0;

  const spent = budgetSnapshot.totals.actual;
  const consumedPercent = budgetSnapshot.totals.targetUsedPercent;
  const remainingPercent =
    consumedPercent != null ? Math.max(0, 100 - consumedPercent) : null;

  return {
    guests: {
      total: totalGuests,
      seated: assignedGuests,
      unassigned: Math.max(0, totalGuests - assignedGuests),
      pendingRsvp: guestStats.pending,
      accepted: guestStats.accepted,
    },
    seating: {
      assignedGuests,
      totalGuests,
      tablesCount,
      progressPercent,
    },
    budget: {
      spent,
      total: budgetTarget,
      consumedPercent,
      remainingPercent,
    },
    vendors: {
      categoriesCount: vendorCategorySlugs.length,
    },
    planning: buildPlanningProgress({
      guestTotal: totalGuests,
      rsvpSlug,
      tablesCount,
      budgetTarget,
      vendorCategoriesCount: vendorCategorySlugs.length,
      timelineTasksCount,
    }),
  };
}
