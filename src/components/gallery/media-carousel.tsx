"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { MediaUpload } from "@/types/gallery";

export function MediaCarousel({
  media,
  startIndex,
  onClose,
}: {
  media: MediaUpload[];
  startIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const current = media[currentIndex];

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : media.length - 1));
  }, [media.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < media.length - 1 ? i + 1 : 0));
  }, [media.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const handleDownloadOne = async () => {
    try {
      const resp = await fetch(current.file_url);
      const blob = await resp.blob();
      const ext = current.mime_type?.split("/")[1] || "jpg";
      const filename = `evento_${currentIndex + 1}.${ext}`;

      // Try Web Share API first (mobile – saves directly to gallery / AirDrop)
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: blob.type })] })) {
        const file = new File([blob], filename, { type: blob.type });
        await navigator.share({ files: [file] });
      } else {
        // Fallback: browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      /* user cancelled share sheet */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4">
        <span className="text-white/70 text-sm font-medium bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {media.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadOne}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
            title="Descarcă"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation arrows (desktop) */}
      {media.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 z-20 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 z-20 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Main media */}
      <div className="relative z-10 flex items-center justify-center w-full h-full p-4 md:px-20">
        {current.file_type === "video" ? (
          <video
            key={current.id}
            src={current.file_url}
            className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
            controls
            autoPlay
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={current.id}
            src={current.file_url}
            alt={`Foto ${currentIndex + 1}`}
            className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          />
        )}
      </div>

      {/* Uploaded by */}
      {current.uploaded_by && (
        <div className="absolute bottom-6 z-20 text-center">
          <span className="text-white/60 text-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
            De la: {current.uploaded_by}
          </span>
        </div>
      )}

      {/* Close on backdrop click */}
      <div className="absolute inset-0 z-0" onClick={onClose} />
    </div>
  );
}
