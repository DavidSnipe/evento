import { MarketplaceVendorForm } from "@/components/admin/marketplace-vendor-form";
import { PageHeader } from "@/components/nuntiki/page-header";
import { getAdminVendorCategories } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.admin.vendors.new,
};

export default async function AdminNewVendorPage() {
  await requireAdmin();
  const categories = await getAdminVendorCategories();

  return (
    <div className="space-y-6">
      <PageHeader title={ro.admin.vendors.new} description={ro.admin.vendors.description} />
      <MarketplaceVendorForm categories={categories} />
    </div>
  );
}
