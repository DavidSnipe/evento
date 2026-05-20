"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, Menu, X } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { getMainNav } from "@/config/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  userEmail?: string | null;
  activeEventId?: string | null;
  activeEventTitle?: string | null;
};

export function MobileNav({
  userEmail,
  activeEventId,
  activeEventTitle,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "EV";
  
  // Extract event ID from pathname if we are inside an event
  const eventIdMatch = pathname.match(/^\/dashboard\/events\/([^/]+)/);
  const isNewEvent = pathname === "/dashboard/events/new";
  const contextualEventId = (eventIdMatch && !isNewEvent) ? eventIdMatch[1] : activeEventId;

  const navItems = getMainNav(contextualEventId);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Deschide meniul</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm md:hidden">
          <div className="flex items-center justify-between border-b border-border/60 bg-white/50 px-6 py-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/30 text-primary">
                <Heart className="h-4 w-4 fill-primary/40" />
              </div>
              <div>
                <p className="font-serif text-lg font-semibold tracking-tight">Evento</p>
                <p className="text-[10px] text-muted-foreground">{ro.brand.tagline}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Închide meniul</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            {activeEventTitle ? (
              <div className="mb-6 rounded-xl bg-primary/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Eveniment activ
                </p>
                <p className="truncate text-base font-medium">{activeEventTitle}</p>
              </div>
            ) : null}

            <nav className="space-y-2">
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
                      className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-base text-muted-foreground/60"
                    >
                      <Icon className="h-5 w-5" />
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
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/20 text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-border/50 bg-muted/20 p-6 pb-8">
            <div className="flex items-center gap-3 rounded-xl bg-white/60 p-4 shadow-sm">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ro.nav.planner}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {userEmail ?? ro.nav.guest}
                </p>
              </div>
            </div>
            <form action={signOut} className="mt-4">
              <Button type="submit" variant="ghost" className="w-full justify-start gap-2 py-6 text-base">
                <LogOut className="h-5 w-5" />
                {ro.nav.signOut}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
