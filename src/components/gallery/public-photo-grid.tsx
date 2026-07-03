"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

import { MediaCarousel } from "@/components/gallery/media-carousel";
import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";
import type { MediaUpload, PublicGalleryPhoto } from "@/types/gallery";
import { cn } from "@/lib/utils";

type PublicPhotoGridProps = {
  photos: PublicGalleryPhoto[];
  onUploadClick: () => void;
};

function toCarouselMedia(photos: PublicGalleryPhoto[]): MediaUpload[] {
  return photos.map((photo) => ({
    id: photo.id,
    event_id: "",
    file_url: photo.url,
    file_type: photo.file_type,
    mime_type: null,
    size: null,
    uploaded_by: photo.uploader_name,
    approved: true,
    is_favorite: false,
    created_at: photo.created_at,
  }));
}

export function PublicPhotoGrid({ photos, onUploadClick }: PublicPhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const carouselMedia = useMemo(() => toCarouselMedia(photos), [photos]);

  if (photos.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm text-[var(--dash-text-secondary)]">
          {ro.gallery.public.emptyGallery}
        </p>
        <Button onClick={onUploadClick} className="mt-6 min-h-11 rounded-xl px-6">
          <Camera className="mr-2 h-4 w-4" />
          {ro.gallery.public.uploadCta}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 space-y-3 md:columns-3 lg:columns-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className={cn(
              "group relative mb-3 w-full break-inside-avoid overflow-hidden rounded-xl border border-[var(--dash-hairline)] bg-white shadow-sm transition-transform hover:scale-[1.01]"
            )}
            onClick={() => setLightboxIndex(index)}
          >
            {photo.file_type === "video" ? (
              <video src={photo.url} className="h-auto w-full" muted playsInline />
            ) : (
              <Image
                src={photo.thumbnail_url ?? photo.url}
                alt=""
                width={400}
                height={400}
                className="h-auto w-full object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )}
            {photo.uploader_name ? (
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-8 text-left text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {photo.uploader_name}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <Button
        onClick={onUploadClick}
        className="fixed bottom-6 right-6 z-40 min-h-11 rounded-full px-5 shadow-lg shadow-[#B8516B]/25 md:bottom-8 md:right-8"
      >
        <Camera className="mr-2 h-4 w-4" />
        {ro.gallery.public.uploadCta}
      </Button>

      {lightboxIndex !== null ? (
        <MediaCarousel
          media={carouselMedia}
          startIndex={Math.min(lightboxIndex, carouselMedia.length - 1)}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
