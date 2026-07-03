"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Grid,
  DollarSign,
  Store,
  Image as ImageIcon,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";

import { signOut } from "@/app/(auth)/actions";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  userDisplayName?: string | null;
  userEmail?: string | null;
  activeEventId?: string | null;
  activeEventTitle?: string | null;
  pendingGalleryCount?: number;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: boolean;
};

export function MobileNav({
  userDisplayName,
  userEmail,
  activeEventId,
  activeEventTitle,
  pendingGalleryCount = 0,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);
  const displayName = userDisplayName ?? userEmail ?? ro.nav.guest;
  const initials = getInitials(displayName);

  const guestsHref = activeEventId ? `/dashboard/events/${activeEventId}/guests` : "/dashboard/events";
  const seatingHref = activeEventId ? `/dashboard/events/${activeEventId}/seating` : "/dashboard/events";
  const budgetHref = activeEventId ? `/dashboard/events/${activeEventId}/budget` : "/dashboard/events";

  const primaryItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Panou",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      href: guestsHref,
      label: "Invitați",
      icon: Users,
      isActive: pathname.includes("/guests"),
    },
    {
      href: seatingHref,
      label: "Mese",
      icon: Grid,
      isActive: pathname.includes("/seating"),
    },
    {
      href: budgetHref,
      label: "Buget",
      icon: DollarSign,
      isActive: pathname.includes("/budget"),
    },
  ];

  const moreLinks = [
    {
      href: "/dashboard/events",
      label: "Evenimente",
      icon: Calendar,
      isActive: pathname === "/dashboard/events" || pathname === "/dashboard/events/new",
    },
    {
      href: activeEventId ? `/dashboard/events/${activeEventId}/vendors` : "/dashboard/events",
      label: "Furnizori",
      icon: Store,
      isActive: pathname.includes("/vendors"),
    },
    {
      href: activeEventId ? `/dashboard/events/${activeEventId}/gallery` : "/dashboard/events",
      label: "Galerie",
      icon: ImageIcon,
      isActive: pathname.includes("/gallery"),
      badge: pendingGalleryCount,
    },
  ];

  const bottomSheetContent = (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/40 transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ zIndex: 9998 }}
        onClick={close}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 flex max-h-[85vh] flex-col gap-4 rounded-t-2xl border-t border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-6 pb-10 transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ zIndex: 9999, paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Mai mult"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--dash-text)]">Mai mult</p>
            {activeEventTitle ? (
              <p className="max-w-[240px] truncate text-xs text-[var(--dash-text-muted)]">
                {activeEventTitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--dash-ivory)]"
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {moreLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={close}
                className={cn(
                  "relative flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center",
                  item.isActive
                    ? "border-[var(--dash-accent-text)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)]"
                    : "border-[var(--dash-hairline)] bg-[var(--dash-surface)] text-[var(--dash-text-secondary)]"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-semibold">{item.label}</span>
                {"badge" in item && item.badge && item.badge > 0 ? (
                  <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-[var(--dash-hairline)] pt-4">
          <Link
            href="/dashboard/profile"
            onClick={close}
            className="flex items-center gap-3 rounded-xl border border-[var(--dash-hairline)] p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--dash-accent-soft)] text-xs font-bold text-[var(--dash-accent-text)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--dash-text)]">{ro.nav.planner}</p>
              <p className="truncate text-[10px] text-[var(--dash-text-muted)]">{displayName}</p>
            </div>
          </Link>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--dash-ivory)] text-xs font-semibold text-[var(--dash-text-secondary)]"
            >
              <LogOut className="h-4 w-4" />
              {ro.nav.signOut}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      <nav className="dash-bottom-nav fixed bottom-0 left-0 right-0 z-50 md:hidden md:print:hidden">
        <div className="flex items-stretch justify-around px-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1"
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    item.isActive ? "text-[var(--dash-accent-text)]" : "text-[var(--dash-text-muted)]"
                  )}
                  strokeWidth={item.isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    item.isActive ? "text-[var(--dash-accent-text)]" : "text-[var(--dash-text-muted)]"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1"
            aria-label="Mai mult"
          >
            <Menu
              className={cn(
                "h-5 w-5",
                isOpen ? "text-[var(--dash-accent-text)]" : "text-[var(--dash-text-muted)]"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-semibold",
                isOpen ? "text-[var(--dash-accent-text)]" : "text-[var(--dash-text-muted)]"
              )}
            >
              Mai mult
            </span>
          </button>
        </div>
      </nav>

      {mounted ? createPortal(bottomSheetContent, document.body) : null}
    </>
  );
}
