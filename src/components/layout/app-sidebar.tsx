"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { getMainNav } from "@/config/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  userEmail?: string | null;
  activeEventId?: string | null;
  activeEventTitle?: string | null;
};

export function AppSidebar({
  userEmail,
  activeEventId,
  activeEventTitle,
}: AppSidebarProps) {
  const pathname = usePathname();
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "EV";
  
  // Extract event ID from pathname if we are inside an event (e.g. /dashboard/events/[id]/...)
  const eventIdMatch = pathname.match(/^\/dashboard\/events\/([^/]+)/);
  const isNewEvent = pathname === "/dashboard/events/new";
  const contextualEventId = (eventIdMatch && !isNewEvent) ? eventIdMatch[1] : activeEventId;

  const navItems = getMainNav(contextualEventId);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/30 text-primary">
          <Heart className="h-5 w-5 fill-primary/40" />
        </div>
        <div>
          <p className="font-serif text-xl font-semibold tracking-tight">Evento</p>
          <p className="text-xs text-muted-foreground">{ro.brand.tagline}</p>
        </div>
      </div>

      {activeEventTitle ? (
        <div className="mx-3 mb-4 rounded-xl bg-primary/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Eveniment activ
          </p>
          <p className="truncate text-sm font-medium">{activeEventTitle}</p>
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 px-3">
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
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/40 transition-opacity duration-200"
                title={ro.nav.comingSoon}
              >
                <Icon className="h-4 w-4" />
                {item.title}
                <span className="ml-auto text-[10px] uppercase tracking-wider">
                  {ro.nav.soon}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98]",
                isActive
                  ? "bg-primary/20 text-foreground shadow-sm scale-[1.02]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0.5"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 rounded-xl bg-white/50 p-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ro.nav.planner}</p>
            <p className="truncate text-xs text-muted-foreground">
              {userEmail ?? ro.nav.guest}
            </p>
          </div>
        </div>
        <form action={signOut} className="mt-3">
          <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            {ro.nav.signOut}
          </Button>
        </form>
      </div>
    </aside>
  );
}
