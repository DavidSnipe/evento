"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { createReview } from "@/lib/marketplace/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type ReviewFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  isLoggedIn: boolean;
  defaultName?: string | null;
};

export function ReviewFormModal({
  open,
  onOpenChange,
  vendorId,
  isLoggedIn,
  defaultName,
}: ReviewFormModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reviewerName, setReviewerName] = useState(defaultName ?? "");
  const [eventYear, setEventYear] = useState("");

  const resetOnClose = (next: boolean) => {
    if (!next) {
      setError(null);
      setSuccess(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void createReview({
        vendor_id: vendorId,
        rating,
        title: title || null,
        body,
        reviewer_name: reviewerName,
        event_year: eventYear ? Number(eventYear) : null,
      }).then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Eroare la trimitere.");
          return;
        }
        setSuccess(true);
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ro.marketplace.review.title}</DialogTitle>
        </DialogHeader>

        {!isLoggedIn ? (
          <div className="space-y-4 py-4 text-center text-sm">
            <p>{ro.marketplace.review.loginRequired}</p>
            <Button asChild>
              <Link href="/login">{ro.marketplace.nav.signIn}</Link>
            </Button>
          </div>
        ) : success ? (
          <p className="py-6 text-center text-sm text-emerald-700">{ro.marketplace.review.success}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{ro.marketplace.review.rating}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="rounded p-1"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-title">{ro.marketplace.review.reviewTitle}</Label>
              <Input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-body">{ro.marketplace.review.body}</Label>
              <textarea
                id="review-body"
                required
                minLength={50}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-name">{ro.marketplace.review.displayName}</Label>
              <Input
                id="review-name"
                required
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-year">{ro.marketplace.review.eventYear}</Label>
              <Input
                id="review-year"
                type="number"
                min={1990}
                max={2100}
                value={eventYear}
                onChange={(e) => setEventYear(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="button"
              className="w-full"
              disabled={pending || body.length < 50 || !reviewerName.trim()}
              onClick={handleSubmit}
            >
              {pending ? ro.marketplace.review.submitting : ro.marketplace.review.submit}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
