import { Font } from "@react-pdf/renderer";

/** Matches app `--font-serif` / Playfair Display from layout.tsx (weights 600, 700). */
export const PDF_PLAYFAIR_FAMILY = "Playfair Display";

const FONT_PATHS = {
  interRegular: "/fonts/inter-regular.ttf",
  interItalic: "/fonts/inter-italic.ttf",
  playfairSemiBold: "/fonts/playfair-display-600.woff",
  playfairBold: "/fonts/playfair-display-700.woff",
  playfairSemiBoldItalic: "/fonts/playfair-display-italic.woff",
} as const;

export const PDF_FONT_PATHS = Object.values(FONT_PATHS);

function resolveFontUrl(path: string): string {
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

let fontsRegistered = false;

export function registerPdfFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;

  Font.register({
    family: PDF_PLAYFAIR_FAMILY,
    fonts: [
      {
        src: resolveFontUrl(FONT_PATHS.playfairSemiBold),
        fontWeight: 600,
        fontStyle: "normal",
      },
      {
        src: resolveFontUrl(FONT_PATHS.playfairBold),
        fontWeight: 700,
        fontStyle: "normal",
      },
      {
        src: resolveFontUrl(FONT_PATHS.playfairSemiBoldItalic),
        fontWeight: 600,
        fontStyle: "italic",
      },
    ],
  });

  Font.register({
    family: "Inter",
    fonts: [
      {
        src: resolveFontUrl(FONT_PATHS.interRegular),
        fontWeight: 300,
        fontStyle: "normal",
      },
      {
        src: resolveFontUrl(FONT_PATHS.interRegular),
        fontWeight: 400,
        fontStyle: "normal",
      },
      {
        src: resolveFontUrl(FONT_PATHS.interItalic),
        fontWeight: 400,
        fontStyle: "italic",
      },
    ],
  });

  registerPdfHyphenation();
}

let pdfHyphenationRegistered = false;

/** Never break words mid-line in PDF text layout. */
export function registerPdfHyphenation(): void {
  if (pdfHyphenationRegistered) return;
  pdfHyphenationRegistered = true;
  Font.registerHyphenationCallback((word) => [word]);
}

registerPdfHyphenation();

export async function preloadPdfFonts(): Promise<void> {
  registerPdfFonts();
  await Promise.all(
    PDF_FONT_PATHS.map(async (path) => {
      const response = await fetch(resolveFontUrl(path));
      if (!response.ok) {
        throw new Error(`PDF font failed to load (${response.status}): ${path}`);
      }
    })
  );
}
