import { AppSidebar } from "@/components/layout/app-sidebar";
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

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:flex print:hidden">
        <AppSidebar
          userEmail={user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}
          activeEventId={activeEventId}
          activeEventTitle={activeEvent?.title ?? null}
        />
      </div>
      <main className="flex-1 overflow-y-auto print:overflow-visible">
        <div className="border-b border-border/60 bg-white/50 px-6 py-4 backdrop-blur md:hidden print:hidden">
          <p className="font-serif text-lg font-semibold">Evento</p>
          <p className="text-xs text-muted-foreground">{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}</p>
          {activeEvent ? (
            <p className="mt-1 truncate text-xs text-primary">{activeEvent.title}</p>
          ) : null}
        </div>
        <div className="mx-auto max-w-6xl p-6 md:p-10 print:max-w-none print:p-0 print:m-0">{children}</div>
      </main>
    </div>
  );
}
