import { IMAGE_PAN_ZOOM_MAX_SCALE } from "@/lib/seating/image-pan-zoom";

import { ensurePdfJsWorker } from "./pdfjs-worker";

/** Minimum raster width so CSS zoom up to 400% stays sharp. */
const PREVIEW_MIN_RASTER_WIDTH_PX = 3600;

export type GuestListPreviewRasterResult = {
  imageUrl: string;
  logicalWidth: number;
  logicalHeight: number;
};

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Nu s-a putut converti previzualizarea în PNG."));
    }, "image/png");
  });
}

/**
 * Rasterize page 1 of a PDF blob to a high-res PNG object URL.
 * Uses a fresh offscreen canvas each call — no shared DOM canvas, no render cancellation.
 * Returns null when requestId is stale (caller should ignore).
 */
export async function rasterizeGuestListPreview(
  pdfBlob: Blob,
  isStale: () => boolean
): Promise<GuestListPreviewRasterResult | null> {
  if (isStale()) return null;

  const pdfjs = await ensurePdfJsWorker();
  const data = new Uint8Array(await pdfBlob.arrayBuffer());
  if (isStale()) return null;

  const doc = await pdfjs.getDocument({ data }).promise;
  if (isStale()) return null;

  const page = await doc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const logicalWidth = baseViewport.width;
  const logicalHeight = baseViewport.height;

  const rasterScale = Math.max(
    IMAGE_PAN_ZOOM_MAX_SCALE,
    PREVIEW_MIN_RASTER_WIDTH_PX / logicalWidth
  );
  const renderViewport = page.getViewport({ scale: rasterScale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(renderViewport.width);
  canvas.height = Math.floor(renderViewport.height);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Nu s-a putut inițializa canvas-ul pentru previzualizare.");
  }

  await page.render({ canvasContext: context, viewport: renderViewport }).promise;
  if (isStale()) return null;

  const pngBlob = await canvasToPngBlob(canvas);
  if (isStale()) return null;

  return {
    imageUrl: URL.createObjectURL(pngBlob),
    logicalWidth,
    logicalHeight,
  };
}
