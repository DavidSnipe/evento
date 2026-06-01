"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type InvitationCoverImageProps = {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  aspectClassName?: string;
};

export function InvitationCoverImage({
  src,
  alt = "",
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 512px) 100vw, 512px",
  aspectClassName = "aspect-[4/3]",
}: InvitationCoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 bg-[#FEF0F3] text-[#B8516B]",
          aspectClassName,
          className
        )}
      >
        <ImageOff className="h-8 w-8 opacity-60" />
        <p className="text-xs opacity-80">Imagine indisponibilă</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden", aspectClassName, className)}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FEF8F9]">
          <Loader2 className="h-6 w-6 animate-spin text-[#B8516B]/50" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          "object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          imageClassName
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
