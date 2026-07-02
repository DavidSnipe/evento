import { GeistSans } from "geist/font/sans";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/admin/require-admin";
import { cn } from "@/lib/utils";

import "@/components/admin/admin-shell.css";
import "@/components/layout/dashboard-foundation.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();
  const userEmail = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  return (
    <div
      className={cn(
        "admin-shell dashboard-shell flex min-h-screen bg-[#faf8f6]",
        GeistSans.variable,
        GeistSans.className
      )}
    >
      <div className="hidden md:flex print:hidden">
        <AdminSidebar userEmail={userEmail} />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
