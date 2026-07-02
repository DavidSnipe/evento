function slugifyEventTitle(title: string): string {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "eveniment"
  );
}

export function galleryQrPrintableFilename(eventTitle: string): string {
  return `qr-galerie-${slugifyEventTitle(eventTitle)}.pdf`;
}

/** Capture a hidden printable card and save as A5 PDF. */
export async function downloadGalleryQrPrintable(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const html2canvasModule = await import("html2canvas-pro");
  const html2canvas = html2canvasModule.default;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#FDF8F5",
    useCORS: true,
    logging: false,
  });

  const dataUrl = canvas.toDataURL("image/png");
  const jspdfModule = await import("jspdf");
  const jsPDF = jspdfModule.jsPDF;

  const pageW = 148;
  const pageH = 210;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const imgRatio = canvas.width / canvas.height;
  const pageRatio = pageW / pageH;
  let drawW: number;
  let drawH: number;

  if (imgRatio > pageRatio) {
    drawW = pageW;
    drawH = pageW / imgRatio;
  } else {
    drawH = pageH;
    drawW = pageH * imgRatio;
  }

  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH);
  pdf.save(filename);
}
