import Link from "next/link";

import { ro } from "@/lib/i18n/ro";

export function MarketplaceFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/60 bg-[hsl(350,28%,97%)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>{ro.marketplace.footer.copyright.replace("{year}", String(year))}</p>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-foreground">
            {ro.marketplace.footer.home}
          </Link>
          <Link href="/marketplace" className="hover:text-foreground">
            {ro.marketplace.footer.marketplace}
          </Link>
          <Link href="/login" className="hover:text-foreground">
            {ro.marketplace.footer.signIn}
          </Link>
        </div>
      </div>
    </footer>
  );
}
