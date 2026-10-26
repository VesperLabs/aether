// Utility function to load an image and handle the onload event as a Promise
export const IMAGE_CACHE = {}; // In-memory cache for images

export function loadCacheImage(src) {
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

export function trimCanvas(c) {
  let ctx = c.getContext("2d"),
    pixels = ctx.getImageData(0, 0, c.width, c.height),
    l = pixels.data.length,
    i,
    bound = {
      top: null,
      left: null,
      right: null,
      bottom: null,
    },
    x,
    y;

  for (i = 0; i < l; i += 4) {
    if (pixels.data[i + 3] !== 0) {
      x = (i / 4) % c.width;
      y = ~~(i / 4 / c.width);

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

  var trimHeight = bound.bottom + 1 - bound.top,
    trimWidth = bound.right + 1 - bound.left,
    trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight),
    copy = document.createElement("canvas").getContext("2d");

  copy.canvas.width = trimWidth;
  copy.canvas.height = trimHeight;
  copy.putImageData(trimmed, 0, 0);
  return copy.canvas;
}

export function applyTintToImage(image, tint) {
  try {
    const canvas = imageToCanvas(image);
    const tintedCanvas = tintCanvas(canvas, tint);
    return tintedCanvas;
  } catch (error) {
    console.error("Error applying tint to image:", error);
    return null;
  }
}

export const imageToCanvas = (image) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return canvas;
};

export function tintCanvas(c, tint = "0xFFFFFF") {
  let ctx = c.getContext("2d"),
    copy = document.createElement("canvas").getContext("2d"),
    copy2 = document.createElement("canvas").getContext("2d"),
    copy3 = document.createElement("canvas").getContext("2d");

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

export function assetToCanvas({ asset, tint, setImageData, shouldTrim = true }) {
  loadCacheImage(asset.src)
    .then((img) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      const [x, y, w, h] = asset.previewRect;
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
