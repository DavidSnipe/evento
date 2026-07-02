import { notFound } from "next/navigation";

import { MarketplaceVendorForm } from "@/components/admin/marketplace-vendor-form";
import { PageHeader } from "@/components/nuntiki/page-header";
import { getAdminVendorCategories, getAdminVendorDetail } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

type AdminEditVendorPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: AdminEditVendorPageProps) {
  const { id } = await params;
  const vendor = await getAdminVendorDetail(id);
  return { title: vendor?.name ?? ro.admin.vendors.edit };
}

export default async function AdminEditVendorPage({ params }: AdminEditVendorPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [vendor, categories] = await Promise.all([
    getAdminVendorDetail(id),
    getAdminVendorCategories(),
  ]);

  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={vendor.name} description={ro.admin.vendors.edit} />
      <MarketplaceVendorForm categories={categories} vendor={vendor} />
    </div>
  );
}
