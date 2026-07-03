import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";

type MarketplaceHeaderProps = {
  isLoggedIn: boolean;
  panelHref: string;
};

export function MarketplaceHeader({ isLoggedIn, panelHref }: MarketplaceHeaderProps) {
  return (
    <header className="border-b border-[var(--dash-hairline)] bg-[var(--dash-surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-semibold tracking-tight text-[var(--dash-text)]">Evento</span>
          </Link>
          <span className="hidden text-sm font-medium text-[var(--dash-text-secondary)] sm:inline">
            {ro.marketplace.brand}
          </span>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/marketplace" className="text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]">
            {ro.marketplace.nav.vendors}
          </Link>
          <Link href="/marketplace#categorii" className="text-[var(--dash-text-secondary)] hover:text-[var(--dash-accent-text)]">
            {ro.marketplace.nav.categories}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button asChild size="sm" className="min-h-11">
              <Link href={panelHref}>{ro.marketplace.nav.panel}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="min-h-11">
              <Link href="/login">{ro.marketplace.nav.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
