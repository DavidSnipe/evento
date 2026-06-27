"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EventoCategorySlug =
  | "venue"
  | "photographer"
  | "videographer"
  | "dj"
  | "band"
  | "decorations"
  | "florist"
  | "catering"
  | "cake"
  | "candy_bar"
  | "photo_booth"
  | "transportation"
  | "accommodation"
  | "invitations"
  | "makeup"
  | "hair"
  | "wedding_planner"
  | "other";

export type EventoIconSize = "sm" | "md" | "lg";

export const EVENTO_ICON_SIZES: Record<EventoIconSize, number> = {
  sm: 20,
  md: 24,
  lg: 32,
};

type IconProps = { size?: EventoIconSize; className?: string };

function EventoIconShell({
  children,
  size = "md",
  className,
}: IconProps & { children: ReactNode }) {
  const px = EVENTO_ICON_SIZES[size];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      aria-hidden
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_1px_2px_rgba(180,100,120,0.15)]"
      >
        {children}
      </svg>
    </span>
  );
}

function VenueIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <circle cx="16" cy="24" r="5" fill="#D8DEE8" />
      <circle cx="16" cy="24" r="3.5" fill="#B8C2D0" />
      <path
        d="M16 6C12.5 6 10 9 10 12.5C10 17.5 16 25 16 25C16 25 22 17.5 22 12.5C22 9 19.5 6 16 6Z"
        fill="url(#venue-pin)"
      />
      <circle cx="16" cy="12.5" r="2.5" fill="white" fillOpacity="0.85" />
      <defs>
        <linearGradient id="venue-pin" x1="10" y1="6" x2="22" y2="25">
          <stop stopColor="#FF6B7A" />
          <stop offset="1" stopColor="#D63D55" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function PhotographerIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="6" y="11" width="20" height="13" rx="3" fill="url(#cam-body)" />
      <rect x="11" y="8" width="10" height="4" rx="1.5" fill="#4A5568" />
      <circle cx="16" cy="17.5" r="5" fill="#2D3748" />
      <circle cx="16" cy="17.5" r="3.5" fill="url(#cam-lens)" />
      <circle cx="14.5" cy="16" r="1" fill="white" fillOpacity="0.7" />
      <defs>
        <linearGradient id="cam-body" x1="6" y1="11" x2="26" y2="24">
          <stop stopColor="#718096" />
          <stop offset="1" stopColor="#4A5568" />
        </linearGradient>
        <radialGradient id="cam-lens" cx="0.35" cy="0.35" r="0.75">
          <stop stopColor="#A0AEC0" />
          <stop offset="1" stopColor="#2D3748" />
        </radialGradient>
      </defs>
    </EventoIconShell>
  );
}

function VideographerIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="5" y="12" width="14" height="10" rx="2" fill="url(#vid-body)" />
      <path d="M19 14L27 10V26L19 22V14Z" fill="url(#vid-side)" />
      <circle cx="12" cy="17" r="2.5" fill="#2D3748" />
      <defs>
        <linearGradient id="vid-body" x1="5" y1="12" x2="19" y2="22">
          <stop stopColor="#9F7AEA" />
          <stop offset="1" stopColor="#6B46C1" />
        </linearGradient>
        <linearGradient id="vid-side" x1="19" y1="10" x2="27" y2="26">
          <stop stopColor="#B794F4" />
          <stop offset="1" stopColor="#805AD5" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function DjIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <path
        d="M8 18C8 14 11 11 15 11H17C21 11 24 14 24 18V20C24 24 21 27 17 27H15C11 27 8 24 8 20V18Z"
        fill="url(#dj-band)"
      />
      <circle cx="13" cy="19" r="4" fill="#2D3748" />
      <circle cx="19" cy="19" r="4" fill="#2D3748" />
      <circle cx="13" cy="19" r="2" fill="#4A5568" />
      <circle cx="19" cy="19" r="2" fill="#4A5568" />
      <defs>
        <linearGradient id="dj-band" x1="8" y1="11" x2="24" y2="27">
          <stop stopColor="#4FD1C5" />
          <stop offset="1" stopColor="#319795" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function BandIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <ellipse cx="11" cy="22" rx="4" ry="3" fill="url(#note1)" />
      <rect x="14" y="8" width="2" height="14" rx="1" fill="#6B46C1" />
      <ellipse cx="20" cy="18" rx="4" ry="3" fill="url(#note2)" />
      <rect x="23" y="6" width="2" height="12" rx="1" fill="#805AD5" />
      <defs>
        <linearGradient id="note1" x1="7" y1="19" x2="15" y2="25">
          <stop stopColor="#D6BCFA" />
          <stop offset="1" stopColor="#9F7AEA" />
        </linearGradient>
        <linearGradient id="note2" x1="16" y1="15" x2="24" y2="21">
          <stop stopColor="#E9D8FD" />
          <stop offset="1" stopColor="#B794F4" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function DecorationsIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <path
        d="M16 6L17.8 12.2L24 14L17.8 15.8L16 22L14.2 15.8L8 14L14.2 12.2L16 6Z"
        fill="url(#spark-main)"
      />
      <path
        d="M24 8L24.8 10.8L27.5 11.5L24.8 12.2L24 15L23.2 12.2L20.5 11.5L23.2 10.8L24 8Z"
        fill="#F6E05E"
      />
      <defs>
        <linearGradient id="spark-main" x1="8" y1="6" x2="24" y2="22">
          <stop stopColor="#F6E05E" />
          <stop offset="1" stopColor="#ECC94B" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function FloristIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <circle cx="16" cy="13" r="4" fill="url(#fl1)" />
      <circle cx="12" cy="16" r="4" fill="url(#fl2)" />
      <circle cx="20" cy="16" r="4" fill="url(#fl3)" />
      <circle cx="16" cy="16.5" r="3" fill="#F6AD55" />
      <path d="M16 20V27" stroke="#48BB78" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="fl1" x1="12" y1="9" x2="20" y2="17">
          <stop stopColor="#FBB6CE" />
          <stop offset="1" stopColor="#ED64A6" />
        </linearGradient>
        <linearGradient id="fl2" x1="8" y1="12" x2="16" y2="20">
          <stop stopColor="#FED7E2" />
          <stop offset="1" stopColor="#F687B3" />
        </linearGradient>
        <linearGradient id="fl3" x1="16" y1="12" x2="24" y2="20">
          <stop stopColor="#FED7E2" />
          <stop offset="1" stopColor="#F687B3" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function CateringIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <ellipse cx="16" cy="22" rx="10" ry="3" fill="#E2E8F0" />
      <ellipse cx="16" cy="20" rx="9" ry="2.5" fill="url(#plate)" />
      <circle cx="13" cy="18" r="2" fill="#F6AD55" />
      <circle cx="18" cy="17" r="1.8" fill="#48BB78" />
      <defs>
        <linearGradient id="plate" x1="7" y1="17.5" x2="25" y2="22.5">
          <stop stopColor="#F7FAFC" />
          <stop offset="1" stopColor="#CBD5E0" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function CakeIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="8" y="18" width="16" height="7" rx="2" fill="url(#cake-base)" />
      <rect x="10" y="13" width="12" height="6" rx="2" fill="url(#cake-mid)" />
      <rect x="12" y="9" width="8" height="5" rx="2" fill="url(#cake-top)" />
      <circle cx="16" cy="8" r="1.5" fill="#F6E05E" />
      <defs>
        <linearGradient id="cake-base" x1="8" y1="18" x2="24" y2="25">
          <stop stopColor="#FED7E2" />
          <stop offset="1" stopColor="#F687B3" />
        </linearGradient>
        <linearGradient id="cake-mid" x1="10" y1="13" x2="22" y2="19">
          <stop stopColor="#FFF5F7" />
          <stop offset="1" stopColor="#FBB6CE" />
        </linearGradient>
        <linearGradient id="cake-top" x1="12" y1="9" x2="20" y2="14">
          <stop stopColor="#FFF5F7" />
          <stop offset="1" stopColor="#FED7E2" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function CandyBarIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="10" y="10" width="12" height="14" rx="3" fill="url(#candy-wrap)" />
      <circle cx="14" cy="18" r="1.5" fill="#F6E05E" />
      <circle cx="18" cy="20" r="1.5" fill="#FC8181" />
      <defs>
        <linearGradient id="candy-wrap" x1="10" y1="10" x2="22" y2="24">
          <stop stopColor="#FED7E2" />
          <stop offset="1" stopColor="#ED64A6" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function PhotoBoothIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="7" y="10" width="18" height="14" rx="2" fill="url(#booth)" />
      <rect x="10" y="13" width="12" height="8" rx="1" fill="#2D3748" />
      <circle cx="14" cy="17" r="1.2" fill="#F6E05E" />
      <defs>
        <linearGradient id="booth" x1="7" y1="10" x2="25" y2="24">
          <stop stopColor="#FC8181" />
          <stop offset="1" stopColor="#E53E3E" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function TransportationIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <path d="M7 18H25L23 12H9L7 18Z" fill="url(#car-body)" />
      <rect x="6" y="18" width="20" height="5" rx="2" fill="url(#car-base)" />
      <circle cx="11" cy="23" r="2.5" fill="#2D3748" />
      <circle cx="21" cy="23" r="2.5" fill="#2D3748" />
      <rect x="11" y="13" width="4" height="3" rx="0.5" fill="#BEE3F8" />
      <defs>
        <linearGradient id="car-body" x1="7" y1="12" x2="25" y2="18">
          <stop stopColor="#FC8181" />
          <stop offset="1" stopColor="#E53E3E" />
        </linearGradient>
        <linearGradient id="car-base" x1="6" y1="18" x2="26" y2="23">
          <stop stopColor="#F56565" />
          <stop offset="1" stopColor="#C53030" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function AccommodationIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="8" y="10" width="16" height="16" rx="2" fill="url(#hotel)" />
      <rect x="11" y="14" width="3" height="3" rx="0.5" fill="#BEE3F8" />
      <rect x="18" y="14" width="3" height="3" rx="0.5" fill="#BEE3F8" />
      <defs>
        <linearGradient id="hotel" x1="8" y1="10" x2="24" y2="26">
          <stop stopColor="#63B3ED" />
          <stop offset="1" stopColor="#3182CE" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function InvitationsIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="7" y="9" width="18" height="14" rx="2" fill="url(#env-back)" />
      <path d="M7 11L16 18L25 11" stroke="#FED7E2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="11" r="3" fill="#F687B3" />
      <defs>
        <linearGradient id="env-back" x1="7" y1="9" x2="25" y2="23">
          <stop stopColor="#FED7E2" />
          <stop offset="1" stopColor="#F687B3" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function MakeupIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="12" y="8" width="8" height="16" rx="2" fill="url(#lipstick)" />
      <rect x="13" y="6" width="6" height="4" rx="1" fill="#E53E3E" />
      <ellipse cx="16" cy="18" rx="5" ry="4" fill="url(#compact)" />
      <defs>
        <linearGradient id="lipstick" x1="12" y1="8" x2="20" y2="24">
          <stop stopColor="#FC8181" />
          <stop offset="1" stopColor="#E53E3E" />
        </linearGradient>
        <linearGradient id="compact" x1="11" y1="14" x2="21" y2="22">
          <stop stopColor="#FED7E2" />
          <stop offset="1" stopColor="#ED64A6" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function HairIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <circle cx="13" cy="20" r="4" fill="#A0AEC0" stroke="#718096" strokeWidth="1.5" />
      <circle cx="21" cy="20" r="4" fill="#A0AEC0" stroke="#718096" strokeWidth="1.5" />
      <path d="M10 14L16 22" stroke="#9F7AEA" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 14L16 22" stroke="#9F7AEA" strokeWidth="2.5" strokeLinecap="round" />
    </EventoIconShell>
  );
}

function WeddingPlannerIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="9" y="7" width="14" height="18" rx="2" fill="url(#clip)" />
      <rect x="13" y="5" width="6" height="4" rx="1" fill="#A0AEC0" />
      <rect x="12" y="12" width="8" height="1.5" rx="0.75" fill="#EDF2F7" />
      <rect x="12" y="20" width="5" height="1.5" rx="0.75" fill="#F687B3" />
      <defs>
        <linearGradient id="clip" x1="9" y1="7" x2="23" y2="25">
          <stop stopColor="#E9D8FD" />
          <stop offset="1" stopColor="#B794F4" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

function OtherIcon({ size, className }: IconProps) {
  return (
    <EventoIconShell size={size} className={className}>
      <rect x="8" y="10" width="16" height="14" rx="2" fill="url(#box)" />
      <path d="M8 14H24" stroke="#D69E2E" strokeWidth="1.5" />
      <defs>
        <linearGradient id="box" x1="8" y1="10" x2="24" y2="24">
          <stop stopColor="#F6E05E" />
          <stop offset="1" stopColor="#D69E2E" />
        </linearGradient>
      </defs>
    </EventoIconShell>
  );
}

export const EVENTO_CATEGORY_ICON_COMPONENTS = {
  venue: VenueIcon,
  photographer: PhotographerIcon,
  videographer: VideographerIcon,
  dj: DjIcon,
  band: BandIcon,
  decorations: DecorationsIcon,
  florist: FloristIcon,
  catering: CateringIcon,
  cake: CakeIcon,
  candy_bar: CandyBarIcon,
  photo_booth: PhotoBoothIcon,
  transportation: TransportationIcon,
  accommodation: AccommodationIcon,
  invitations: InvitationsIcon,
  makeup: MakeupIcon,
  hair: HairIcon,
  wedding_planner: WeddingPlannerIcon,
  other: OtherIcon,
} as const;

export type EventoCategoryIconProps = {
  slug: string;
  size?: EventoIconSize;
  className?: string;
};

export function EventoCategoryIcon({
  slug,
  size = "md",
  className,
}: EventoCategoryIconProps) {
  const Icon =
    EVENTO_CATEGORY_ICON_COMPONENTS[slug as EventoCategorySlug] ??
    EVENTO_CATEGORY_ICON_COMPONENTS.other;

  return <Icon size={size} className={className} />;
}
