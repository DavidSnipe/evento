import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="glass-panel p-8 transition hover:shadow-xl">
              <h2 className="font-serif text-xl font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
