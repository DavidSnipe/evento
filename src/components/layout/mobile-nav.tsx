"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Heart, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Grid, 
  DollarSign, 
  Store, 
  Image as ImageIcon 
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
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

  // Check which page is currently active
  const isDashboardActive = pathname === "/dashboard";
  const isEventsActive = pathname === "/dashboard/events" || pathname === "/dashboard/events/new";
  
  const isGuestsActive = activeEventId 
    ? pathname.startsWith(`/dashboard/events/${activeEventId}/guests`) 
    : pathname.includes("/guests");
    
  const isSeatingActive = activeEventId 
    ? pathname.startsWith(`/dashboard/events/${activeEventId}/seating`) 
    : pathname.includes("/seating");

  // Secondary pages helpers
  const budgetHref = activeEventId ? `/dashboard/events/${activeEventId}/budget` : "#";
  const vendorsHref = activeEventId ? `/dashboard/events/${activeEventId}/vendors` : "#";
  const galleryHref = activeEventId ? `/dashboard/events/${activeEventId}/gallery` : "#";

  const isBudgetActive = pathname.includes("/budget");
  const isVendorsActive = pathname.includes("/vendors");
  const isGalleryActive = pathname.includes("/gallery");

  const bottomSheetContent = (
    <>
      {/* Backdrop with fade transition */}
      <div
        className={cn(
          "fixed inset-0 bg-[#1A0E14]/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ zIndex: 9998 }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Slide-up Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 rounded-t-[24px] bg-white border-t border-border-rose-22 p-6 shadow-mobile-drawer pb-10 transition-transform duration-300 ease-out flex flex-col gap-5",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ zIndex: 9999 }}
        role="dialog"
        aria-modal="true"
        aria-label="Meniu suplimentar"
      >
        {/* Drag Handle Indicator */}
        <div className="w-10 h-1 bg-border-rose-25 rounded-full mx-auto -mt-2 mb-2" />

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8748A] to-[#AA3F58] text-white">
              <Heart className="h-4.5 w-4.5 fill-white/20" />
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-[#1A0E14]">Evento Meniu</p>
              {activeEventTitle && (
                <p className="truncate text-[10px] text-text-subtle max-w-[200px]">{activeEventTitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Închide meniul"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Secondary Pages Links ── */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={budgetHref}
            onClick={close}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2 active:scale-95",
              isBudgetActive 
                ? "bg-[#FEF0F3] border-[#B8516B] text-[#B8516B]" 
                : "bg-white border-border-rose-18 text-text-secondary active:bg-slate-50"
            )}
          >
            <div className="p-2 rounded-xl bg-slate-50 text-text-secondary">
              <DollarSign size={18} className={cn(isBudgetActive && "text-[#B8516B]")} />
            </div>
            <span className="text-[11px] font-medium leading-none">Buget</span>
          </Link>

          <Link
            href={vendorsHref}
            onClick={close}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2 active:scale-95",
              isVendorsActive 
                ? "bg-[#FEF0F3] border-[#B8516B] text-[#B8516B]" 
                : "bg-white border-border-rose-18 text-text-secondary active:bg-slate-50"
            )}
          >
            <div className="p-2 rounded-xl bg-slate-50 text-text-secondary">
              <Store size={18} className={cn(isVendorsActive && "text-[#B8516B]")} />
            </div>
            <span className="text-[11px] font-medium leading-none">Furnizori</span>
          </Link>

          <Link
            href={galleryHref}
            onClick={close}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2 active:scale-95",
              isGalleryActive 
                ? "bg-[#FEF0F3] border-[#B8516B] text-[#B8516B]" 
                : "bg-white border-border-rose-18 text-text-secondary active:bg-slate-50"
            )}
          >
            <div className="p-2 rounded-xl bg-slate-50 text-text-secondary">
              <ImageIcon size={18} className={cn(isGalleryActive && "text-[#B8516B]")} />
            </div>
            <span className="text-[11px] font-medium leading-none">Galerie</span>
          </Link>
        </div>

        {/* ── User & Logout ── */}
        <div className="border-t border-border-rose-18 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#FDFAF9] to-[#FCEAEF]/40 border border-border-rose-18 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FEF0F3] to-[#FCEAEF] text-xs font-bold text-[#B8516B] border border-border-rose-22">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-text-secondary">{ro.nav.planner}</p>
              <p className="truncate text-[10px] text-text-subtle">
                {userEmail ?? ro.nav.guest}
              </p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 py-3 text-xs font-semibold text-[#7A6270] transition-colors active:bg-[#FF3B30]/10 active:text-[#FF3B30] active:border-transparent cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {ro.nav.signOut}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Floating Bottom Nav Bar - Figma Style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none md:print:hidden">
        <div
          className="flex justify-around items-center bg-white/85 backdrop-blur-[24px] border border-border-rose-25 rounded-[24px] p-2 shadow-mobile-drawer pointer-events-auto"
          style={{ WebkitBackdropFilter: "blur(24px)" }}
        >
          {/* Panou */}
          <Link
            href="/dashboard"
            className="relative flex flex-col items-center gap-1 p-2 flex-1 active:scale-95 transition-transform"
          >
            <LayoutDashboard 
              size={20} 
              strokeWidth={isDashboardActive ? 2.5 : 2} 
              className={cn(isDashboardActive ? "text-[#B8516B]" : "text-text-secondary")}
            />
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider", isDashboardActive ? "text-[#B8516B]" : "text-text-subtle")}>
              Panou
            </span>
            {isDashboardActive && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#B8516B]" />
            )}
          </Link>

          {/* Mese (Seating) */}
          <Link
            href={activeEventId ? `/dashboard/events/${activeEventId}/seating` : "/dashboard/events"}
            className="relative flex flex-col items-center gap-1 p-2 flex-1 active:scale-95 transition-transform"
          >
            <Grid 
              size={20} 
              strokeWidth={isSeatingActive ? 2.5 : 2} 
              className={cn(isSeatingActive ? "text-[#B8516B]" : "text-text-secondary")}
            />
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider", isSeatingActive ? "text-[#B8516B]" : "text-text-subtle")}>
              Mese
            </span>
            {isSeatingActive && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#B8516B]" />
            )}
          </Link>

          {/* Invitati (Guests) */}
          <Link
            href={activeEventId ? `/dashboard/events/${activeEventId}/guests` : "/dashboard/events"}
            className="relative flex flex-col items-center gap-1 p-2 flex-1 active:scale-95 transition-transform"
          >
            <Users 
              size={20} 
              strokeWidth={isGuestsActive ? 2.5 : 2} 
              className={cn(isGuestsActive ? "text-[#B8516B]" : "text-text-secondary")}
            />
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider", isGuestsActive ? "text-[#B8516B]" : "text-text-subtle")}>
              Invitați
            </span>
            {isGuestsActive && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#B8516B]" />
            )}
          </Link>

          {/* Plan (Events list) */}
          <Link
            href="/dashboard/events"
            className="relative flex flex-col items-center gap-1 p-2 flex-1 active:scale-95 transition-transform"
          >
            <Calendar 
              size={20} 
              strokeWidth={isEventsActive ? 2.5 : 2} 
              className={cn(isEventsActive ? "text-[#B8516B]" : "text-text-secondary")}
            />
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider", isEventsActive ? "text-[#B8516B]" : "text-text-subtle")}>
              Plan
            </span>
            {isEventsActive && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#B8516B]" />
            )}
          </Link>

          {/* Meniu (More toggle) */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex flex-col items-center gap-1 p-2 flex-1 active:scale-95 transition-transform cursor-pointer"
          >
            <Menu 
              size={20} 
              className={cn(isOpen ? "text-[#B8516B]" : "text-text-secondary")}
            />
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider", isOpen ? "text-[#B8516B]" : "text-text-subtle")}>
              Meniu
            </span>
          </button>
        </div>
      </div>

      {/* Render the bottom sheet in client portal */}
      {mounted && createPortal(bottomSheetContent, document.body)}
    </>
  );
}
