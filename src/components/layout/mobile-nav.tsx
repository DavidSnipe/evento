"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, Menu, X } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { getMainNav } from "@/config/navigation";
import { ro } from "@/lib/i18n/ro";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Ensure portal only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
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

  const menuContent = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 transition-opacity duration-300",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        style={{ zIndex: 9998 }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Full-screen Menu Panel */}
      <div
        className={cn(
          "fixed inset-0 flex flex-col bg-sidebar transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ zIndex: 9999 }}
        role="dialog"
        aria-modal="true"
        aria-label="Meniu navigare"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Heart className="h-5 w-5 fill-primary/30" />
            </div>
            <div>
              <p className="font-serif text-xl font-semibold leading-tight tracking-tight">
                Evento
              </p>
              <p className="text-xs text-muted-foreground">
                {ro.brand.tagline}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors active:bg-muted"
            aria-label="Închide meniul"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* ── Navigation Links ── */}
        <nav className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="space-y-0.5">
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
                    className="flex cursor-not-allowed items-center gap-4 rounded-2xl px-4 py-3.5 text-base text-muted-foreground/40"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{item.title}</span>
                    <span className="text-[10px] uppercase tracking-wider">
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
                    "flex items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground active:bg-muted/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── User Section ── */}
        <div className="mt-auto border-t border-border/30 px-5 py-5 pb-8">
          <div className="flex items-center gap-3 rounded-2xl bg-background/60 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {ro.nav.planner}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {userEmail ?? ro.nav.guest}
              </p>
            </div>
          </div>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors active:bg-destructive/10 active:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              {ro.nav.signOut}
            </button>
          </form>
        </div>
      </div>
    </>
  );

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

      {/* Portal: render menu at document.body root level so nothing clips it */}
      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}
