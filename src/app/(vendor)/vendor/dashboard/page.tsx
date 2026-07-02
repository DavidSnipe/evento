import Link from "next/link";
import { ClipboardList, MessageSquare, Star } from "lucide-react";

import { DashboardPage } from "@/components/layout/animated-page";
import { VendorOnboardingForm } from "@/components/vendor/vendor-onboarding-form";
import { VendorQuoteStatusBadge } from "@/components/vendor/vendor-quote-status-badge";
import { PageHeader } from "@/components/nuntiki/page-header";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { StatsGrid } from "@/components/nuntiki/stats-grid";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAdminVendorCategories } from "@/lib/admin/queries";
import { ro } from "@/lib/i18n/ro";
import {
  completenessTipLabel,
  computeProfileCompleteness,
} from "@/lib/vendor/profile-completeness";
import {
  getVendorDashboardStats,
  getVendorRecentRequests,
} from "@/lib/vendor/queries";
import { getVendorPortalContext } from "@/lib/vendor/require-vendor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panou furnizor",
};

export default async function VendorDashboardPage() {
  const ctx = await getVendorPortalContext();
  const firstName =
    ctx.vendor?.name?.split(" ")[0] ??
    ctx.userEmail?.split("@")[0] ??
    ro.dashboard.defaultName;

  if (!ctx.vendor) {
    const categories = await getAdminVendorCategories();
    return (
      <DashboardPage
        header={
          <PageHeader
            title={ro.vendor.onboarding.title}
            description={ro.vendor.onboarding.description}
          />
        }
      >
        <VendorOnboardingForm categories={categories} />
      </DashboardPage>
    );
  }

  const [stats, recentRequests] = await Promise.all([
    getVendorDashboardStats(ctx.vendor.id),
    getVendorRecentRequests(ctx.vendor.id, 5),
  ]);

  const completeness = computeProfileCompleteness(ctx.vendor);
  const tipLabels = ro.vendor.dashboard.completenessTips as Record<string, string>;

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.vendor.dashboard.welcome.replace("{name}", firstName)}
          description={ro.vendor.dashboard.description}
        />
      }
    >
      <div className="space-y-8">
        <StatsGrid columns={4}>
          <StatsCard
            label={ro.vendor.dashboard.stats.newRequests}
            value={stats.newRequests}
            icon={MessageSquare}
            accent={stats.newRequests > 0 ? "warning" : undefined}
            footer={
              stats.newRequests > 0 ? (
                <Badge variant="destructive" className="text-[10px]">
                  {stats.newRequests}
                </Badge>
              ) : null
            }
          />
          <StatsCard
            label={ro.vendor.dashboard.stats.totalRequests}
            value={stats.totalRequests}
            icon={ClipboardList}
          />
          <StatsCard
            label={ro.vendor.dashboard.stats.reviewAvg}
            value={stats.reviewAvg != null ? stats.reviewAvg.toFixed(1) : "—"}
            icon={Star}
          />
          <StatsCard
            label={ro.vendor.dashboard.stats.reviewCount}
            value={stats.approvedReviewCount}
            icon={Star}
          />
        </StatsGrid>

        <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--dash-text)]">
              {ro.vendor.dashboard.profileCompleteness.replace(
                "{percent}",
                String(completeness.percent)
              )}
            </h2>
            <span className="text-sm font-medium text-[var(--dash-accent-text)]">
              {completeness.percent}%
            </span>
          </div>
          <Progress value={completeness.percent} className="h-2" />
          {completeness.tips.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {completeness.tips.map((tip) => (
                <li key={tip}>• {completenessTipLabel(tip, tipLabels)}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--dash-text)]">
              {ro.vendor.dashboard.recentRequests}
            </h2>
            <Link
              href="/vendor/requests"
              className="text-sm font-medium text-[var(--dash-accent-text)] hover:underline"
            >
              {ro.vendor.dashboard.viewAllRequests}
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-[var(--dash-hairline)] px-6 py-8 text-center text-sm text-muted-foreground">
              {ro.vendor.requests.empty}
            </p>
          ) : (
            <div className="divide-y rounded-[14px] border border-[var(--dash-hairline)] bg-white">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/vendor/requests/${request.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">{request.requester_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.event_date
                        ? new Date(request.event_date).toLocaleDateString("ro-RO")
                        : "—"}
                      {" · "}
                      {new Date(request.created_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                  <VendorQuoteStatusBadge status={request.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardPage>
  );
}
