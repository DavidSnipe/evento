import { AdminReviewsPanel } from "@/components/admin/admin-reviews-panel";
import { PageHeader } from "@/components/nuntiki/page-header";
import { getAdminReviews } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.admin.reviews.title,
};

export default async function AdminReviewsPage() {
  await requireAdmin();
  const [pending, approved] = await Promise.all([
    getAdminReviews("pending"),
    getAdminReviews("approved"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={ro.admin.reviews.title} description={ro.admin.reviews.description} />
      <AdminReviewsPanel pending={pending} approved={approved} initialTab="pending" />
    </div>
  );
}
