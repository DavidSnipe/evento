import Link from "next/link";

import { LandingFeatureCards } from "@/components/motion/landing-feature-cards";
import { LandingHero } from "@/components/motion/landing-hero";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { Button } from "@/components/ui/button";
import { getFeaturedVendors } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";
import { getServerUser } from "@/lib/supabase/server-auth";

const FEATURE_IMAGES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
];

export default async function HomePage() {
  const user = await getServerUser();
  const featured = await getFeaturedVendors(3);

  const features = [
    ro.landing.features.guests,
    ro.landing.features.budget,
    ro.landing.features.timeline,
  ];

  return (
    <div className="min-h-screen bg-[var(--color-dash-ivory)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--color-dash-text)]">
          Evento
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/marketplace">{ro.landing.marketplace}</Link>
          </Button>
          {user ? (
            <Button size="sm" className="min-h-11" asChild>
              <Link href="/dashboard">{ro.landing.goDashboard}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="min-h-11" asChild>
                <Link href="/login">{ro.landing.signIn}</Link>
              </Button>
              <Button size="sm" className="min-h-11" asChild>
                <Link href="/signup">{ro.landing.getStarted}</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <LandingHero isAuthenticated={Boolean(user)} />

        {featured.length > 0 ? (
          <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-dash-text)]">
                {ro.landing.marketplaceSection.title}
              </h2>
              <p className="mt-2 max-w-2xl text-[var(--color-text-secondary)]">
                {ro.landing.marketplaceSection.subtitle}
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {featured.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
            <div className="mt-8 text-center sm:text-left">
              <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
                <Link href="/marketplace">{ro.landing.marketplaceSection.explore}</Link>
              </Button>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <LandingFeatureCards features={features} images={FEATURE_IMAGES} />
        </section>

        <section className="bg-[#1a0e12] px-5 py-16 text-center sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{ro.landing.vendorCta.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
              {ro.landing.vendorCta.subtitle}
            </p>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="mt-8 min-h-11 w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto"
            >
              <Link href="/signup?role=vendor">{ro.landing.vendorCta.button}</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
