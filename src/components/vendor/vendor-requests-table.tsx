"use client";

import Link from "next/link";

import { VendorQuoteStatusBadge } from "@/components/vendor/vendor-quote-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VendorQuoteRequestRow } from "@/lib/vendor/queries";
import { ro } from "@/lib/i18n/ro";

type VendorRequestsTableProps = {
  requests: VendorQuoteRequestRow[];
};

export function VendorRequestsTable({ requests }: VendorRequestsTableProps) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--dash-hairline)] bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{ro.vendor.requests.columns.requester}</TableHead>
            <TableHead>{ro.vendor.requests.columns.email}</TableHead>
            <TableHead>{ro.vendor.requests.columns.eventDate}</TableHead>
            <TableHead>{ro.vendor.requests.columns.package}</TableHead>
            <TableHead>{ro.vendor.requests.columns.status}</TableHead>
            <TableHead>{ro.vendor.requests.columns.created}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                {ro.vendor.requests.empty}
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id} className="cursor-pointer hover:bg-muted/30">
                <TableCell className="font-medium">
                  <Link href={`/vendor/requests/${request.id}`} className="hover:underline">
                    {request.requester_name}
                  </Link>
                </TableCell>
                <TableCell>{request.requester_email}</TableCell>
                <TableCell>
                  {request.event_date
                    ? new Date(request.event_date).toLocaleDateString("ro-RO")
                    : "—"}
                </TableCell>
                <TableCell>{request.package_name ?? "—"}</TableCell>
                <TableCell>
                  <VendorQuoteStatusBadge status={request.status} />
                </TableCell>
                <TableCell>
                  {new Date(request.created_at).toLocaleDateString("ro-RO")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
