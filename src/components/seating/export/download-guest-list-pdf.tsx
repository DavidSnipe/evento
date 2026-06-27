"use client";

import type {
  GuestListPdfOrientation,
  GuestListPdfSortMode,
  SeatingExportSnapshot,
} from "@/lib/seating/export-snapshot-types";

import { preloadPdfFonts } from "./pdf-fonts";
import { ensurePdfJsWorker } from "./pdfjs-worker";

export type GuestListExportFormat = "pdf" | "png";

function buildGuestListFilename(
  snapshot: SeatingExportSnapshot,
  extension: GuestListExportFormat
): string {
  const slug = snapshot.eventTitle
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `lista-invitati-${slug || "eveniment"}-${Date.now()}.${extension}`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function buildGuestListPdfBlob(
  snapshot: SeatingExportSnapshot,
  sortMode: GuestListPdfSortMode,
  orientation: GuestListPdfOrientation = "landscape"
): Promise<Blob> {
  await preloadPdfFonts();

  const [{ pdf }, { GuestListPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/seating/export/guest-list-pdf"),
  ]);

  return pdf(
    <GuestListPdfDocument snapshot={snapshot} sortMode={sortMode} orientation={orientation} />
  ).toBlob();
}

/** Rasterize a PDF blob to PNG via pdf.js (matches react-pdf output). */
export async function pdfBlobToFirstPagePngBlob(pdfBlob: Blob, scale = 1): Promise<Blob> {
  const pdfjs = await ensurePdfJsWorker();
  const data = new Uint8Array(await pdfBlob.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Nu s-a putut inițializa canvas-ul pentru previzualizare.");
  }

  await page.render({ canvasContext: context, viewport }).promise;

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Conversia PDF → PNG a eșuat."));
    }, "image/png");
  });

  return pngBlob;
}

/** Rasterize all PDF pages to a single stacked PNG via pdf.js. */
export async function pdfBlobToPngBlob(pdfBlob: Blob, scale = 2): Promise<Blob> {
  const pdfjs = await ensurePdfJsWorker();
  const data = new Uint8Array(await pdfBlob.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pageCanvases: HTMLCanvasElement[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Nu s-a putut inițializa canvas-ul pentru export PNG.");
    }

    await page.render({ canvasContext: context, viewport }).promise;
    pageCanvases.push(canvas);
  }

  const outputCanvas = document.createElement("canvas");

  if (pageCanvases.length === 1) {
    outputCanvas.width = pageCanvases[0].width;
    outputCanvas.height = pageCanvases[0].height;
    outputCanvas.getContext("2d")!.drawImage(pageCanvases[0], 0, 0);
  } else {
    const width = Math.max(...pageCanvases.map((canvas) => canvas.width));
    const height = pageCanvases.reduce((sum, canvas) => sum + canvas.height, 0);
    outputCanvas.width = width;
    outputCanvas.height = height;
    const context = outputCanvas.getContext("2d")!;

    let offsetY = 0;
    for (const canvas of pageCanvases) {
      context.drawImage(canvas, 0, offsetY);
      offsetY += canvas.height;
    }
  }

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Conversia PDF → PNG a eșuat."));
    }, "image/png");
  });

  return pngBlob;
}

export async function downloadGuestListExport(
  snapshot: SeatingExportSnapshot,
  sortMode: GuestListPdfSortMode,
  orientation: GuestListPdfOrientation,
  format: GuestListExportFormat
): Promise<void> {
  const pdfBlob = await buildGuestListPdfBlob(snapshot, sortMode, orientation);
  const filename = buildGuestListFilename(snapshot, format);

  if (format === "pdf") {
    triggerDownload(pdfBlob, filename);
    return;
  }

  const pngBlob = await pdfBlobToPngBlob(pdfBlob);
  triggerDownload(pngBlob, filename);
}

/** @deprecated Use downloadGuestListExport(..., "pdf") */
export async function downloadGuestListPdf(
  snapshot: SeatingExportSnapshot,
  sortMode: GuestListPdfSortMode,
  orientation: GuestListPdfOrientation = "landscape"
): Promise<void> {
  await downloadGuestListExport(snapshot, sortMode, orientation, "pdf");
}

export function printSortToGuestListMode(printSort: "alpha" | "table"): GuestListPdfSortMode {
  return printSort === "alpha" ? "alphabetical" : "byTable";
}
