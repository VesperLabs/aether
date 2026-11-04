import { loadCacheImage, tintCanvas } from "@/ui/kit";

const drawImageOnNewCanvas = (image: HTMLImageElement, tint: string | undefined) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return tint ? tintCanvas(canvas, tint) : canvas;
};

/**
 * Tinted sheets by source and tint. Tinting reads and rewrites every pixel, and most characters
 * share skins, hair and gear colours, so each combination is only tinted once. A sheet that fails
 * to load resolves to null.
 */
const SHEET_CACHE = new Map<string, Promise<HTMLCanvasElement | null>>();
export const loadSheet = ({ src, tint }: { src: string; tint?: string }) => {
  const key = `${src}|${tint ?? ""}`;
  let sheet = SHEET_CACHE.get(key);
  if (!sheet) {
    sheet = loadCacheImage(src).then(
      (image) => drawImageOnNewCanvas(image, tint),
      () => null,
    );
    SHEET_CACHE.set(key, sheet);
  }
  return sheet;
};
