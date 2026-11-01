/** Opaque pixels with a transparent neighbour (or the image's border): where effects come off. */
export function findEdgePixels(data: Uint8ClampedArray, width: number, height: number) {
  const isOpaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] > 0;
  const edges: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y)) continue;
      if (isOpaque(x - 1, y) && isOpaque(x + 1, y) && isOpaque(x, y - 1) && isOpaque(x, y + 1))
        continue;
      edges.push({ x, y });
    }
  }
  return edges;
}

/** How far along the weapon, from grip to tip, the blade starts. */
const BLADE_START = 0.45;

/**
 * The edge pixels on the blade, leaving out the handle and guard near `grip` (weapon art holds
 * the handle at its centre), so effects come off the business end.
 */
export function bladePixels(edges: { x: number; y: number }[], grip: { x: number; y: number }) {
  const distance = ({ x, y }: { x: number; y: number }) => Math.hypot(x - grip.x, y - grip.y);
  const reach = Math.max(0, ...edges.map(distance));
  const blade = edges.filter((pixel) => distance(pixel) >= reach * BLADE_START);
  return blade.length > 0 ? blade : edges;
}

type Point = { x: number; y: number };

/**
 * Whether `pixel` is on the side of the weapon facing down: below the line from `grip` to `tip`,
 * in screen space. A blade held straight up or down has no underside, so any pixel counts.
 */
export function isUnderside(pixel: Point, grip: Point, tip: Point) {
  const ax = tip.x - grip.x;
  const ay = tip.y - grip.y;
  if (Math.abs(ax) < 1) return true;
  const side = ax * (pixel.y - grip.y) - ay * (pixel.x - grip.x);
  return Math.sign(side) === Math.sign(ax);
}

/** The pixel farthest from `grip`: the weapon's tip. */
export function farthestFrom(pixels: Point[], grip: Point) {
  let tip = grip;
  let best = -1;
  for (const pixel of pixels) {
    const d = (pixel.x - grip.x) ** 2 + (pixel.y - grip.y) ** 2;
    if (d > best) {
      best = d;
      tip = pixel;
    }
  }
  return tip;
}
