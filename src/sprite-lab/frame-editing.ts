/** A block of pixels on a frame. */
export type PixelRect = { x: number; y: number; width: number; height: number };

/** Every pixel on the straight line between two points, so a fast stroke leaves no gaps. */
export const getLinePixels = (fromX: number, fromY: number, toX: number, toY: number) => {
  const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
  if (!steps) return [{ x: fromX, y: fromY }];
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: Math.round(fromX + ((toX - fromX) * i) / steps),
    y: Math.round(fromY + ((toY - fromY) * i) / steps),
  }));
};

/** The box between two corners of a drag, both included. */
export const getRectBetween = (ax: number, ay: number, bx: number, by: number): PixelRect => ({
  x: Math.min(ax, bx),
  y: Math.min(ay, by),
  width: Math.abs(bx - ax) + 1,
  height: Math.abs(by - ay) + 1,
});

export const isInRect = ({ x, y, width, height }: PixelRect, px: number, py: number) =>
  px >= x && py >= y && px < x + width && py < y + height;

/** Keys pressed in a text box or slider belong to it, not the editor. */
export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;

/** A sampled pixel as a colour input's value. */
export const toHexColor = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

/** How far an arrow key moves pixels with Shift held. */
const BIG_NUDGE = 10;

const NUDGE_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/** How far a key moves pixels, or nothing if it isn't an arrow. */
export const getNudgeOffset = (key: string, big: boolean) => {
  const direction = NUDGE_DIRECTIONS[key];
  if (!direction) return undefined;
  const step = big ? BIG_NUDGE : 1;
  return { x: direction.x * step, y: direction.y * step };
};
