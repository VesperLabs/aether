import type { PixelRect } from "./frame-editing";

/** Photoshop's sliders: brightness runs -150 to 150, the others -100 to 100. */
export type ColorAdjustment = { brightness: number; contrast: number; saturation: number };

export const NO_ADJUSTMENT: ColorAdjustment = { brightness: 0, contrast: 0, saturation: 0 };

const MID_GRAY = 127.5;

/** Legacy contrast's slope around mid-gray: flat gray at -100, a hard threshold towards 100. */
const getContrastSlope = (contrast: number) =>
  contrast >= 0 ? 1 / Math.max(1 - contrast / 100, 1 / 255) : 1 + contrast / 100;

/** Hue/Saturation's master slider: pushes channels away from, or towards, the pixel's lightness. */
const saturate = (rgb: number[], saturation: number) => {
  const amount = saturation / 100;
  const high = Math.max(...rgb);
  const low = Math.min(...rgb);
  if (high === low || !amount) return rgb;
  const lightness = (high + low) / 2;
  const sum = high + low;
  const current = (high - low) / (sum < 255 ? sum : 510 - sum);
  const push = amount > 0 ? 1 / (amount + current >= 1 ? current : 1 - amount) - 1 : amount;
  return rgb.map((value) => value + (value - lightness) * push);
};

/**
 * Photoshop's legacy Brightness/Contrast, a straight shift then a slope around mid-gray, followed by
 * its Hue/Saturation. Works in place on the rect, or everything without one; clear pixels stay.
 */
export const adjustColors = (
  image: { data: Uint8ClampedArray; width: number; height: number },
  { brightness, contrast, saturation }: ColorAdjustment,
  rect: PixelRect = { x: 0, y: 0, width: image.width, height: image.height },
) => {
  const { data, width, height } = image;
  const slope = getContrastSlope(contrast);
  const bottom = Math.min(rect.y + rect.height, height);
  const right = Math.min(rect.x + rect.width, width);
  for (let y = Math.max(rect.y, 0); y < bottom; y += 1) {
    for (let x = Math.max(rect.x, 0); x < right; x += 1) {
      const p = (y * width + x) * 4;
      if (data[p + 3] === 0) continue;
      const rgb = [data[p], data[p + 1], data[p + 2]].map(
        (value) => (Math.min(255, Math.max(0, value + brightness)) - MID_GRAY) * slope + MID_GRAY,
      );
      data.set(
        saturate(
          rgb.map((value) => Math.min(255, Math.max(0, value))),
          saturation,
        ),
        p,
      );
    }
  }
};
