import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ro } from "@/lib/i18n/ro";
import type { MarketplaceQuoteStatus } from "@/types/marketplace";

const STATUS_STYLES: Record<MarketplaceQuoteStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  viewed: "border-sky-200 bg-sky-50 text-sky-800",
  responded: "border-violet-200 bg-violet-50 text-violet-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  declined: "border-rose-200 bg-rose-50 text-rose-800",
};

export function VendorQuoteStatusBadge({ status }: { status: MarketplaceQuoteStatus }) {
  const label = ro.vendor.requests.status[status] ?? status;
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {label}
    </Badge>
  );
}
