"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { respondToRequest } from "@/app/(vendor)/vendor/actions";
import { VendorQuoteStatusBadge } from "@/components/vendor/vendor-quote-status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { VendorEventPreview, VendorQuoteRequestRow } from "@/lib/vendor/queries";
import { ro } from "@/lib/i18n/ro";
import type { MarketplaceQuoteStatus } from "@/types/marketplace";

type VendorRequestDetailProps = {
  request: VendorQuoteRequestRow;
  eventPreview: VendorEventPreview | null;
};

const RESPONSE_STATUSES: Extract<
  MarketplaceQuoteStatus,
  "responded" | "accepted" | "declined"
>[] = ["responded", "accepted", "declined"];

export function VendorRequestDetail({ request, eventPreview }: VendorRequestDetailProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState(request.vendor_response ?? "");
  const [status, setStatus] = useState<"responded" | "accepted" | "declined">(
    request.status === "accepted" || request.status === "declined"
      ? request.status
      : "responded"
  );

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void respondToRequest(request.id, response, status).then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Eroare la trimitere.");
          return;
        }
        router.refresh();
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{request.requester_name}</h2>
          <p className="text-sm text-muted-foreground">{request.requester_email}</p>
        </div>
        <VendorQuoteStatusBadge status={request.status} />
      </div>

      <div className="grid gap-4 rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6 sm:grid-cols-2">
        <DetailField label={ro.vendor.requests.detail.phone} value={request.requester_phone} />
        <DetailField
          label={ro.vendor.requests.columns.eventDate}
          value={
            request.event_date
              ? new Date(request.event_date).toLocaleDateString("ro-RO")
              : null
          }
        />
        <DetailField label={ro.vendor.requests.detail.location} value={request.event_location} />
        <DetailField
          label={ro.vendor.requests.detail.guests}
          value={request.guest_count != null ? String(request.guest_count) : null}
        />
        <DetailField
          label={ro.vendor.requests.detail.package}
          value={request.package_name}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-muted-foreground">{ro.vendor.requests.detail.message}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{request.message || "—"}</p>
        </div>
        {eventPreview ? (
          <div className="sm:col-span-2 rounded-lg border border-dashed px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              {ro.vendor.requests.detail.eventLink}
            </p>
            <p className="mt-1 text-sm font-medium">{eventPreview.title}</p>
            <p className="text-sm text-muted-foreground">
              {eventPreview.event_type}
              {eventPreview.event_date
                ? ` · ${new Date(eventPreview.event_date).toLocaleDateString("ro-RO")}`
                : ""}
            </p>
          </div>
        ) : null}
      </div>

      <section className="rounded-[16px] border border-[var(--dash-hairline)] bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold">{ro.vendor.requests.detail.response}</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="response">{ro.vendor.requests.detail.response}</Label>
            <textarea
              id="response"
              className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">{ro.vendor.requests.detail.responseStatus}</Label>
            <select
              id="status"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "responded" | "accepted" | "declined")
              }
            >
              {RESPONSE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ro.vendor.requests.status[s]}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">{ro.vendor.requests.detail.emailNote}</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" disabled={pending || !response.trim()} onClick={handleSubmit}>
            {pending ? ro.vendor.requests.detail.sending : ro.vendor.requests.detail.send}
          </Button>
        </div>
      </section>

      <Link href="/vendor/requests" className="text-sm text-[var(--dash-accent-text)] hover:underline">
        ← {ro.vendor.requests.title}
      </Link>
    </div>
  );
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value?.trim() ? value : "—"}</p>
    </div>
  );
}
