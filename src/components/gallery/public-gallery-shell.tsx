"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { UploadClient } from "@/components/gallery/upload-client";
import { PublicPhotoGrid } from "@/components/gallery/public-photo-grid";
import { Button } from "@/components/ui/button";
import { formatEventDate } from "@/lib/events/utils";
import { ro } from "@/lib/i18n/ro";
import type { PublicGalleryPhoto } from "@/types/gallery";
import { cn } from "@/lib/utils";

type GalleryView = "choice" | "upload" | "gallery";

type PublicGalleryShellProps = {
  qrSlug: string;
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  initialPhotos: PublicGalleryPhoto[];
  photoCount: number;
};

function viewStorageKey(qrSlug: string) {
  return `evento_gallery_${qrSlug}_view`;
}

function uploadedStorageKey(qrSlug: string) {
  return `evento_gallery_${qrSlug}_uploaded`;
}

function readStoredView(qrSlug: string): GalleryView | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(viewStorageKey(qrSlug));
  if (value === "upload" || value === "gallery" || value === "choice") {
    return value;
  }
  return null;
}

function hasUploadedBefore(qrSlug: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(uploadedStorageKey(qrSlug)) === "true";
}

export function PublicGalleryShell({
  qrSlug,
  eventId,
  eventTitle,
  eventDate,
  initialPhotos,
  photoCount,
}: PublicGalleryShellProps) {
  const [view, setView] = useState<GalleryView>("choice");
  const [hydrated, setHydrated] = useState(false);

  const persistView = useCallback(
    (next: GalleryView) => {
      setView(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(viewStorageKey(qrSlug), next);
      }
    },
    [qrSlug]
  );

  useEffect(() => {
    const stored = readStoredView(qrSlug);
    if (hasUploadedBefore(qrSlug)) {
      setView("gallery");
    } else if (stored && stored !== "choice") {
      setView(stored);
    } else {
      setView("choice");
    }
    setHydrated(true);
  }, [qrSlug]);

  const formattedDate = formatEventDate(eventDate);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F4F3]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B8516B] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="evento-public-page relative min-h-screen overflow-hidden bg-[#F5F4F3] font-sans">
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-[var(--color-blush-light)]/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-[var(--color-dash-ivory)] blur-[100px]" />

      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-screen flex-col px-6 py-10",
          view === "gallery" ? "max-w-6xl" : "max-w-md"
        )}
      >
        <header className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-rose-18 bg-white text-[var(--color-rose-dark)] shadow-sm">
              <Heart className="h-6 w-6 fill-[var(--color-blush-light)]" />
            </div>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            {ro.gallery.public.welcome}
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-[var(--color-dash-text)]">
            {eventTitle}
          </h1>
          {formattedDate ? (
            <p className="mt-2 text-sm text-muted-foreground">{formattedDate}</p>
          ) : null}
        </header>

        <main className="flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          {view === "choice" ? (
            <div className="flex flex-1 flex-col justify-center gap-4">
              <button
                type="button"
                onClick={() => persistView("upload")}
                className="w-full rounded-2xl border border-[#B8516B]/20 bg-gradient-to-br from-[#E8748A] to-[#B8516B] p-6 text-left text-white shadow-lg shadow-[#B8516B]/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <span className="text-2xl" aria-hidden>
                  📸
                </span>
                <h2 className="mt-3 text-lg font-bold">{ro.gallery.public.uploadCardTitle}</h2>
                <p className="mt-1 text-sm text-white/85">{ro.gallery.public.uploadCardSubtitle}</p>
              </button>

              <button
                type="button"
                onClick={() => persistView("gallery")}
                className="w-full rounded-2xl border border-[var(--dash-hairline)] bg-white/90 p-6 text-left shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <span className="text-2xl" aria-hidden>
                  🖼️
                </span>
                <h2 className="mt-3 text-lg font-bold text-[var(--dash-text)]">
                  {ro.gallery.public.viewCardTitle}
                </h2>
                <p className="mt-1 text-sm text-[var(--dash-text-secondary)]">
                  {ro.gallery.public.viewCardSubtitle}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-[var(--dash-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--dash-accent-text)]">
                  {ro.gallery.public.photoCount.replace("{count}", String(photoCount))}
                </span>
              </button>
            </div>
          ) : null}

          {view === "upload" ? (
            <UploadClient
              eventId={eventId}
              qrSlug={qrSlug}
              onViewGallery={() => persistView("gallery")}
            />
          ) : null}

          {view === "gallery" ? (
            <PublicPhotoGrid photos={initialPhotos} onUploadClick={() => persistView("upload")} />
          ) : null}
        </main>

        {view !== "choice" ? (
          <div className="mt-8 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => persistView("choice")}
            >
              ← Înapoi la meniu
            </Button>
          </div>
        ) : null}

        <footer className="mt-8 pb-4 text-center text-xs text-muted-foreground/60">
          <p>Powered by Evento</p>
        </footer>
      </div>
    </div>
  );
}
