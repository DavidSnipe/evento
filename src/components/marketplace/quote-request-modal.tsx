"use client";

import { useEffect, useState, useTransition } from "react";

import { createQuoteRequest } from "@/lib/marketplace/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarketplaceVendorPackage } from "@/types/marketplace";
import type { EventRow } from "@/types/events";
import { ro } from "@/lib/i18n/ro";

type QuoteRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  packages: MarketplaceVendorPackage[];
  preselectedPackageId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  events?: EventRow[];
};

export function QuoteRequestModal({
  open,
  onOpenChange,
  vendorId,
  packages,
  preselectedPackageId,
  userName,
  userEmail,
  events = [],
}: QuoteRequestModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(userName ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const [phone, setPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [packageId, setPackageId] = useState(preselectedPackageId ?? "");
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (open) {
      setPackageId(preselectedPackageId ?? "");
      if (userName) setName(userName);
      if (userEmail) setEmail(userEmail);
    }
  }, [open, preselectedPackageId, userName, userEmail]);

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
      void createQuoteRequest({
        vendor_id: vendorId,
        package_id: packageId || null,
        requester_name: name,
        requester_email: email,
        requester_phone: phone || null,
        event_date: eventDate || null,
        event_location: eventLocation || null,
        guest_count: guestCount ? Number(guestCount) : null,
        message,
        event_id: eventId || null,
        website,
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
          <DialogTitle>{ro.marketplace.quote.title}</DialogTitle>
        </DialogHeader>

        {success ? (
          <p className="py-6 text-center text-sm text-emerald-700">{ro.marketplace.quote.success}</p>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <div className="space-y-2">
              <Label htmlFor="quote-name">{ro.marketplace.quote.name}</Label>
              <Input
                id="quote-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-email">{ro.marketplace.quote.email}</Label>
              <Input
                id="quote-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-phone">{ro.marketplace.quote.phone}</Label>
              <Input
                id="quote-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quote-date">{ro.marketplace.quote.eventDate}</Label>
                <Input
                  id="quote-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-guests">{ro.marketplace.quote.guestCount}</Label>
                <Input
                  id="quote-guests"
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-location">{ro.marketplace.quote.eventLocation}</Label>
              <Input
                id="quote-location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-package">{ro.marketplace.quote.package}</Label>
              <select
                id="quote-package"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                <option value="">{ro.marketplace.quote.packageNone}</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>
            {events.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="quote-event">{ro.marketplace.quote.linkEvent}</Label>
                <select
                  id="quote-event"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value="">{ro.marketplace.quote.linkEventNone}</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="quote-message">{ro.marketplace.quote.message}</Label>
              <textarea
                id="quote-message"
                required
                minLength={20}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="button"
              className="w-full"
              disabled={pending || !name.trim() || !email.trim() || message.length < 20}
              onClick={handleSubmit}
            >
              {pending ? ro.marketplace.quote.submitting : ro.marketplace.quote.submit}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
