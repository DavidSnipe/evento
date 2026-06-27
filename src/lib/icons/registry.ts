export type IconKey =
  | "venue"
  | "photographer"
  | "videographer"
  | "band"
  | "music"
  | "catering"
  | "transport"
  | "florist"
  | "cake"
  | "candy-bar"
  | "decor"
  | "family"
  | "godparents"
  | "group-transport"
  | "vip"
  | "friends"
  | "kids"
  | "accommodation"
  | "vegetarian"
  | "allergies"
  | "other";

export const ICON_REGISTRY: Record<IconKey, { file: string; labelRo: string }> = {
  venue: { file: "round-pushpin.svg", labelRo: "Locație" },
  photographer: { file: "camera-with-flash.svg", labelRo: "Fotograf" },
  videographer: { file: "movie-camera.svg", labelRo: "Videograf" },
  band: { file: "microphone.svg", labelRo: "Formație/Band" },
  music: { file: "musical-note.svg", labelRo: "Muzică" },
  catering: { file: "fork-and-knife-with-plate.svg", labelRo: "Catering" },
  transport: { file: "automobile.svg", labelRo: "Transport" },
  florist: { file: "cherry-blossom.svg", labelRo: "Florărie" },
  cake: { file: "birthday-cake.svg", labelRo: "Tort" },
  "candy-bar": { file: "candy.svg", labelRo: "Candy bar" },
  decor: { file: "artist-palette.svg", labelRo: "Decor" },
  family: { file: "family.svg", labelRo: "Familie" },
  godparents: { file: "ring.svg", labelRo: "Nași" },
  "group-transport": { file: "bus.svg", labelRo: "Transport grup" },
  vip: { file: "star.svg", labelRo: "VIP" },
  friends: { file: "handshake.svg", labelRo: "Prieteni" },
  kids: { file: "teddy-bear.svg", labelRo: "Copii" },
  accommodation: { file: "bed.svg", labelRo: "Cazare" },
  vegetarian: { file: "green-salad.svg", labelRo: "Vegetarian" },
  allergies: { file: "pill.svg", labelRo: "Alergii" },
  other: { file: "sparkles.svg", labelRo: "Altele" },
};

const UNICODE_FALLBACK: Record<IconKey, string> = {
  venue: "\u{1F4CD}",
  photographer: "\u{1F4F8}",
  videographer: "\u{1F3A5}",
  band: "\u{1F3A4}",
  music: "\u{1F3B5}",
  catering: "\u{1F37D}",
  transport: "\u{1F697}",
  florist: "\u{1F338}",
  cake: "\u{1F382}",
  "candy-bar": "\u{1F36C}",
  decor: "\u{1F3A8}",
  family: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
  godparents: "\u{1F48D}",
  "group-transport": "\u{1F68C}",
  vip: "\u{2B50}",
  friends: "\u{1F91D}",
  kids: "\u{1F9F8}",
  accommodation: "\u{1F6CF}",
  vegetarian: "\u{1F957}",
  allergies: "\u{1F48A}",
  other: "\u{2728}",
};

export function getUnicodeFallback(icon: IconKey): string {
  return UNICODE_FALLBACK[icon];
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const VENDOR_CATEGORY_ICON_MAP: Record<string, IconKey> = {
  // Consolidated system slugs (migration 024)
  venue: "venue",
  "food-drink": "catering",
  "photo-video": "photographer",
  "music-entertainment": "band",
  "decor-flowers": "florist",
  transport: "transport",
  other: "other",

  // Romanian label aliases (normalizeKey output)
  locatie: "venue",
  location: "venue",
  sala: "venue",
  "mancare-bautura": "catering",
  "foto-video": "photographer",
  "muzica-distractie": "band",
  "decor-flori": "florist",
  altele: "other",

  // Legacy system slugs
  photographer: "photographer",
  fotograf: "photographer",
  foto: "photographer",
  photo: "photographer",
  "photo-booth": "photographer",
  photobooth: "photographer",

  videographer: "videographer",
  videograf: "videographer",
  video: "videographer",

  band: "band",
  formatie: "band",
  "formatie-live": "band",
  dj: "band",

  music: "music",
  muzica: "music",
  muzic: "music",

  catering: "catering",
  "candy-bar": "candy-bar",
  candybar: "candy-bar",
  candy: "candy-bar",

  cake: "cake",
  tort: "cake",

  transportation: "transport",
  transporturi: "transport",

  florist: "florist",
  florarie: "florist",
  flori: "florist",
  flowers: "florist",

  decor: "decor",
  decorations: "decor",
  decoratiuni: "decor",
  decoration: "decor",

  accommodation: "accommodation",
  cazare: "accommodation",
  hotel: "accommodation",

  invitations: "other",
  invitatii: "other",
  makeup: "other",
  machiaj: "other",
  hair: "other",
  coafura: "other",
  "wedding-planner": "other",
  weddingplanner: "other",
};

export function getIconForVendorCategory(categorySlugOrName: string): IconKey {
  const normalized = normalizeKey(categorySlugOrName);
  return VENDOR_CATEGORY_ICON_MAP[normalized] ?? "other";
}

const GUEST_TAG_ICON_MAP: Record<string, IconKey> = {
  vip: "vip",

  godparents: "godparents",
  nasi: "godparents",
  nas: "godparents",
  godparent: "godparents",

  family: "family",
  familie: "family",

  friends: "friends",
  prieteni: "friends",
  friend: "friends",

  kids: "kids",
  copii: "kids",
  kid: "kids",
  child: "kids",
  children: "kids",

  transport: "transport",
  "transport-grup": "group-transport",
  "group-transport": "group-transport",
  transportgrup: "group-transport",

  accommodation: "accommodation",
  cazare: "accommodation",
  hotel: "accommodation",

  vegetarian: "vegetarian",
  vegetariani: "vegetarian",

  allergies: "allergies",
  alergii: "allergies",
  alergie: "allergies",
  allergy: "allergies",
};

export function getIconForGuestTag(tagValue: string): IconKey {
  const normalized = normalizeKey(tagValue);

  if (normalized.includes("transport") && normalized.includes("grup")) {
    return "group-transport";
  }

  const mapped = GUEST_TAG_ICON_MAP[normalized];
  if (mapped) return mapped;

  return "other";
}

export function getIconAssetPath(icon: IconKey): string {
  return `/icons/emoji/${ICON_REGISTRY[icon].file}`;
}