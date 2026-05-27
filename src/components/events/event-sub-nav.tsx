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
  { href: `/dashboard/events/${eventId}/budget`, label: "Buget" },
  { href: `/dashboard/events/${eventId}/vendors`, label: "Furnizori" },
  { href: `/dashboard/events/${eventId}/gallery`, label: "Galerie" },
  { href: `/dashboard/events/${eventId}/rsvp`, label: "RSVP" },
  { href: `/dashboard/events/${eventId}/timeline`, label: "Cronologie" },
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
    <div className="mb-8 overflow-x-auto scrollbar-none border-b border-border-rose-18 pb-3 event-sub-nav">
      <nav className="inline-flex items-center gap-1 bg-[#FDFAF9]/60 border border-border-rose-18 p-1 rounded-xl min-w-max">
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
                "relative rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-all duration-200 ease-out overflow-hidden border cursor-pointer",
                isActive
                  ? "bg-white text-[#B8516B] shadow-[0_2px_8px_rgba(180,100,120,0.08)] border-border-rose-22"
                  : "text-[#7A6270] hover:text-[#B8516B] border-transparent",
                isCurrentlyLoading && "opacity-80"
              )}
            >
              {tab.label}
              {isCurrentlyLoading && (
                <span className="absolute bottom-0 left-2 right-2 h-[1.5px] rounded-full bg-primary/45 animate-soft-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
