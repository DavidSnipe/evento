import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getActiveEventId } from "@/lib/events/active-event";
import { getEventById } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeEventId = await getActiveEventId();
  const activeEvent = activeEventId ? await getEventById(activeEventId) : null;
  const userEmail =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex print:hidden dashboard-sidebar-container">
        <AppSidebar
          userEmail={userEmail}
          activeEventId={activeEventId}
          activeEventTitle={activeEvent?.title ?? null}
        />
      </div>

      <main className="flex-1 overflow-y-auto print:overflow-visible dashboard-main-container">
        {/* Mobile Top Bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-5 py-3 backdrop-blur-lg md:hidden print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-base font-semibold leading-tight">
                Evento
              </p>
              {activeEvent ? (
                <p className="max-w-[180px] truncate text-[11px] text-primary">
                  {activeEvent.title}
                </p>
              ) : null}
            </div>
          </div>
          <MobileNav
            userEmail={userEmail}
            activeEventId={activeEventId}
            activeEventTitle={activeEvent?.title ?? null}
          />
        </div>

        {/* Page Content */}
        <div className="mx-auto max-w-6xl p-6 md:p-10 print:max-w-none print:p-0 print:m-0 dashboard-content-container">
          {children}
        </div>
      </main>
    </div>
  );
}
