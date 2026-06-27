import {
  CANVAS_HEIGHT_PX,
  CANVAS_WIDTH_PX,
} from "@/lib/seating/spatial";

export type FloorPlanExportFormat = "png" | "pdf";

export type FloorPlanCaptureResult = {
  dataUrl: string;
  width: number;
  height: number;
};

export type CaptureFloorPlanOptions = {
  format: FloorPlanExportFormat;
  filename?: string;
  download?: boolean;
  /** 1 for preview; 2 for export files */
  scale?: number;
};

const CANVAS_BG_FALLBACK = "#F9F4F1";

function defaultFloorPlanFilename(format: FloorPlanExportFormat): string {
  return `aranjare-mese-${Date.now()}.${format}`;
}

function getCanvasBackground(): string {
  const raw =
    getComputedStyle(document.documentElement).getPropertyValue("--ev-bg-canvas").trim() ||
    CANVAS_BG_FALLBACK;
  return raw.startsWith("#") ? raw : CANVAS_BG_FALLBACK;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForCaptureReady(): Promise<void> {
  await waitForPaint();
  try {
    await document.fonts.ready;
  } catch {
    // Non-fatal if FontFaceSet is unavailable.
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
}

/** Remove overlays / HUD nodes that should not appear in exports. */
function stripExportNoise(root: HTMLElement): void {
  const selectors = [
    ".seating-canvas-overlay",
    ".planner-assist-overlay",
    "[data-floor-plan-export-ignore]",
  ];
  for (const selector of selectors) {
    root.querySelectorAll(selector).forEach((node) => node.remove());
  }
}

/** Avoid url(#id) collisions when the live canvas and clone coexist in the document. */
function uniquifySvgGradientIds(root: HTMLElement, suffix: string): void {
  const idMap = new Map<string, string>();

  root.querySelectorAll("[id]").forEach((node) => {
    const oldId = node.id;
    const newId = `${oldId}${suffix}`;
    idMap.set(oldId, newId);
    node.id = newId;
  });

  const fixReference = (value: string | null): string | null => {
    if (!value || !value.includes("url(#")) return value;
    return value.replace(/url\(#([^)]+)\)/g, (_match, id: string) => {
      const mapped = idMap.get(id);
      return mapped ? `url(#${mapped})` : `url(#${id})`;
    });
  };

  root.querySelectorAll("*").forEach((node) => {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;

    for (const attr of ["fill", "stroke", "filter", "clip-path", "mask", "href", "xlink:href"]) {
      const current = node.getAttribute(attr);
      const next = fixReference(current);
      if (next !== current && next !== null) {
        node.setAttribute(attr, next);
      }
    }

    if (node instanceof SVGElement && node.style) {
      const style = node.getAttribute("style");
      const nextStyle = fixReference(style);
      if (nextStyle !== style && nextStyle !== null) {
        node.setAttribute("style", nextStyle);
      }
    }
  });
}

function prepareFloorPlanClone(clone: HTMLElement, widthPx: number, heightPx: number): void {
  clone.style.transform = "translate(0px, 0px) scale(1)";
  clone.style.transition = "none";
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.width = `${widthPx}px`;
  clone.style.height = `${heightPx}px`;
  clone.style.visibility = "visible";
  clone.style.opacity = "1";
  clone.style.overflow = "visible";
  clone.style.pointerEvents = "none";

  stripExportNoise(clone);
  uniquifySvgGradientIds(clone, "_floor_export");

  clone.querySelectorAll<HTMLElement>(".draggable-table-wrapper").forEach((node) => {
    node.style.visibility = "visible";
    node.style.opacity = "1";
    node.style.pointerEvents = "none";
  });
}

function mountExportClone(canvasElement: HTMLDivElement): {
  container: HTMLDivElement;
  clone: HTMLDivElement;
} {
  const widthPx = canvasElement.offsetWidth || CANVAS_WIDTH_PX;
  const heightPx = canvasElement.offsetHeight || CANVAS_HEIGHT_PX;
  const clone = canvasElement.cloneNode(true) as HTMLDivElement;
  prepareFloorPlanClone(clone, widthPx, heightPx);

  const container = document.createElement("div");
  container.setAttribute("data-floor-plan-export-root", "true");
  container.style.position = "fixed";
  container.style.left = `-${widthPx + 200}px`;
  container.style.top = "0";
  container.style.width = `${widthPx}px`;
  container.style.height = `${heightPx}px`;
  container.style.overflow = "hidden";
  container.style.visibility = "visible";
  container.style.opacity = "1";
  container.style.pointerEvents = "none";
  container.style.zIndex = "2147483646";
  container.appendChild(clone);
  document.body.appendChild(container);
  void container.offsetHeight;

  return { container, clone };
}

function upscaleCanvas(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  if (factor <= 1) return source;

  const dest = document.createElement("canvas");
  dest.width = Math.round(source.width * factor);
  dest.height = Math.round(source.height * factor);

  const context = dest.getContext("2d");
  if (!context) return source;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, dest.width, dest.height);
  return dest;
}

function pixelDiffersFromBackground(
  r: number,
  g: number,
  b: number,
  bg: { r: number; g: number; b: number }
): boolean {
  const threshold = 10;
  return (
    Math.abs(r - bg.r) > threshold ||
    Math.abs(g - bg.g) > threshold ||
    Math.abs(b - bg.b) > threshold
  );
}

function canvasHasVisibleContent(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;

  const bg = parseHexColor(getCanvasBackground()) ?? { r: 249, g: 244, b: 241 };
  const step = Math.max(24, Math.floor(Math.min(canvas.width, canvas.height) / 40));

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const { data } = context.getImageData(x, y, 1, 1);
      if (pixelDiffersFromBackground(data[0], data[1], data[2], bg)) {
        return true;
      }
    }
  }

  return false;
}

function validateCapture(canvas: HTMLCanvasElement, expectedTables: number): void {
  if (canvas.width < 16 || canvas.height < 16) {
    throw new Error(
      `Floor plan capture produced an empty canvas (${canvas.width}x${canvas.height}).`
    );
  }

  if (expectedTables > 0 && !canvasHasVisibleContent(canvas)) {
    throw new Error(
      "Floor plan capture looks blank (uniform pixels). Canvas may be hidden or not laid out yet."
    );
  }
}

/**
 * Rasterize a prepared clone with html2canvas-pro.
 * Always captures at scale 1 for reliability, then upscales if needed.
 */
async function rasterizeFloorPlan(
  clone: HTMLDivElement,
  scale: number
): Promise<HTMLCanvasElement> {
  const html2canvasModule = await import("html2canvas-pro");
  const html2canvas = html2canvasModule.default;
  const widthPx = clone.offsetWidth || CANVAS_WIDTH_PX;
  const heightPx = clone.offsetHeight || CANVAS_HEIGHT_PX;

  const raw = await html2canvas(clone, {
    backgroundColor: getCanvasBackground(),
    scale: 1,
    width: widthPx,
    height: heightPx,
    useCORS: true,
    allowTaint: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (_doc, clonedElement) => {
      if (clonedElement instanceof HTMLElement) {
        prepareFloorPlanClone(clonedElement, widthPx, heightPx);
      }
    },
  });

  return upscaleCanvas(raw, scale);
}

async function loadImageSize(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => reject(new Error("Nu s-a putut citi imaginea planului."));
    image.src = src;
  });
}

export async function downloadFloorPlanFromDataUrl(
  dataUrl: string,
  format: FloorPlanExportFormat,
  filename?: string
): Promise<void> {
  const outputName = filename ?? defaultFloorPlanFilename(format);

  if (format === "png") {
    const link = document.createElement("a");
    link.download = outputName;
    link.href = dataUrl;
    link.click();
    return;
  }

  const { width, height } = await loadImageSize(dataUrl);
  const jspdfModule = await import("jspdf");
  const jsPDF = jspdfModule.jsPDF;
  const pdf = new jsPDF({
    orientation: width > height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
  pdf.save(outputName);
}

export async function captureFloorPlanFromCanvas(
  canvasElement: HTMLDivElement,
  options: CaptureFloorPlanOptions
): Promise<FloorPlanCaptureResult> {
  const scale = options.scale ?? 2;

  if (canvasElement.offsetWidth === 0 || canvasElement.offsetHeight === 0) {
    throw new Error(
      "Canvasul planului nu este încă randat. Comutați la vizualizarea Plan și încercați din nou."
    );
  }

  const tableCount = canvasElement.querySelectorAll(".draggable-table-wrapper").length;
  const { container, clone } = mountExportClone(canvasElement);

  try {
    await waitForCaptureReady();

    let canvas: HTMLCanvasElement | null = null;
    let lastError: unknown = null;
    const scalesToTry = scale > 1 ? [scale, 1] : [scale];

    for (const captureScale of scalesToTry) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          await waitForCaptureReady();
        }

        try {
          canvas = await rasterizeFloorPlan(clone, captureScale);
          validateCapture(canvas, tableCount);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          canvas = null;
        }
      }

      if (canvas) break;
    }

    if (!canvas) {
      throw lastError instanceof Error
        ? lastError
        : new Error("Floor plan capture failed.");
    }

    const dataUrl = canvas.toDataURL("image/png");

    if (options.download !== false) {
      await downloadFloorPlanFromDataUrl(
        dataUrl,
        options.format,
        options.filename ?? defaultFloorPlanFilename(options.format)
      );
    }

    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    console.error("[floor-plan-export] Capture failed:", error);
    throw error;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export async function captureFloorPlanPreview(
  canvasElement: HTMLDivElement
): Promise<FloorPlanCaptureResult> {
  return captureFloorPlanFromCanvas(canvasElement, {
    format: "png",
    download: false,
    scale: 1,
  });
}

export async function downloadFloorPlanExport(
  canvasElement: HTMLDivElement,
  format: FloorPlanExportFormat
): Promise<void> {
  await captureFloorPlanFromCanvas(canvasElement, {
    format,
    download: true,
    scale: 2,
  });
}
