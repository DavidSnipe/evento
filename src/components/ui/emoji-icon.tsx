"use client";

import { useState } from "react";

import {
  getIconAssetPath,
  getUnicodeFallback,
  ICON_REGISTRY,
  type IconKey,
} from "@/lib/icons/registry";
import { cn } from "@/lib/utils";

const SIZE_PX = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export type EmojiIconSize = keyof typeof SIZE_PX;

export type EmojiIconProps = {
  icon: IconKey;
  size?: EmojiIconSize;
  className?: string;
};

export function EmojiIcon({ icon, size = "md", className }: EmojiIconProps) {
  const [failed, setFailed] = useState(false);
  const px = SIZE_PX[size];
  const meta = ICON_REGISTRY[icon];

  if (failed) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
        style={{ width: px, height: px, fontSize: Math.round(px * 0.85) }}
        role="img"
        aria-label={meta.labelRo}
      >
        {getUnicodeFallback(icon)}
      </span>
    );
  }

  return (
    // External SVG assets from the icon registry; next/image does not add value here.
    // eslint-disable-next-line @next/next/no-img-element -- lazy-loaded registry SVGs with unicode fallback on error
    <img
      src={getIconAssetPath(icon)}
      alt={meta.labelRo}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      className={cn("inline-block shrink-0 object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}