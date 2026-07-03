"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LogOut, ChevronLeft, ChevronRight, Settings } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { AccountModeSwitcher } from "@/components/layout/account-mode-switcher";
import { SidebarActiveIndicator } from "@/components/motion/sidebar-active-indicator";
import { getMainNav } from "@/config/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  userDisplayName?: string | null;
  userEmail?: string | null;
  activeEventId?: string | null;
  activeEventTitle?: string | null;
  isPlanner?: boolean;
  isVendor?: boolean;
  pendingGalleryCount?: number;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const isHighPriorityRoute = (href: string) => {
  const match = href.match(/^\/dashboard(?:\/events(?:\/[^/]+(?:\/(guests|seating|vendors|budget))?)?)?$/);
  return !!match;
};

export function AppSidebar({
  userDisplayName,
  userEmail,
  activeEventId,
  activeEventTitle,
  isPlanner = true,
  isVendor = false,
  pendingGalleryCount = 0,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const prefetchedUrls = useRef<Set<string>>(new Set());
  const prefetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    setIsCollapsed(saved === "true");
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const displayName = userDisplayName ?? userEmail ?? ro.nav.guest;
  const initials = getInitials(displayName);
  const isProfileActive = pathname === "/dashboard/profile";

  const eventIdMatch = pathname.match(/^\/dashboard\/events\/([^/]+)/);
  const isNewEvent = pathname === "/dashboard/events/new";
  const contextualEventId = eventIdMatch && !isNewEvent ? eventIdMatch[1] : activeEventId;

  const navItems = getMainNav(contextualEventId);

  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (href: string) => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
    }
    if (!href || prefetchedUrls.current.has(href)) return;
    if (!isHighPriorityRoute(href)) return;

    prefetchTimerRef.current = setTimeout(() => {
      prefetchedUrls.current.add(href);
      router.prefetch(href);
      prefetchTimerRef.current = null;
    }, 150);
  };

  const handleMouseLeave = () => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  };

  return (
    <aside
      className={cn(
        "dash-sidebar flex h-full shrink-0 flex-col transition-[width] duration-300 ease-out",
        isCollapsed ? "w-[var(--dash-sidebar-collapsed)]" : "w-[var(--dash-sidebar-width)]"
      )}
    >
      {/* Header row */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-[var(--dash-hairline)] px-4 py-5",
          isCollapsed ? "justify-center px-2" : "px-5"
        )}
      >
        {!isCollapsed ? (
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight text-[var(--dash-text)]">Evento</p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-[var(--dash-text)]">E</p>
        )}
        {!isCollapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-accent-soft)] hover:text-[var(--dash-text)]"
            title="Restrânge meniul"
            aria-label="Restrânge meniul"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isCollapsed ? (
        <button
          type="button"
          onClick={toggleCollapse}
          className="mx-auto mb-3 flex h-7 w-7 items-center justify-center rounded-md text-[var(--dash-text-muted)] hover:bg-[var(--dash-blush)]/30"
          title="Extinde meniul"
          aria-label="Extinde meniul"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}

      {/* Active event */}
      {activeEventTitle && !isCollapsed ? (
        <div className="mx-3 mb-3 rounded-full bg-[var(--dash-accent-soft)] px-3 py-2">
          <p className="truncate text-xs font-semibold text-[var(--dash-accent-text)]">{activeEventTitle}</p>
        </div>
      ) : null}

      {activeEventTitle && isCollapsed ? (
        <div
          className="relative mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] text-[10px] font-semibold text-[var(--dash-accent-text)] shadow-[var(--dash-shadow-sm)]"
          title={activeEventTitle}
        >
          <span
            className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--dash-sage)]"
            aria-hidden
          />
          {activeEventTitle.slice(0, 2).toUpperCase()}
        </div>
      ) : null}

      <AccountModeSwitcher
        isPlanner={isPlanner}
        isVendor={isVendor}
        collapsed={isCollapsed}
      />

      {/* Navigation */}
      <nav
        ref={navRef}
        className={cn(
          "dash-sidebar-nav--motion relative flex-1 space-y-0.5 px-2",
          isCollapsed && "dash-sidebar-nav--collapsed"
        )}
      >
        <SidebarActiveIndicator navRef={navRef} pathname={pathname} collapsed={isCollapsed} />
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard/events"
              ? pathname === "/dashboard/events" || pathname === "/dashboard/events/new"
              : item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className={cn(
                  "dash-sidebar-nav-item cursor-not-allowed opacity-40",
                  isCollapsed && "justify-center px-0"
                )}
                title={ro.nav.comingSoon}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed ? <span className="truncate">{item.title}</span> : null}
              </span>
            );
          }

          const isCurrentlyLoading = loadingHref === item.href;

          const isGalleryItem = item.href.includes("/gallery");
          const showGalleryBadge = isGalleryItem && pendingGalleryCount > 0;

          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              prefetch
              data-active={isActive}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && pathname !== item.href) {
                  setLoadingHref(item.href);
                }
              }}
              onMouseEnter={() => handleMouseEnter(item.href)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "dash-sidebar-nav-item",
                isCollapsed && "justify-center px-0",
                isCurrentlyLoading && "opacity-70"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <span className="relative shrink-0">
                <Icon className={cn("h-[18px] w-[18px]", isActive && "text-[var(--dash-accent-text)]")} />
                {showGalleryBadge && isCollapsed ? (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--dash-ivory)]" />
                ) : null}
              </span>
              {!isCollapsed ? (
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                  <span className="truncate">{item.title}</span>
                  {showGalleryBadge ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {pendingGalleryCount > 9 ? "9+" : pendingGalleryCount}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-[var(--dash-hairline)] p-3">
        <Link
          href="/dashboard/profile"
          className={cn(
            "flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-[var(--dash-blush)]/20",
            isCollapsed && "justify-center",
            isProfileActive && "bg-[var(--dash-blush)]/25"
          )}
          title={isCollapsed ? ro.profile.title : undefined}
        >
          <Avatar className="h-8 w-8 shrink-0 border border-[var(--dash-hairline)] bg-[var(--dash-surface)]">
            <AvatarFallback className="bg-[var(--dash-blush)]/40 text-[11px] font-semibold text-[var(--dash-accent-text)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--dash-text)]">{ro.nav.planner}</p>
              <p className="truncate text-[10px] text-[var(--dash-text-muted)]">{displayName}</p>
            </div>
          ) : null}
          {!isCollapsed ? (
            <Settings className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />
          ) : null}
        </Link>
        <form action={signOut} className="mt-2">
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              "h-9 w-full justify-start gap-2 px-2 text-[0.8125rem] font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-blush)]/25 hover:text-[var(--dash-accent-text)]",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? ro.nav.signOut : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed ? <span>{ro.nav.signOut}</span> : null}
          </Button>
        </form>
      </div>
    </aside>
  );
}
