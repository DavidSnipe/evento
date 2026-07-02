import { GeistSans } from "geist/font/sans";

import { VendorSidebar } from "@/components/layout/vendor-sidebar";
import { getVendorPortalContext } from "@/lib/vendor/require-vendor";
import { cn } from "@/lib/utils";

import "@/components/layout/dashboard-foundation.css";

export const dynamic = "force-dynamic";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getVendorPortalContext();
  const userEmail = ctx.userEmail;

  return (
    <div
      className={cn(
        "dashboard-shell flex bg-[var(--dash-ivory)]",
        GeistSans.variable,
        GeistSans.className
      )}
    >
      <div className="hidden md:flex print:hidden dashboard-sidebar-container">
        <VendorSidebar
          userEmail={userEmail}
          isPlanner={ctx.isPlanner}
          isVendor={ctx.isVendor}
          vendorName={ctx.vendor?.name}
          vendorLogoUrl={ctx.vendor?.logo_url}
          vendorSlug={ctx.vendor?.slug}
        />
      </div>

      <main className="flex-1 overflow-y-auto print:overflow-visible dashboard-main-container">
        <div className="sticky top-0 z-40 flex items-center gap-2.5 border-b border-[var(--dash-hairline)] bg-[var(--dash-ivory)]/90 px-5 py-3 backdrop-blur-md md:hidden print:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--dash-blush)]/50 text-[var(--dash-accent-text)]">
            <HeartIcon />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-[var(--dash-text)]">
              {ctx.vendor?.name ?? "Evento"}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--dash-text-secondary)]">
              {userEmail ?? ""}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl dashboard-content-container">{children}</div>
      </main>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
