import type { BodyDefinition } from "./bodies";

/** The soft oval a body casts on the ground, in sprite pixels at scale 1. */
export interface ShadowShape {
  readonly width: number;
  readonly height: number;
  /** How far its middle sits below the feet. */
  readonly below: number;
  /** Its darkest, at the middle, 0 to 1. */
  readonly opacity: number;
}

/** Shadows are half again as wide as the body's hit box, and half as tall as wide. */
const WIDTH_PER_HIT_BOX = 1.5;
const OPACITY = 0.15;
const BELOW_FEET = 4;
/** A flier's shadow is smaller and fainter: it's further from the ground. */
const AIR_SIZE = 0.6;
const AIR_OPACITY = 0.7;
/** How far below a flier's feet its shadow falls, so it reads as up off the ground. */
const AIR_BELOW_FEET = 12;

/** The shadow a body casts: sized from its hit box (or `shadowWidth`), smaller in the air. */
export function shadowOf(
  body: Pick<BodyDefinition, "hitBox" | "habitat" | "shadowWidth">,
): ShadowShape {
  const flies = body.habitat === "air";
  const base = body.shadowWidth ?? body.hitBox.width * WIDTH_PER_HIT_BOX;
  const width = Math.max(4, Math.round(base * (flies ? AIR_SIZE : 1)));
  return {
    width,
    height: Math.max(2, Math.round(width / 2)),
    below: flies ? AIR_BELOW_FEET : BELOW_FEET,
    opacity: OPACITY * (flies ? AIR_OPACITY : 1),
  };
}

/**
 * The shadow's pixels, RGBA, `width` by `height`: black, darkest in the middle and fading over its
 * outer rim, so the game and every preview draw the very same oval.
 */
export function shadowPixels({
  width,
  height,
  opacity,
}: ShadowShape): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const rx = width / 2;
  const ry = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      /* 0 at the middle, 1 on the rim, measured at the pixel's centre */
      const d = Math.hypot((x + 0.5 - rx) / rx, (y + 0.5 - ry) / ry);
      const fade = Math.min(1, Math.max(0, (1 - d) / 0.35));
      pixels[(y * width + x) * 4 + 3] = Math.round(255 * opacity * fade);
    }
  }
  return pixels;
}
