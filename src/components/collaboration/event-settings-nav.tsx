"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type EventSettingsNavProps = {
  eventId: string;
};

const tabs = (eventId: string) => [
  {
    href: `/dashboard/events/${eventId}/settings/calendar`,
    label: ro.calendar.subscription.settingsNav,
  },
  {
    href: `/dashboard/events/${eventId}/settings/collaborators`,
    label: ro.collaboration.settingsNav.collaborators,
  },
];

export function EventSettingsNav({ eventId }: EventSettingsNavProps) {
  const pathname = usePathname();
  const items = tabs(eventId);

  return (
    <nav className="inline-flex flex-wrap rounded-xl border border-[rgba(210,170,185,0.25)] bg-white/80 p-1 gap-1">
      {items.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              active
                ? "bg-[#FEF0F3] text-[#B8516B]"
                : "text-text-secondary hover:text-[#B8516B]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
