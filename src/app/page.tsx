import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";

import { VendorCard } from "@/components/marketplace/vendor-card";
import { Button } from "@/components/ui/button";
import { getFeaturedVendors } from "@/lib/marketplace/queries";
import { ro } from "@/lib/i18n/ro";
import { getServerUser } from "@/lib/supabase/server-auth";

function MarketplacePlaceholderCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm"
        >
          <div className="aspect-[16/9] bg-gradient-to-br from-[hsl(350,35%,92%)] to-[hsl(30,40%,90%)]" />
          <div className="space-y-2 p-5">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted/70" />
            <p className="text-sm text-muted-foreground">{ro.marketplace.empty}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const user = await getServerUser();
  const featured = await getFeaturedVendors(3);

  const features = [
    ro.landing.features.guests,
    ro.landing.features.budget,
    ro.landing.features.timeline,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[hsl(350,28%,97%)] to-secondary/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 fill-primary/30 text-primary" />
          <span className="font-serif text-2xl font-semibold">Evento</span>
        </div>
        <nav className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/marketplace">{ro.landing.marketplace}</Link>
          </Button>
          {user ? (
            <Button asChild>
              <Link href="/dashboard">{ro.landing.goDashboard}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">{ro.landing.signIn}</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">{ro.landing.getStarted}</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 text-sm text-foreground/80">
            <Sparkles className="h-4 w-4 text-accent" />
            {ro.landing.badge}
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
            {ro.landing.title}{" "}
            <span className="text-gradient-gold">{ro.landing.titleHighlight}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            {ro.landing.subtitle}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={user ? "/dashboard" : "/signup"}>
                {ro.landing.ctaStart}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">{ro.landing.ctaHasAccount}</Link>
            </Button>
          </div>
        </section>

        <section className="mt-24">
          <div className="mb-8 text-center">
            <h2 className="font-serif text-3xl font-semibold">
              {ro.landing.marketplaceSection.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              {ro.landing.marketplaceSection.subtitle}
            </p>
          </div>
          {featured.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {featured.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          ) : (
            <MarketplacePlaceholderCards />
          )}
          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link href="/marketplace">{ro.landing.marketplaceSection.explore}</Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="glass-panel p-8 transition hover:shadow-xl">
              <h2 className="font-serif text-xl font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-24 rounded-3xl border border-border/60 bg-white/70 p-10 text-center shadow-sm">
          <h2 className="font-serif text-2xl font-semibold md:text-3xl">{ro.landing.vendorCta.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{ro.landing.vendorCta.subtitle}</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup?role=vendor">{ro.landing.vendorCta.button}</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
