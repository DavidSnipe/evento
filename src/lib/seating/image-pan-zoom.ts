export const IMAGE_PAN_ZOOM_WHEEL_FACTOR = 1.08;
export const IMAGE_PAN_ZOOM_MAX_SCALE = 4;
export const IMAGE_PAN_ZOOM_BUTTON_FACTOR = 1.25;

export type ImagePanZoomPoint = { panX: number; panY: number };

export function computeImageFitScale(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): number {
  if (containerW <= 0 || containerH <= 0 || imageW <= 0 || imageH <= 0) return 1;
  return Math.min(containerW / imageW, containerH / imageH);
}

export function clampImagePan(
  panX: number,
  panY: number,
  scale: number,
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): ImagePanZoomPoint {
  if (imageW <= 0 || imageH <= 0 || containerW <= 0 || containerH <= 0) {
    return { panX: 0, panY: 0 };
  }

  const scaledW = imageW * scale;
  const scaledH = imageH * scale;

  const x =
    scaledW <= containerW
      ? (containerW - scaledW) / 2
      : Math.min(0, Math.max(containerW - scaledW, panX));

  const y =
    scaledH <= containerH
      ? (containerH - scaledH) / 2
      : Math.min(0, Math.max(containerH - scaledH, panY));

  return { panX: x, panY: y };
}

export function zoomImagePanAtPoint(
  currentScale: number,
  currentPanX: number,
  currentPanY: number,
  nextScale: number,
  anchorX: number,
  anchorY: number
): ImagePanZoomPoint {
  const ratio = nextScale / currentScale;
  return {
    panX: anchorX - (anchorX - currentPanX) * ratio,
    panY: anchorY - (anchorY - currentPanY) * ratio,
  };
}

export function clampImageScale(
  scale: number,
  fitScale: number,
  maxScale = IMAGE_PAN_ZOOM_MAX_SCALE
): number {
  return Math.min(Math.max(scale, fitScale), maxScale);
}
