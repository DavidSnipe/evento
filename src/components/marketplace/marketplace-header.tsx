import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";

type MarketplaceHeaderProps = {
  isLoggedIn: boolean;
  panelHref: string;
};

export function MarketplaceHeader({ isLoggedIn, panelHref }: MarketplaceHeaderProps) {
  return (
    <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-primary/30 text-primary" />
            <span className="font-serif text-xl font-semibold">Evento</span>
          </Link>
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
            {ro.marketplace.brand}
          </span>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/marketplace" className="hover:text-primary">
            {ro.marketplace.nav.vendors}
          </Link>
          <Link href="/marketplace#categorii" className="hover:text-primary">
            {ro.marketplace.nav.categories}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button asChild size="sm">
              <Link href={panelHref}>{ro.marketplace.nav.panel}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">{ro.marketplace.nav.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
