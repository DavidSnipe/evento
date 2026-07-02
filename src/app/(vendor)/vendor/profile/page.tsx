import { DashboardPage } from "@/components/layout/animated-page";
import { VendorProfileForm } from "@/components/vendor/vendor-profile-form";
import { PageHeader } from "@/components/nuntiki/page-header";
import { getAdminVendorCategories } from "@/lib/admin/queries";
import { ro } from "@/lib/i18n/ro";
import { requireMyVendor } from "@/lib/vendor/require-vendor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.vendor.profile.title,
};

export default async function VendorProfilePage() {
  const { vendor } = await requireMyVendor();
  const categories = await getAdminVendorCategories();

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.vendor.profile.title}
          description={ro.vendor.profile.description}
        />
      }
    >
      <VendorProfileForm vendor={vendor} categories={categories} />
    </DashboardPage>
  );
}
