import type Phaser from "phaser";

/** The opaque bounds of a sprite's art: head (`top`), feet (`bottom`) and sides, in frame pixels. */
export interface BodyExtent {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const extents = new Map<string, BodyExtent>();

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
  const cached = extents.get(cacheKey);
  if (cached) return cached;
  const { textures } = sprite.scene;
  const frame = sprite.frame;
  let top = -1;
  let bottom = -1;
  let left = frame.width;
  let right = -1;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if ((textures.getPixelAlpha(x, y, key, frame.name) ?? 0) === 0) continue;
      if (top < 0) top = y;
      bottom = y;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (top < 0) return;
  const extent = { top, bottom, left, right };
  extents.set(cacheKey, extent);
  return extent;
}

const restingSizes = new Map<string, number>();

/**
 * How big a body's art is, one number in px of its texture: √(width × height) of its first frame
 * (standing, facing down). The same whichever way it faces now, so what is sized from it doesn't
 * change as it turns; a crab comes out about half a human.
 */
export function restingSizeOf(sprite: Phaser.GameObjects.Sprite): number | undefined {
  const key = sprite.texture?.key;
  if (!key || key === "__MISSING" || key === "human-blank") return;
  const cached = restingSizes.get(key);
  if (cached) return cached;
  const { textures } = sprite.scene;
  const texture = textures.get(key);
  const frame = texture.get(texture.getFrameNames()[0]);
  let top = -1;
  let bottom = -1;
  let left = frame.width;
  let right = -1;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if ((textures.getPixelAlpha(x, y, key, frame.name) ?? 0) === 0) continue;
      if (top < 0) top = y;
      bottom = y;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (top < 0) return;
  const size = Math.sqrt((right + 1 - left) * (bottom + 1 - top));
  restingSizes.set(key, size);
  return size;
}
