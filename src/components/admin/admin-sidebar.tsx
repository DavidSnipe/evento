"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Building2, ClipboardList, LayoutDashboard, LogOut, MessageSquare } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { SidebarActiveIndicator } from "@/components/motion/sidebar-active-indicator";
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const displayName = userEmail ?? "Administrator";
  const initials = getInitials(displayName);

  return (
    <aside className="dash-sidebar flex h-full w-[var(--dash-sidebar-width)] shrink-0 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--dash-hairline)] px-5 py-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <p className="text-lg font-semibold tracking-tight text-[var(--dash-text)]">Evento</p>
          <span className="rounded-full bg-[var(--dash-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--dash-accent-text)]">
            Admin
          </span>
        </div>
      </div>

      <nav ref={navRef} className="dash-sidebar-nav--motion relative flex-1 space-y-0.5 px-2 py-2">
        <SidebarActiveIndicator navRef={navRef} pathname={pathname} collapsed={false} />
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
              className="dash-sidebar-nav-item"
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-[var(--dash-accent-text)]")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--dash-hairline)] p-3">
        <div className="flex items-center gap-3 rounded-[12px] px-2 py-2">
          <Avatar className="h-8 w-8 shrink-0 border border-[var(--dash-hairline)] bg-[var(--dash-surface)]">
            <AvatarFallback className="bg-[var(--dash-blush)]/40 text-[11px] font-semibold text-[var(--dash-accent-text)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--dash-text)]">Administrator</p>
            <p className="truncate text-[10px] text-[var(--dash-text-muted)]">{displayName}</p>
          </div>
        </div>
        <form action={signOut} className="mt-2">
          <Button
            type="submit"
            variant="ghost"
            className="h-9 w-full justify-start gap-2 px-2 text-[0.8125rem] font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-blush)]/25 hover:text-[var(--dash-accent-text)]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{ro.nav.signOut}</span>
          </Button>
        </form>
      </div>
    </aside>
  );
}
