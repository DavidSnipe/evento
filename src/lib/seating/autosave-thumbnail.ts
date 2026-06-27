const THUMBNAIL_MAX_WIDTH = 400;

export async function captureAutosaveThumbnail(
  capture: () => Promise<string>,
  timeoutMs = 1000
): Promise<string | undefined> {
  try {
    const dataUrl = await Promise.race([
      capture(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("thumbnail timeout")), timeoutMs)
      ),
    ]);
    return await downscaleThumbnail(dataUrl, THUMBNAIL_MAX_WIDTH);
  } catch {
    return undefined;
  }
}

async function downscaleThumbnail(
  dataUrl: string,
  maxWidth: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.width <= maxWidth) {
        resolve(dataUrl);
        return;
      }
      const scale = maxWidth / image.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png", 0.85));
    };
    image.onerror = () => reject(new Error("thumbnail decode failed"));
    image.src = dataUrl;
  });
}
