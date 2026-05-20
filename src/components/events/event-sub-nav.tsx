"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const items = tabs(eventId);

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border/60 pb-4">
      {items.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/20 text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
