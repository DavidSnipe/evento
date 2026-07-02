"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  ClipboardList,
  ExternalLink,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Package,
  User,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { AccountModeSwitcher } from "@/components/layout/account-mode-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type VendorSidebarProps = {
  userEmail?: string | null;
  isPlanner: boolean;
  isVendor: boolean;
  vendorName?: string | null;
  vendorLogoUrl?: string | null;
  vendorSlug?: string | null;
};

export function VendorSidebar({
  userEmail,
  isPlanner,
  isVendor,
  vendorName,
  vendorLogoUrl,
  vendorSlug,
}: VendorSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vendor-sidebar-collapsed");
    setIsCollapsed(saved === "true");
  }, []);

  const initials = (vendorName ?? userEmail)?.slice(0, 2).toUpperCase() ?? "EV";

  const navItems = [
    { title: ro.vendor.nav.dashboard, href: "/vendor/dashboard", icon: LayoutDashboard },
    { title: ro.vendor.nav.profile, href: "/vendor/profile", icon: User },
    { title: ro.vendor.nav.packages, href: "/vendor/packages", icon: Package },
    { title: ro.vendor.nav.portfolio, href: "/vendor/portfolio", icon: ImageIcon },
    { title: ro.vendor.nav.availability, href: "/vendor/availability", icon: Calendar },
    { title: ro.vendor.nav.requests, href: "/vendor/requests", icon: ClipboardList },
  ];

  return (
    <aside
      className={cn(
        "dash-sidebar flex h-full shrink-0 flex-col transition-[width] duration-300 ease-out",
        isCollapsed ? "w-[var(--dash-sidebar-collapsed)]" : "w-[var(--dash-sidebar-width)]"
      )}
    >
      <div className={cn("flex items-center gap-3 px-5 py-6", isCollapsed && "justify-center px-2")}>
        {vendorLogoUrl ? (
          <Avatar className="h-9 w-9 shrink-0 rounded-[10px] border border-[var(--dash-hairline)]">
            <AvatarImage src={vendorLogoUrl} alt={vendorName ?? ""} className="object-cover" />
            <AvatarFallback className="rounded-[10px] bg-[var(--dash-blush)]/40 text-[11px] font-semibold text-[var(--dash-accent-text)]">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--dash-blush)]/50 text-[var(--dash-accent-text)]">
            <Building2 className="h-4 w-4" />
          </div>
        )}
        {!isCollapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-[var(--dash-text)]">
              {vendorName ?? "Evento"}
            </p>
            <p className="truncate text-[10px] text-[var(--dash-text-muted)]">
              {ro.vendor.dashboard.brandTagline}
            </p>
          </div>
        ) : null}
      </div>

      <AccountModeSwitcher
        isPlanner={isPlanner}
        isVendor={isVendor}
        collapsed={isCollapsed}
      />

      {!isCollapsed && vendorSlug ? (
        <div className="px-4 pb-2">
          <Link
            href={`/marketplace/${vendorSlug}`}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--dash-accent-text)] hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {ro.vendor.dashboard.previewProfile}
          </Link>
        </div>
      ) : null}

      <nav className="flex-1 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "dash-sidebar-nav-item",
                isCollapsed && "justify-center px-0",
                isActive && "bg-[var(--dash-blush)]/35 text-[var(--dash-accent-text)]"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed ? <span className="truncate">{item.title}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--dash-hairline)] p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-[12px] px-2 py-2",
            isCollapsed && "justify-center"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 border border-[var(--dash-hairline)] bg-[var(--dash-surface)]">
            <AvatarFallback className="bg-[var(--dash-blush)]/40 text-[11px] font-semibold text-[var(--dash-accent-text)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--dash-text)]">
                {ro.auth.modeSwitch.vendor}
              </p>
              <p className="truncate text-[10px] text-[var(--dash-text-muted)]">
                {userEmail ?? ro.nav.guest}
              </p>
            </div>
          ) : null}
        </div>
        <form action={signOut} className="mt-2">
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              "h-9 w-full justify-start gap-2 px-2 text-[0.8125rem] font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-blush)]/25 hover:text-[var(--dash-accent-text)]",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed ? <span>{ro.nav.signOut}</span> : null}
          </Button>
        </form>
      </div>
    </aside>
  );
}
