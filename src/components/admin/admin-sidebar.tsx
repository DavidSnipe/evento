"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Shield,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  userEmail?: string | null;
};

const navItems = [
  { href: "/admin", label: ro.admin.nav.overview, icon: LayoutDashboard, exact: true },
  { href: "/admin/vendors", label: ro.admin.nav.vendors, icon: Building2 },
  { href: "/admin/reviews", label: ro.admin.nav.reviews, icon: MessageSquare },
  { href: "/admin/requests", label: ro.admin.nav.requests, icon: ClipboardList },
];

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <aside className="admin-sidebar flex h-full w-60 shrink-0 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--admin-sidebar-border)] px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3d3835] text-white">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#2d2926]">{ro.admin.brand}</p>
          <p className="truncate text-[10px] text-[#7a726c]">Marketplace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive}
              className="admin-sidebar-nav-item"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--admin-sidebar-border)] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-8 w-8 border border-[var(--admin-sidebar-border)] bg-white">
            <AvatarFallback className="bg-[var(--admin-accent-soft)] text-[11px] font-semibold text-[#8b4a5c]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#2d2926]">Administrator</p>
            <p className="truncate text-[10px] text-[#7a726c]">{userEmail ?? "—"}</p>
          </div>
        </div>
        <form action={signOut} className="mt-2">
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              "h-9 w-full justify-start gap-2 px-2 text-[0.8125rem] font-medium text-[#5a534e] hover:bg-white/70"
            )}
          >
            <LogOut className="h-4 w-4" />
            {ro.nav.signOut}
          </Button>
        </form>
      </div>
    </aside>
  );
}
