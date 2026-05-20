import {
  CalendarDays,
  CalendarHeart,
  Camera,
  CircleDollarSign,
  LayoutDashboard,
  MailCheck,
  MapPin,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { ro } from "@/lib/i18n/ro";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

/** Build sidebar links; guests/seating need an active event */
export function getMainNav(activeEventId?: string | null): NavItem[] {
  const eventBase = activeEventId ? `/dashboard/events/${activeEventId}` : null;

  return [
    { title: ro.nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { title: ro.nav.events, href: "/dashboard/events", icon: CalendarHeart },
    {
      title: ro.nav.guests,
      href: eventBase ? `${eventBase}/guests` : "/dashboard/events",
      icon: Users,
    },
    {
      title: ro.nav.seating,
      href: eventBase ? `${eventBase}/seating` : "/dashboard/events",
      icon: UtensilsCrossed,
    },
    {
      title: ro.nav.rsvp,
      href: eventBase ? `${eventBase}/rsvp` : "/dashboard/events",
      icon: MailCheck,
    },
    {
      title: ro.nav.budget,
      href: eventBase ? `${eventBase}/budget` : "/dashboard/events",
      icon: CircleDollarSign,
    },
    {
      title: ro.nav.timeline,
      href: eventBase ? `${eventBase}/timeline` : "/dashboard/events",
      icon: CalendarDays,
    },
    {
      title: ro.nav.gallery,
      href: eventBase ? `${eventBase}/gallery` : "/dashboard/events",
      icon: Camera,
    },
    {
      title: ro.nav.vendors,
      href: eventBase ? `${eventBase}/vendors` : "/dashboard/events",
      icon: MapPin,
    },
  ];
}

/** @deprecated Use getMainNav(activeEventId) */
export const mainNav: NavItem[] = getMainNav();
