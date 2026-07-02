"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { PortfolioLightbox } from "@/components/marketplace/portfolio-lightbox";
import { PublicAvailabilityCalendar } from "@/components/marketplace/public-availability-calendar";
import { QuoteRequestModal } from "@/components/marketplace/quote-request-modal";
import { ReviewFormModal } from "@/components/marketplace/review-form-modal";
import { VendorStars } from "@/components/marketplace/vendor-stars";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { Button } from "@/components/ui/button";
import { getMarketplaceCategoryLabel } from "@/lib/admin/category-labels";
import { getIconForVendorCategory } from "@/lib/icons/registry";
import { formatLocation, formatPackagePrice } from "@/lib/marketplace/format";
import type { MarketplaceVendorDetail } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";
import type { EventRow } from "@/types/events";
import { cn } from "@/lib/utils";

type VendorPublicProfileProps = {
  vendor: MarketplaceVendorDetail;
  isLoggedIn: boolean;
  userName?: string | null;
  userEmail?: string | null;
  events?: EventRow[];
};

const SECTIONS = [
  "about",
  "packages",
  "portfolio",
  "availability",
  "reviews",
  "location",
] as const;

type SectionId = (typeof SECTIONS)[number];

export function VendorPublicProfile({
  vendor,
  isLoggedIn,
  userName,
  userEmail,
  events = [],
}: VendorPublicProfileProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("about");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const location = formatLocation(vendor.location_city, vendor.location_county);
  const reviewLabel = ro.marketplace.reviewsCount.replace(
    "{count}",
    String(vendor.review_count)
  );

  const openQuote = (packageId?: string | null) => {
    setSelectedPackageId(packageId ?? null);
    setQuoteOpen(true);
  };

  useEffect(() => {
    if (quoteOpen) return;
    setSelectedPackageId(null);
  }, [quoteOpen]);

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-10">
      <div className="relative -mx-4 sm:-mx-6">
        <div className="relative h-[220px] bg-gradient-to-br from-[hsl(350,35%,88%)] to-[hsl(30,40%,85%)] sm:h-[300px]">
          {vendor.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-white shadow-lg sm:h-28 sm:w-28">
                {vendor.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-semibold text-primary">
                    {vendor.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-serif text-2xl font-semibold sm:text-4xl">{vendor.name}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  {vendor.categories.map((cat) => (
                    <span
                      key={cat.category_slug}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs",
                        cat.is_primary
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      <EmojiIcon icon={getIconForVendorCategory(cat.category_slug)} size="sm" />
                      {getMarketplaceCategoryLabel(cat.category_slug)}
                    </span>
                  ))}
                </div>
                {location ? (
                  <p className="mt-2 text-sm text-muted-foreground">{location}</p>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  <VendorStars rating={vendor.review_avg} size="md" />
                  <span className="text-sm text-muted-foreground">{reviewLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              <Button onClick={() => openQuote()}>{ro.marketplace.profile.requestQuote}</Button>
              <Button variant="outline" onClick={() => scrollToSection("availability")}>
                {ro.marketplace.profile.viewAvailability}
              </Button>
              {vendor.website ? (
                <Button variant="outline" asChild>
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer">
                    {ro.marketplace.profile.website}
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1 overflow-x-auto py-2">
          {SECTIONS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition",
                activeSection === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {ro.marketplace.profile.sections[id]}
            </button>
          ))}
        </div>
      </nav>

      <div className="space-y-16">
        <section id="section-about" className="scroll-mt-28">
          <h2 className="font-serif text-xl font-semibold">{ro.marketplace.profile.sections.about}</h2>
          <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
            {vendor.description?.trim() || vendor.tagline || "—"}
          </p>
        </section>

        <section id="section-packages" className="scroll-mt-28">
          <h2 className="font-serif text-xl font-semibold">
            {ro.marketplace.profile.sections.packages}
          </h2>
          {vendor.packages.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">{ro.marketplace.profile.noPackages}</p>
              <Button type="button" className="mt-4" onClick={() => openQuote()}>
                {ro.marketplace.profile.requestQuote}
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {vendor.packages.map((pkg) => (
                <article
                  key={pkg.id}
                  className="rounded-2xl border border-border/70 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold">{pkg.name}</h3>
                  {pkg.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p>
                  ) : null}
                  <p className="mt-3 text-lg font-medium text-primary">
                    {formatPackagePrice(pkg)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4"
                    variant="outline"
                    onClick={() => openQuote(pkg.id)}
                  >
                    {ro.marketplace.profile.requestPackage}
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="section-portfolio" className="scroll-mt-28">
          <h2 className="font-serif text-xl font-semibold">
            {ro.marketplace.profile.sections.portfolio}
          </h2>
          {vendor.portfolio.length === 0 ? (
            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className="aspect-square rounded-xl border border-dashed border-border/70 bg-gradient-to-br from-muted/40 to-muted/10"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{ro.marketplace.profile.noPortfolio}</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {vendor.portfolio.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-xl bg-secondary"
                  onClick={() => setLightboxIndex(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.caption ?? ""} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section id="section-availability" className="scroll-mt-28">
          <h2 className="font-serif text-xl font-semibold">
            {ro.marketplace.profile.sections.availability}
          </h2>
          <div className="mt-6 max-w-lg">
            <PublicAvailabilityCalendar availability={vendor.availability} />
          </div>
        </section>

        <section id="section-reviews" className="scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold">
                {ro.marketplace.profile.sections.reviews}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <VendorStars rating={vendor.review_avg} size="md" />
                <span className="text-sm font-medium">
                  {vendor.review_avg != null ? vendor.review_avg.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-muted-foreground">{reviewLabel}</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setReviewOpen(true)}>
              {ro.marketplace.profile.leaveReview}
            </Button>
          </div>
          {vendor.reviews.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">{ro.marketplace.profile.noReviews}</p>
          ) : (
            <div className="mt-6 space-y-4">
              {vendor.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-border/70 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{review.reviewer_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {review.event_year ? <span>{review.event_year}</span> : null}
                      <VendorStars rating={review.rating} />
                    </div>
                  </div>
                  {review.title ? <p className="mt-2 font-medium">{review.title}</p> : null}
                  {review.body ? (
                    <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="section-location" className="scroll-mt-28">
          <h2 className="font-serif text-xl font-semibold">
            {ro.marketplace.profile.sections.location}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{ro.marketplace.profile.locationHint}</p>
          <p className="mt-4 text-lg">{location ?? "—"}</p>
        </section>
      </div>

      <QuoteRequestModal
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        vendorId={vendor.id}
        packages={vendor.packages}
        preselectedPackageId={selectedPackageId}
        userName={userName}
        userEmail={userEmail}
        events={events}
      />

      <ReviewFormModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        vendorId={vendor.id}
        isLoggedIn={isLoggedIn}
        defaultName={userName}
      />

      <PortfolioLightbox
        items={vendor.portfolio}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
