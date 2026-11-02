import type { OutlineFrame } from "./element-effects";

/** The outline's four 1px-shifted copies: up, right, down, left, as `ElementSim.outline` gives. */
export const OUTLINE_OFFSETS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** A 0xRRGGBB color as CSS hex. */
export const cssColor = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/**
 * The outline as a CSS `filter`, for art drawn as a plain image (loot flying to the bag): four
 * 1-art-pixel drop shadows tinted like `ElementSim.outline`, the same as the canvas and game draw.
 */
export function outlineFilter(frames: OutlineFrame[], pixelSize = 1) {
  if (frames.length === 0) return "none";
  return frames
    .map(({ color, alpha }, side) => {
      const [x, y] = OUTLINE_OFFSETS[side];
      const hexAlpha = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, "0");
      return `drop-shadow(${x * pixelSize}px ${y * pixelSize}px 0 ${cssColor(color)}${hexAlpha})`;
    })
    .join(" ");
}
