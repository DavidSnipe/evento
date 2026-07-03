import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { VendorAccessNotice } from "@/components/layout/vendor-access-notice";
import { VendorHintBanner } from "@/components/layout/vendor-hint-banner";
import { reconcileActiveEventAccess } from "@/lib/events/active-event-access";
import { getEventById } from "@/lib/events/queries";
import { getPendingGalleryCount } from "@/lib/gallery/queries";
import { getProfileForUser } from "@/lib/auth/profile";
import { getServerUser } from "@/lib/supabase/server-auth";
import { cn } from "@/lib/utils";

import "@/lib/motion/premium.css";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  const [activeEventId, profileRow] = await Promise.all([
    reconcileActiveEventAccess(),
    user ? getProfileForUser(user.id) : Promise.resolve(null),
  ]);
  const profile = profileRow
    ? {
        is_admin: profileRow.is_admin,
        is_planner: profileRow.is_planner,
        is_vendor: profileRow.is_vendor,
      }
    : null;
  const activeEvent = activeEventId ? await getEventById(activeEventId) : null;
  const pendingGalleryCount = activeEventId
    ? await getPendingGalleryCount(activeEventId)
    : 0;
  const userDisplayName =
    profileRow?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email;
  const userEmail = user?.email;

  return (
    <div
      className={cn(
        "dashboard-shell motion-dashboard-shell flex bg-[var(--dash-ivory)]",
        GeistSans.variable,
        GeistSans.className
      )}
      data-motion="dashboard"
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:flex print:hidden dashboard-sidebar-container">
        <AppSidebar
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          activeEventId={activeEventId}
          activeEventTitle={activeEvent?.title ?? null}
          isPlanner={profile?.is_planner ?? true}
          isVendor={profile?.is_vendor ?? false}
          pendingGalleryCount={pendingGalleryCount}
        />
      </div>

      <main className="flex-1 overflow-y-auto print:overflow-visible dashboard-main-container">
        {/* Mobile Top Bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--dash-hairline)] bg-[var(--dash-ivory)]/90 px-5 py-3 backdrop-blur-md md:hidden print:hidden mobile-top-bar">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--dash-blush)]/50 text-[var(--dash-accent-text)]">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none tracking-[-0.012em] text-[var(--dash-text)]">
                Evento
              </p>
              {activeEvent ? (
                <p className="mt-0.5 max-w-[180px] truncate text-[10px] font-medium text-[var(--dash-text-secondary)]">
                  {activeEvent.title}
                </p>
              ) : null}
            </div>
          </div>
          <MobileNav
            userDisplayName={userDisplayName}
            userEmail={userEmail}
            activeEventId={activeEventId}
            activeEventTitle={activeEvent?.title ?? null}
            pendingGalleryCount={pendingGalleryCount}
          />
        </div>

        {/* Page Content */}
        <div className="mx-auto max-w-6xl print:max-w-none print:p-0 print:m-0 dashboard-content-container">
          <Suspense fallback={null}>
            <VendorAccessNotice />
            <VendorHintBanner />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
