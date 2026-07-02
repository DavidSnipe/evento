import { DashboardPage } from "@/components/layout/animated-page";
import { VendorRequestsTable } from "@/components/vendor/vendor-requests-table";
import { PageHeader } from "@/components/nuntiki/page-header";
import { getVendorQuoteRequests } from "@/lib/vendor/queries";
import { requireMyVendor } from "@/lib/vendor/require-vendor";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.vendor.requests.title,
};

export default async function VendorRequestsPage() {
  const { vendor } = await requireMyVendor();
  const requests = await getVendorQuoteRequests(vendor.id);

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.vendor.requests.title}
          description={ro.vendor.requests.description}
        />
      }
    >
      <VendorRequestsTable requests={requests} />
    </DashboardPage>
  );
}
