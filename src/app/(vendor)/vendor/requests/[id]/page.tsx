import { notFound } from "next/navigation";

import { DashboardPage } from "@/components/layout/animated-page";
import { VendorRequestDetail } from "@/components/vendor/vendor-request-detail";
import { PageHeader } from "@/components/nuntiki/page-header";
import { markQuoteRequestViewed } from "@/app/(vendor)/vendor/actions";
import {
  getEventPreviewForVendor,
  getVendorQuoteRequest,
} from "@/lib/vendor/queries";
import { requireMyVendor } from "@/lib/vendor/require-vendor";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

type VendorRequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: VendorRequestDetailPageProps) {
  const { id } = await params;
  return { title: `${ro.vendor.requests.detail.title} · ${id.slice(0, 8)}` };
}

export default async function VendorRequestDetailPage({ params }: VendorRequestDetailPageProps) {
  const { id } = await params;
  const { vendor } = await requireMyVendor();

  const request = await getVendorQuoteRequest(vendor.id, id);
  if (!request) notFound();

  if (request.status === "pending") {
    await markQuoteRequestViewed(id);
    request.status = "viewed";
  }

  const eventPreview = request.event_id
    ? await getEventPreviewForVendor(request.event_id)
    : null;

  return (
    <DashboardPage
      header={
        <PageHeader
          title={ro.vendor.requests.detail.title}
          description={request.requester_name}
        />
      }
    >
      <VendorRequestDetail request={request} eventPreview={eventPreview} />
    </DashboardPage>
  );
}
