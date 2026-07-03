import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/admin/require-admin";
import { cn } from "@/lib/utils";

import "@/components/admin/admin-shell.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();
  const userEmail = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  return (
    <div className={cn("admin-shell dashboard-shell flex bg-[var(--dash-ivory)]")} data-motion="dashboard">
      <div className="hidden md:flex print:hidden dashboard-sidebar-container">
        <AdminSidebar userEmail={userEmail} />
      </div>
      <main className="flex-1 overflow-y-auto print:overflow-visible dashboard-main-container">
        <div className="mx-auto max-w-6xl dashboard-content-container">{children}</div>
      </main>
    </div>
  );
}
