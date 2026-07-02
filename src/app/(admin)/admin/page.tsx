import Link from "next/link";
import { Building2, ClipboardList, MessageSquare, Users } from "lucide-react";

import { AdminUnpublishedVendorsList } from "@/components/admin/admin-unpublished-vendors";
import { PageHeader } from "@/components/nuntiki/page-header";
import { StatsCard } from "@/components/nuntiki/stats-card";
import { StatsGrid } from "@/components/nuntiki/stats-grid";
import { Button } from "@/components/ui/button";
import { getAdminOverviewStats, getAdminRecentUnpublishedVendors } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.admin.overview.title,
};

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [stats, recentUnpublished] = await Promise.all([
    getAdminOverviewStats(),
    getAdminRecentUnpublishedVendors(5),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={ro.admin.overview.title}
        description={ro.admin.overview.description}
        actions={
          <Button asChild>
            <Link href="/admin/vendors/new">{ro.admin.overview.addVendor}</Link>
          </Button>
        }
      />

      <StatsGrid columns={3}>
        <StatsCard
          label={ro.admin.overview.stats.totalVendors}
          value={stats.totalVendors}
          icon={Building2}
        />
        <StatsCard
          label={ro.admin.overview.stats.pendingPublish}
          value={stats.pendingPublishVendors}
          icon={Building2}
          accent="warning"
        />
        <StatsCard
          label={ro.admin.overview.stats.pendingReviews}
          value={stats.pendingReviews}
          icon={MessageSquare}
          accent="warning"
        />
        <StatsCard
          label={ro.admin.overview.stats.totalRequests}
          value={stats.totalQuoteRequests}
          trend={`${stats.newQuoteRequests} ${ro.admin.overview.stats.newRequests.toLowerCase()}`}
          icon={ClipboardList}
        />
        <StatsCard
          label={ro.admin.overview.stats.totalUsers}
          value={stats.totalUsers}
          icon={Users}
        />
      </StatsGrid>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--dash-text)]">
          {ro.admin.overview.recentUnpublished}
        </h2>
        <AdminUnpublishedVendorsList vendors={recentUnpublished} />
      </section>
    </div>
  );
}
