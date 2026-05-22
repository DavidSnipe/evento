"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type EventSubNavProps = {
  eventId: string;
};

const tabs = (eventId: string) => [
  { href: `/dashboard/events/${eventId}`, label: ro.events.subNav.overview, exact: true },
  { href: `/dashboard/events/${eventId}/guests`, label: ro.events.subNav.guests },
  { href: `/dashboard/events/${eventId}/seating`, label: ro.events.subNav.seating },
];

export function EventSubNav({ eventId }: EventSubNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const prefetchedUrls = useRef<Set<string>>(new Set());
  const prefetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const items = tabs(eventId);

  // Clear loading state when page change completes
  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  // Clean up timer on unmount
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
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border/60 pb-4">
      {items.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        const isCurrentlyLoading = loadingHref === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={true}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && pathname !== tab.href) {
                setLoadingHref(tab.href);
              }
            }}
            onMouseEnter={() => handleMouseEnter(tab.href)}
            onMouseLeave={handleMouseLeave}
            className={cn(
              "relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] overflow-hidden",
              isActive
                ? "bg-primary/20 text-foreground shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              isCurrentlyLoading && "opacity-80 bg-primary/5"
            )}
          >
            {tab.label}
            {isCurrentlyLoading && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary/45 animate-soft-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
