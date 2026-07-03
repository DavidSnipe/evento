import type { ComponentType, ReactNode, SVGProps } from "react";

import type { EventType } from "@/types";

type IllustrationProps = SVGProps<SVGSVGElement>;

function SvgFrame({
  children,
  gradientId,
  gradientFrom,
  gradientTo,
  ...props
}: IllustrationProps & {
  gradientId: string;
  gradientFrom: string;
  gradientTo: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="400" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor={gradientFrom} />
          <stop offset="1" stopColor={gradientTo} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#${gradientId})`} />
      {children}
    </svg>
  );
}

export function WeddingIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="wed-bg" gradientFrom="#FEF0F3" gradientTo="#FCEAEF" {...props}>
      <circle cx="168" cy="108" r="28" stroke="#B8516B" strokeWidth="3" />
      <circle cx="232" cy="108" r="28" stroke="#B8516B" strokeWidth="3" />
      <path
        d="M196 108c0-12 16-20 16-32 0 12 16 20 16 32"
        stroke="#D5B886"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="320" cy="62" rx="14" ry="10" fill="#EEDFE3" />
      <ellipse cx="332" cy="72" rx="10" ry="14" fill="#EEDFE3" />
      <ellipse cx="308" cy="72" rx="10" ry="14" fill="#EEDFE3" />
      <circle cx="320" cy="66" r="5" fill="#B8516B" opacity="0.35" />
    </SvgFrame>
  );
}

export function CivilCeremonyIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="civ-bg" gradientFrom="#F5F4F3" gradientTo="#EEEDEB" {...props}>
      <rect x="132" y="52" width="136" height="96" rx="8" fill="#F5F4F3" stroke="#B8516B" strokeWidth="2.5" />
      <path
        d="M152 84h96M152 104h72M152 124h56"
        stroke="#89A293"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="248" cy="72" r="14" fill="#EEDFE3" stroke="#B8516B" strokeWidth="2" />
      <path d="M244 72c2-4 8-4 10 0 2 4-5 8-5 8s-7-4-5-8z" fill="#B8516B" />
    </SvgFrame>
  );
}

export function BaptismIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="bap-bg" gradientFrom="#E8F0EC" gradientTo="#D4E6DA" {...props}>
      <path d="M200 148V88" stroke="#89A293" strokeWidth="3" strokeLinecap="round" />
      <rect x="188" y="148" width="24" height="10" rx="3" fill="#D5B886" />
      <path d="M200 88c-10-8-10-20 0-28 10 8 10 20 0 28z" fill="#D5B886" />
      <path
        d="M200 60c0-8 6-14 6-20"
        stroke="#B8516B"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path d="M248 118c0 18-16 30-32 38" stroke="#B8516B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="248" cy="112" r="8" fill="#B8516B" opacity="0.25" />
    </SvgFrame>
  );
}

export function MajorIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="maj-bg" gradientFrom="#FDF6EC" gradientTo="#F5E8D0" {...props}>
      <text
        x="200"
        y="118"
        textAnchor="middle"
        fontSize="52"
        fontWeight="600"
        fill="#D5B886"
        fontFamily="Georgia, serif"
      >
        18
      </text>
      <circle cx="200" cy="104" r="54" stroke="#B8516B" strokeWidth="2.5" opacity="0.45" />
      <path d="M286 126l18 10-18 10v-8h-22v-4h22v-8z" fill="#89A293" opacity="0.7" />
      <circle cx="286" cy="136" r="10" stroke="#B8516B" strokeWidth="2" fill="#FDF6EC" />
    </SvgFrame>
  );
}

export function BirthdayIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="bday-bg" gradientFrom="#FEF0F3" gradientTo="#FCEAEF" {...props}>
      <rect x="156" y="118" width="88" height="18" rx="4" fill="#EEDFE3" stroke="#B8516B" strokeWidth="2" />
      <rect x="168" y="98" width="64" height="20" rx="4" fill="#F5F4F3" stroke="#B8516B" strokeWidth="2" />
      <rect x="180" y="80" width="40" height="18" rx="4" fill="#F5F4F3" stroke="#B8516B" strokeWidth="2" />
      <path d="M200 80V64" stroke="#D5B886" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M200 64c-4-6 8-10 0-16-8 6 4 10 0 16z" fill="#D5B886" />
    </SvgFrame>
  );
}

export function CorporateIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="corp-bg" gradientFrom="#F5F5F5" gradientTo="#EBEBEB" {...props}>
      <rect x="148" y="56" width="104" height="96" rx="4" fill="#F5F4F3" stroke="#89A293" strokeWidth="2.5" />
      <path
        d="M168 84h64M168 104h64M168 124h40"
        stroke="#B8516B"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <rect x="176" y="68" width="16" height="12" fill="#EEDFE3" stroke="#B8516B" strokeWidth="1.5" />
      <rect x="208" y="68" width="16" height="12" fill="#EEDFE3" stroke="#B8516B" strokeWidth="1.5" />
      <rect x="240" y="68" width="16" height="12" fill="#EEDFE3" stroke="#B8516B" strokeWidth="1.5" />
    </SvgFrame>
  );
}

export function PublicEventIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="pub-bg" gradientFrom="#E8F0EC" gradientTo="#C8DDD4" {...props}>
      <circle cx="168" cy="92" r="14" fill="#F5F4F3" stroke="#89A293" strokeWidth="2" />
      <path d="M152 126c8-18 24-18 32 0" stroke="#89A293" strokeWidth="2.5" fill="none" />
      <circle cx="200" cy="84" r="16" fill="#F5F4F3" stroke="#B8516B" strokeWidth="2" />
      <path d="M180 126c10-22 30-22 40 0" stroke="#B8516B" strokeWidth="2.5" fill="none" />
      <circle cx="240" cy="92" r="14" fill="#F5F4F3" stroke="#89A293" strokeWidth="2" />
      <path d="M224 126c8-18 24-18 32 0" stroke="#89A293" strokeWidth="2.5" fill="none" />
    </SvgFrame>
  );
}

export function DefaultEventIllustration(props: IllustrationProps) {
  return (
    <SvgFrame gradientId="def-bg" gradientFrom="#F5F4F3" gradientTo="#EEEDEB" {...props}>
      <rect x="132" y="56" width="136" height="104" rx="12" fill="#F5F4F3" stroke="#B8516B" strokeWidth="2.5" />
      <path d="M132 88h136" stroke="#EEDFE3" strokeWidth="2" />
      <circle cx="160" cy="72" r="5" fill="#D5B886" />
      <circle cx="180" cy="72" r="5" fill="#89A293" />
      <circle cx="200" cy="72" r="5" fill="#B8516B" />
      <path
        d="M168 118h64M168 134h40"
        stroke="#89A293"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path d="M248 64l8 8-8 8-4-4 4-4 4-4z" fill="#D5B886" stroke="#B8516B" strokeWidth="1.5" />
    </SvgFrame>
  );
}

const ILLUSTRATION_MAP: Record<string, ComponentType<IllustrationProps>> = {
  nunta: WeddingIllustration,
  wedding: WeddingIllustration,
  NUNTA: WeddingIllustration,
  botez: BaptismIllustration,
  baptism: BaptismIllustration,
  BOTEZ: BaptismIllustration,
  zi_de_nastere: BirthdayIllustration,
  birthday: BirthdayIllustration,
  ZI_DE_NASTERE: BirthdayIllustration,
  aniversare: CivilCeremonyIllustration,
  anniversary: CivilCeremonyIllustration,
  cununie_civila: CivilCeremonyIllustration,
  civil_wedding: CivilCeremonyIllustration,
  CUNUNIE_CIVILA: CivilCeremonyIllustration,
  majorat: MajorIllustration,
  major: MajorIllustration,
  MAJORAT: MajorIllustration,
  eveniment_public: PublicEventIllustration,
  private: PublicEventIllustration,
  public_event: PublicEventIllustration,
  EVENIMENT_PUBLIC: PublicEventIllustration,
  corporate: CorporateIllustration,
  CORPORATE: CorporateIllustration,
};

export function getEventIllustration(type: EventType | string): ComponentType<IllustrationProps> {
  return ILLUSTRATION_MAP[type] ?? DefaultEventIllustration;
}
