import { DashboardPage } from "@/components/layout/animated-page";
import { VendorAvailabilityCalendar } from "@/components/vendor/vendor-availability-calendar";
import { PageHeader } from "@/components/nuntiki/page-header";
import { ro } from "@/lib/i18n/ro";
import { requireMyVendor } from "@/lib/vendor/require-vendor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.vendor.availability.title,
};

export default async function VendorAvailabilityPage() {
  const { vendor } = await requireMyVendor();

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.vendor.availability.title}
          description={ro.vendor.availability.description}
        />
      }
    >
      <VendorAvailabilityCalendar availability={vendor.availability} />
    </DashboardPage>
  );
}
