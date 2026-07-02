"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminQuoteRequestRow } from "@/lib/admin/queries";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MARKETPLACE_QUOTE_STATUSES } from "@/types/marketplace";
import { ro } from "@/lib/i18n/ro";

type AdminRequestsPanelProps = {
  requests: AdminQuoteRequestRow[];
  initialStatus?: string;
};

export function AdminRequestsPanel({ requests, initialStatus = "all" }: AdminRequestsPanelProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);

  const applyStatus = (next: string) => {
    setStatus(next);
    const params = new URLSearchParams();
    if (next !== "all") params.set("status", next);
    router.push(`/admin/requests?${params.toString()}`);
  };

  const statusLabel = (value: string) => {
    const key = value as (typeof MARKETPLACE_QUOTE_STATUSES)[number];
    return ro.admin.requests.status[key] ?? value;
  };

  return (
    <div className="space-y-4">
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={status}
        onChange={(e) => applyStatus(e.target.value)}
      >
        <option value="all">{ro.admin.requests.filterAll}</option>
        {MARKETPLACE_QUOTE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>

      <div className="overflow-hidden rounded-[14px] border border-[var(--dash-hairline)] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ro.admin.requests.columns.vendor}</TableHead>
              <TableHead>{ro.admin.requests.columns.requester}</TableHead>
              <TableHead>{ro.admin.requests.columns.email}</TableHead>
              <TableHead>{ro.admin.requests.columns.eventDate}</TableHead>
              <TableHead>{ro.admin.requests.columns.status}</TableHead>
              <TableHead>{ro.admin.requests.columns.created}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {ro.admin.requests.empty}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <Fragment key={request.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedId((current) => (current === request.id ? null : request.id))
                    }
                  >
                    <TableCell className="font-medium">{request.vendor_name}</TableCell>
                    <TableCell>{request.requester_name}</TableCell>
                    <TableCell>{request.requester_email}</TableCell>
                    <TableCell>
                      {request.event_date
                        ? new Date(request.event_date).toLocaleDateString("ro-RO")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel(request.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString("ro-RO")}
                    </TableCell>
                  </TableRow>
                  {expandedId === request.id ? (
                    <TableRow key={`${request.id}-detail`}>
                      <TableCell colSpan={6} className="bg-muted/20 whitespace-normal">
                        <div className="space-y-3 py-2">
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              {ro.admin.requests.message}
                            </p>
                            <p className="mt-1 text-sm">{request.message}</p>
                          </div>
                          {request.vendor_response ? (
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                {ro.admin.requests.response}
                              </p>
                              <p className="mt-1 text-sm">{request.vendor_response}</p>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
