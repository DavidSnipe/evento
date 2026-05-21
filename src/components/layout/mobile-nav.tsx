"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, Menu, X } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { getMainNav } from "@/config/navigation";
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

  // Lock body scroll when menu is open
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

  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "EV";

  // Extract event ID from pathname if we are inside an event
  const eventIdMatch = pathname.match(/^\/dashboard\/events\/([^/]+)/);
  const isNewEvent = pathname === "/dashboard/events/new";
  const contextualEventId =
    eventIdMatch && !isNewEvent ? eventIdMatch[1] : activeEventId;

  const navItems = getMainNav(contextualEventId);

  return (
    <>
      {/* Hamburger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors active:bg-primary/20 md:hidden"
        aria-label="Deschide meniul"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[101] w-[85vw] max-w-[320px] transform bg-sidebar shadow-2xl transition-transform duration-300 ease-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Meniu navigare"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/25 text-primary">
                <Heart className="h-4 w-4 fill-primary/40" />
              </div>
              <div>
                <p className="font-serif text-lg font-semibold leading-tight tracking-tight">
                  Evento
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {ro.brand.tagline}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:bg-muted"
              aria-label="Închide meniul"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Active Event Badge */}
          {activeEventTitle ? (
            <div className="mx-4 mt-4 rounded-xl bg-primary/10 px-4 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                Eveniment activ
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                {activeEventTitle}
              </p>
            </div>
          ) : null}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard/events"
                    ? pathname === "/dashboard/events" ||
                      pathname === "/dashboard/events/new"
                    : item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <span
                      key={item.href}
                      className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground/50"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      <span className="flex-1">{item.title}</span>
                      <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {ro.nav.soon}
                      </span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href + item.title}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/10"
                        : "text-muted-foreground active:bg-muted/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-primary" : ""
                      )}
                    />
                    <span className="flex-1">{item.title}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User & Sign Out */}
          <div className="border-t border-border/40 bg-muted/10 px-4 py-5 pb-safe">
            <div className="flex items-center gap-3 rounded-xl bg-background/80 p-3 shadow-sm ring-1 ring-border/30">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {userEmail ?? ro.nav.guest}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {ro.nav.planner}
                </p>
              </div>
            </div>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors active:bg-destructive/10 active:text-destructive"
              >
                <LogOut className="h-[18px] w-[18px]" />
                {ro.nav.signOut}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
