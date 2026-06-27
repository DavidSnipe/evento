"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Heart, LogOut, ChevronLeft, ChevronRight } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { getMainNav } from "@/config/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  userEmail?: string | null;
  activeEventId?: string | null;
  activeEventTitle?: string | null;
};

const isHighPriorityRoute = (href: string) => {
  const match = href.match(/^\/dashboard(?:\/events(?:\/[^/]+(?:\/(guests|seating|vendors|budget))?)?)?$/);
  return !!match;
};

export function AppSidebar({
  userEmail,
  activeEventId,
  activeEventTitle,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const prefetchedUrls = useRef<Set<string>>(new Set());
  const prefetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    setIsCollapsed(saved === "true");
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "EV";

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
          "flex items-center gap-3 px-4 py-6",
          isCollapsed ? "justify-center px-2" : "px-5"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--dash-blush)]/50 text-[var(--dash-accent-text)]">
          <Heart className="h-4 w-4 fill-[var(--dash-dusty-rose)]/30" strokeWidth={2} />
        </div>
        {!isCollapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-[var(--dash-text)]">
              Evento
            </p>
            <p className="truncate text-[10px] text-[var(--dash-text-muted)]">{ro.brand.tagline}</p>
          </div>
        ) : null}
        {!isCollapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-blush)]/30 hover:text-[var(--dash-text)]"
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
        <div className="mx-3 mb-4 rounded-[14px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] px-3.5 py-3 shadow-[var(--dash-shadow-sm)]">
          <p className="dash-type-micro mb-1.5">Eveniment activ</p>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dash-sage)]"
              aria-hidden
            />
            <p className="truncate text-[0.8125rem] font-semibold text-[var(--dash-text)]">
              {activeEventTitle}
            </p>
          </div>
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

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2">
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
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-[var(--dash-accent-text)]")} />
              {!isCollapsed ? <span className="truncate">{item.title}</span> : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
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
              <p className="truncate text-xs font-medium text-[var(--dash-text)]">{ro.nav.planner}</p>
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
