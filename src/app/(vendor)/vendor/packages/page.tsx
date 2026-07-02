import { DashboardPage } from "@/components/layout/animated-page";
import { VendorPackagesEditor } from "@/components/vendor/vendor-packages-editor";
import { PageHeader } from "@/components/nuntiki/page-header";
import { getAdminVendorCategories } from "@/lib/admin/queries";
import { ro } from "@/lib/i18n/ro";
import { requireMyVendor } from "@/lib/vendor/require-vendor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.vendor.packages.title,
};

export default async function VendorPackagesPage() {
  const { vendor } = await requireMyVendor();
  const categories = await getAdminVendorCategories();

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.vendor.packages.title}
          description={ro.vendor.packages.description}
        />
      }
    >
      <VendorPackagesEditor packages={vendor.packages} categories={categories} />
    </DashboardPage>
  );
}
