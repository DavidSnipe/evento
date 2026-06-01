import type {
  InvitationColorPreset,
  InvitationFontPreset,
  InvitationTemplateSlug,
} from "@/types/invitation";

export type InvitationTemplateDefinition = {
  slug: InvitationTemplateSlug;
  name: string;
  description: string;
  /** Preview swatch for template picker */
  previewClass: string;
  /** Decorative wrapper classes applied to public render */
  wrapperClass: string;
  /** Accent ornament style */
  ornament: "divider" | "floral" | "line" | "none" | "diamond";
};

export const INVITATION_TEMPLATES: InvitationTemplateDefinition[] = [
  {
    slug: "elegant",
    name: "Elegant",
    description: "Clasic, cald, perfect pentru nunți tradiționale",
    previewClass: "bg-gradient-to-br from-[#FEF8F9] to-[#FCEAEF]",
    wrapperClass: "invitation-template-elegant",
    ornament: "divider",
  },
  {
    slug: "minimal",
    name: "Minimal",
    description: "Spațiu generos, tipografie curată",
    previewClass: "bg-gradient-to-b from-white to-[#FAFAFA]",
    wrapperClass: "invitation-template-minimal",
    ornament: "line",
  },
  {
    slug: "luxury",
    name: "Luxury",
    description: "Contrast puternic, accente aurii",
    previewClass: "bg-gradient-to-br from-[#1A0E14] to-[#2D1820]",
    wrapperClass: "invitation-template-luxury",
    ornament: "diamond",
  },
  {
    slug: "floral",
    name: "Floral",
    description: "Romantic, decorativ, feminin",
    previewClass: "bg-gradient-to-br from-[#FFF5F7] via-[#FEF8F9] to-[#F0F7F2]",
    wrapperClass: "invitation-template-floral",
    ornament: "floral",
  },
  {
    slug: "modern",
    name: "Modern",
    description: "Geometric, contemporan, bold",
    previewClass: "bg-gradient-to-br from-[#F3F3F5] to-[#E8E8EC]",
    wrapperClass: "invitation-template-modern",
    ornament: "none",
  },
];

export const INVITATION_TEMPLATE_SLUGS = INVITATION_TEMPLATES.map((t) => t.slug);

export function getInvitationTemplate(
  slug: string
): InvitationTemplateDefinition {
  return (
    INVITATION_TEMPLATES.find((t) => t.slug === slug) ?? INVITATION_TEMPLATES[0]
  );
}

export function parseInvitationTemplateSlug(
  value: string | null | undefined
): InvitationTemplateSlug {
  if (value && INVITATION_TEMPLATE_SLUGS.includes(value as InvitationTemplateSlug)) {
    return value as InvitationTemplateSlug;
  }
  return "elegant";
}

export type ColorPresetDefinition = {
  id: InvitationColorPreset;
  name: string;
  primary: string;
  primaryMuted: string;
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
};

export const COLOR_PRESETS: ColorPresetDefinition[] = [
  {
    id: "rose",
    name: "Rose",
    primary: "#B8516B",
    primaryMuted: "#E8748A",
    background: "#FDFBF7",
    text: "#1A0E14",
    textMuted: "#7A6270",
    accent: "#FEF0F3",
    border: "#FCEAEF",
  },
  {
    id: "sage",
    name: "Sage",
    primary: "#5A7A62",
    primaryMuted: "#8BA892",
    background: "#FAFBF8",
    text: "#1A2018",
    textMuted: "#6B7568",
    accent: "#EEF4EF",
    border: "#D8E5DA",
  },
  {
    id: "gold",
    name: "Gold",
    primary: "#9A7342",
    primaryMuted: "#C4A062",
    background: "#FDFAF5",
    text: "#1A140E",
    textMuted: "#7A6E5E",
    accent: "#F9F0E3",
    border: "#E8D9C0",
  },
  {
    id: "slate",
    name: "Slate",
    primary: "#4A5568",
    primaryMuted: "#718096",
    background: "#F8F9FA",
    text: "#1A202C",
    textMuted: "#718096",
    accent: "#EDF2F7",
    border: "#E2E8F0",
  },
  {
    id: "blush",
    name: "Blush",
    primary: "#C4788A",
    primaryMuted: "#E8A0B0",
    background: "#FFF9FA",
    text: "#2A1218",
    textMuted: "#8A6270",
    accent: "#FFF0F3",
    border: "#F5D8E0",
  },
];

export function getColorPreset(id: string): ColorPresetDefinition {
  return COLOR_PRESETS.find((p) => p.id === id) ?? COLOR_PRESETS[0];
}

export type FontPresetDefinition = {
  id: InvitationFontPreset;
  name: string;
  headingClass: string;
  bodyClass: string;
};

export const FONT_PRESETS: FontPresetDefinition[] = [
  {
    id: "serif",
    name: "Serif",
    headingClass: "font-serif",
    bodyClass: "font-sans",
  },
  {
    id: "sans",
    name: "Sans",
    headingClass: "font-sans tracking-tight",
    bodyClass: "font-sans",
  },
  {
    id: "script",
    name: "Script",
    headingClass: "font-serif italic",
    bodyClass: "font-sans",
  },
];

export function getFontPreset(id: string): FontPresetDefinition {
  return FONT_PRESETS.find((f) => f.id === id) ?? FONT_PRESETS[0];
}

export function parseFontPreset(value: string | null | undefined): InvitationFontPreset {
  if (value === "sans" || value === "script" || value === "serif") return value;
  return "serif";
}

export function parseColorPreset(value: string | null | undefined): InvitationColorPreset {
  const ids = COLOR_PRESETS.map((p) => p.id);
  if (value && ids.includes(value as InvitationColorPreset)) {
    return value as InvitationColorPreset;
  }
  return "rose";
}
