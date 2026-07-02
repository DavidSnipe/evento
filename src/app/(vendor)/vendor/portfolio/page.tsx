import { DashboardPage } from "@/components/layout/animated-page";
import { VendorPortfolioEditor } from "@/components/vendor/vendor-portfolio-editor";
import { PageHeader } from "@/components/nuntiki/page-header";
import { ro } from "@/lib/i18n/ro";
import { requireMyVendor } from "@/lib/vendor/require-vendor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.vendor.portfolio.title,
};

export default async function VendorPortfolioPage() {
  const { vendor } = await requireMyVendor();

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.vendor.portfolio.title}
          description={ro.vendor.portfolio.description}
        />
      }
    >
      <VendorPortfolioEditor portfolio={vendor.portfolio} />
    </DashboardPage>
  );
}
