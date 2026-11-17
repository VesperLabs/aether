import type Phaser from "phaser";

/** Name of the frame cut to an image's drawn pixels, added to each texture once. */
const TRIMMED_FRAME = "trimmed";

/**
 * A frame of the texture cut to its drawn (non-transparent) pixels, made once per texture, so
 * small icons sit close whatever padding the art has. Falls back to the whole image when the
 * pixels can't be read.
 */
export function getTrimmedFrame(scene: Phaser.Scene, key: string) {
  const texture = scene.textures.get(key);
  if (texture.has(TRIMMED_FRAME)) return TRIMMED_FRAME;
  const source = texture.getSourceImage() as CanvasImageSource & { width: number; height: number };
  const { width, height } = source;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context || !width || !height) return undefined;
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  let [minX, minY, maxX, maxY] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return undefined;
  texture.add(TRIMMED_FRAME, 0, minX, minY, maxX - minX + 1, maxY - minY + 1);
  return TRIMMED_FRAME;
}
