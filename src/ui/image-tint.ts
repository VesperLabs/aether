// Utility function to load an image and handle the onload event as a Promise
export const IMAGE_CACHE: Record<string, CanvasImageSource> = {}; // In-memory cache for images

/** A canvas always has a 2d context in the browsers we run in. */
function context2d(canvas: HTMLCanvasElement) {
  return canvas.getContext("2d") as CanvasRenderingContext2D;
}

export function loadCacheImage(src: string): Promise<CanvasImageSource> {
  if (IMAGE_CACHE[src]) {
    return Promise.resolve(IMAGE_CACHE[src]); // Return cached image if available
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      IMAGE_CACHE[src] = img; // Cache the loaded image
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function trimCanvas(c: HTMLCanvasElement) {
  const ctx = context2d(c);
  const pixels = ctx.getImageData(0, 0, c.width, c.height);
  const l = pixels.data.length;
  const bound = {
    top: null as number | null,
    left: null as number | null,
    right: null as number | null,
    bottom: null as number | null,
  };

  for (let i = 0; i < l; i += 4) {
    if (pixels.data[i + 3] !== 0) {
      const x = (i / 4) % c.width;
      const y = ~~(i / 4 / c.width);

      if (bound.top === null) {
        bound.top = y;
      }

      if (bound.left === null) {
        bound.left = x;
      } else if (x < bound.left) {
        bound.left = x;
      }

      if (bound.right === null) {
        bound.right = x;
      } else if (bound.right < x) {
        bound.right = x;
      }

      if (bound.bottom === null) {
        bound.bottom = y;
      } else if (bound.bottom < y) {
        bound.bottom = y;
      }
    }
  }

  // A fully transparent image has no bounds; the nulls then count as 0, as before.
  const { top, left, right, bottom } = bound as { [K in keyof typeof bound]: number };
  const trimHeight = bottom + 1 - top;
  const trimWidth = right + 1 - left;
  const trimmed = ctx.getImageData(left, top, trimWidth, trimHeight);
  const copy = context2d(document.createElement("canvas"));

  copy.canvas.width = trimWidth;
  copy.canvas.height = trimHeight;
  copy.putImageData(trimmed, 0, 0);
  return copy.canvas;
}

export function applyTintToImage(image: HTMLImageElement | ImageBitmap, tint?: string) {
  try {
    const canvas = imageToCanvas(image);
    const tintedCanvas = tintCanvas(canvas, tint);
    return tintedCanvas;
  } catch (error) {
    console.error("Error applying tint to image:", error);
    return null;
  }
}

export const imageToCanvas = (image: HTMLImageElement | ImageBitmap) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = context2d(canvas);
  context.drawImage(image, 0, 0);
  return canvas;
};

export function tintCanvas(c: HTMLCanvasElement, tint = "0xFFFFFF") {
  const ctx = context2d(c);
  const copy = context2d(document.createElement("canvas"));
  const copy2 = context2d(document.createElement("canvas"));
  const copy3 = context2d(document.createElement("canvas"));

  const trimWidth = c?.width;
  const trimHeight = c?.height;

  const trimmed = ctx.getImageData(0, 0, trimWidth, trimHeight);

  copy.canvas.width = trimWidth;
  copy.canvas.height = trimHeight;
  copy2.canvas.width = trimWidth;
  copy2.canvas.height = trimHeight;
  copy3.canvas.width = trimWidth;
  copy3.canvas.height = trimHeight;

  copy.putImageData(trimmed, 0, 0);
  copy2.putImageData(trimmed, 0, 0);
  copy3.putImageData(trimmed, 0, 0);

  copy2.clearRect(0, 0, trimWidth, trimHeight);
  copy2.fillStyle = "#" + tint?.replace("0x", "");
  copy2.fillRect(0, 0, trimWidth, trimHeight);
  copy3.globalCompositeOperation = "source-in";
  copy3.drawImage(copy2.canvas, 0, 0, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
  copy.globalCompositeOperation = "multiply";
  copy.drawImage(copy3.canvas, 0, 0, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
  return copy.canvas;
}

interface AssetToCanvasArgs {
  asset: { src: string; previewRect?: readonly number[] };
  tint?: string;
  setImageData: (dataUrl: string) => void;
  shouldTrim?: boolean;
}

export function assetToCanvas({
  asset,
  tint,
  setImageData,
  shouldTrim = true,
}: AssetToCanvasArgs) {
  loadCacheImage(asset.src)
    .then((img) => {
      const canvas = document.createElement("canvas");
      const ctx = context2d(canvas);
      ctx.imageSmoothingEnabled = false;

      const [x, y, w, h] = asset.previewRect as readonly number[];
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

      const trimmedCanvas = shouldTrim ? trimCanvas(canvas) : canvas;
      const tintedCanvas = tintCanvas(trimmedCanvas, tint);
      setImageData(tintedCanvas.toDataURL("image/png"));
    })
    .catch((error) => {
      console.error("Error loading or processing image:", error);
    });
}
