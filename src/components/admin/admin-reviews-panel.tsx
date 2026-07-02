"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { approveReview, rejectReview } from "@/app/(admin)/admin/vendors/actions";
import type { AdminReviewRow } from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type AdminReviewsPanelProps = {
  pending: AdminReviewRow[];
  approved: AdminReviewRow[];
  initialTab: "pending" | "approved";
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export function AdminReviewsPanel({ pending, approved, initialTab }: AdminReviewsPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "approved">(initialTab);
  const [pendingAction, startTransition] = useTransition();

  const rows = tab === "pending" ? pending : approved;

  const run = (reviewId: string, action: "approve" | "reject") => {
    startTransition(async () => {
      if (action === "approve") await approveReview(reviewId);
      else await rejectReview(reviewId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-white p-1">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            tab === "pending" ? "bg-[var(--dash-blush)]/40 text-[var(--dash-accent-text)]" : ""
          )}
          onClick={() => setTab("pending")}
        >
          {ro.admin.reviews.tabPending} ({pending.length})
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            tab === "approved" ? "bg-[var(--dash-blush)]/40 text-[var(--dash-accent-text)]" : ""
          )}
          onClick={() => setTab("approved")}
        >
          {ro.admin.reviews.tabApproved} ({approved.length})
        </button>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[var(--dash-hairline)] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ro.admin.reviews.columns.vendor}</TableHead>
              <TableHead>{ro.admin.reviews.columns.reviewer}</TableHead>
              <TableHead>{ro.admin.reviews.columns.rating}</TableHead>
              <TableHead>{ro.admin.reviews.columns.title}</TableHead>
              <TableHead>{ro.admin.reviews.columns.body}</TableHead>
              <TableHead>{ro.admin.reviews.columns.date}</TableHead>
              {tab === "pending" ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tab === "pending" ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  {ro.admin.reviews.empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">{review.vendor_name}</TableCell>
                  <TableCell>{review.reviewer_name}</TableCell>
                  <TableCell>
                    <Stars rating={review.rating} />
                  </TableCell>
                  <TableCell>{review.title ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate whitespace-normal">
                    {review.body ?? "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(review.created_at).toLocaleDateString("ro-RO")}
                  </TableCell>
                  {tab === "pending" ? (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={pendingAction}
                          onClick={() => run(review.id, "approve")}
                        >
                          {ro.admin.reviews.approve}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingAction}
                          onClick={() => run(review.id, "reject")}
                        >
                          {ro.admin.reviews.reject}
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
