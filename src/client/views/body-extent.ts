import type Phaser from "phaser";

/** The opaque bounds of a sprite's art: head (`top`), feet (`bottom`) and sides, in frame pixels. */
export interface BodyExtent {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Cached per texture and direction; `undefined` marks art with no opaque pixels, so it isn't measured again. */
const extents = new Map<string, BodyExtent | undefined>();

/** The opaque bounds of `frame`, read in one pass over its pixels, or undefined when it is blank. */
function measureFrame(frame: Phaser.Textures.Frame): BodyExtent | undefined {
  const { cutX, cutY, cutWidth: width, cutHeight: height } = frame;
  if (!width || !height) return;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  const source = frame.source.image as CanvasImageSource;
  context.drawImage(source, cutX, cutY, width, height, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  let top = -1;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      if (top < 0) top = y;
      bottom = y;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (top < 0) return;
  return { top, bottom, left, right };
}

/**
 * Where the art in a sprite's texture starts and ends, facing `direction`: measured on the first
 * frame seen that way and cached per texture and direction, so it changes as the body turns (side
 * views are wider) but stays put while the animation steps.
 */
export function bodyExtentOf(
  sprite: Phaser.GameObjects.Sprite,
  direction: string,
): BodyExtent | undefined {
  const key = sprite.texture?.key;
  if (!key || key === "__MISSING" || key === "human-blank") return;
  const cacheKey = `${key}|${direction}`;
  if (extents.has(cacheKey)) return extents.get(cacheKey);
  const extent = measureFrame(sprite.frame);
  extents.set(cacheKey, extent);
  return extent;
}

/** Cached per texture; `undefined` marks blank art. */
const restingSizes = new Map<string, number | undefined>();

/**
 * How big a body's art is, one number in px of its texture: √(width × height) of its first frame
 * (standing, facing down). The same whichever way it faces now, so what is sized from it doesn't
 * change as it turns; a crab comes out about half a human.
 */
export function restingSizeOf(sprite: Phaser.GameObjects.Sprite): number | undefined {
  const key = sprite.texture?.key;
  if (!key || key === "__MISSING" || key === "human-blank") return;
  if (restingSizes.has(key)) return restingSizes.get(key);
  const texture = sprite.scene.textures.get(key);
  const extent = measureFrame(texture.get(texture.getFrameNames()[0]));
  const size =
    extent && Math.sqrt((extent.right + 1 - extent.left) * (extent.bottom + 1 - extent.top));
  restingSizes.set(key, size);
  return size;
}
