import { AdminRequestsPanel } from "@/components/admin/admin-requests-panel";
import { PageHeader } from "@/components/nuntiki/page-header";
import { getAdminQuoteRequests } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.admin.requests.title,
};

type AdminRequestsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRequestsPage({ searchParams }: AdminRequestsPageProps) {
  await requireAdmin();
  const { status } = await searchParams;
  const requests = await getAdminQuoteRequests(status);

  return (
    <div className="space-y-6">
      <PageHeader title={ro.admin.requests.title} description={ro.admin.requests.description} />
      <AdminRequestsPanel requests={requests} initialStatus={status ?? "all"} />
    </div>
  );
}
