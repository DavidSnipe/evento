let pdfJsWorkerReady: Promise<void> | null = null;

export async function ensurePdfJsWorker(): Promise<typeof import("pdfjs-dist")> {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfJsWorkerReady) {
    pdfJsWorkerReady = Promise.resolve().then(() => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    });
  }

  await pdfJsWorkerReady;
  return pdfjs;
}
