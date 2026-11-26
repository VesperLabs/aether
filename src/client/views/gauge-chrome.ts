import type Phaser from "phaser";

/**
 * The frame shared by the hp bar and its cast bar, so they read as one gauge: a dark outline and a
 * cream band around a dark track.
 */
export const GAUGE_COLORS = {
  outline: "#343025",
  band: "#eadebf",
  track: "#333333",
};

/**
 * Gauges draw one texture pixel per screen pixel (as many per world pixel as the camera zoom) and
 * show at 1 / zoom, so their edges stay sharp at every zoom, odd ones too.
 */
export function gaugeResolution(scene: Phaser.Scene) {
  return Math.max(1, Math.round(scene.cameras.main.zoom));
}

/** The outline's thickness in texture pixels: one screen pixel, two from zoom 6. */
export function frameLine(resolution: number) {
  return Math.max(1, Math.floor(resolution / 3));
}

/** The cream band's thickness in texture pixels: half a world pixel, never thinner than the outline. */
export function bandLine(resolution: number) {
  return Math.max(frameLine(resolution), Math.round(resolution / 2));
}

/** Draws the outline and band, and returns how far in the track starts. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  resolution: number,
) {
  const line = frameLine(resolution);
  ctx.clearRect(0, 0, width, height);
  cutRect(ctx, 0, width, height, line, GAUGE_COLORS.outline);
  cutRect(ctx, line, width, height, line, GAUGE_COLORS.band);
  return line + bandLine(resolution);
}

/** A rect inset by `inset` on every side, its corners cut by `corner`, so the frame looks rounded. */
function cutRect(
  ctx: CanvasRenderingContext2D,
  inset: number,
  width: number,
  height: number,
  corner: number,
  color: string,
) {
  const w = width - inset * 2;
  const h = height - inset * 2;
  ctx.fillStyle = color;
  ctx.fillRect(inset + corner, inset, w - corner * 2, h);
  ctx.fillRect(inset, inset + corner, w, h - corner * 2);
}
