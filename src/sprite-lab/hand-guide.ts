import { DIRECTIONS } from "@/ui";
import type { Frame } from "./lab-state";

/** A marked hand, in cell pixels. */
export type HandLabel = { x: number; y: number; label: string; color: string };

/** Clumps smaller than this are stray pixels, not hands. */
const MIN_HAND_PIXELS = 4;
const FIRST_COLOR = "#00ff00";
const SECOND_COLOR = "#00ffff";
const RING_RADIUS = 5;
const FONT_SIZE = 30;
const LABEL_GAP = 8;

/** The hand a frame attacks with, if any: the sheet's last two columns are right, then left. */
export const getAttackingHand = ({ column }: Frame) => ["right", "left"][column - 4];

/** The middle of each separate clump of visible pixels: on a gloves sheet, the hands. */
const findClumps = (data: Uint8ClampedArray, cell: number) => {
  const seen = new Uint8Array(cell * cell);
  const isArt = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < cell && y < cell && data[(y * cell + x) * 4 + 3] > 0;
  const clumps: { x: number; y: number }[] = [];
  for (let start = 0; start < cell * cell; start += 1) {
    if (seen[start] || !isArt(start % cell, Math.floor(start / cell))) continue;
    seen[start] = 1;
    const clump = [start];
    for (let i = 0; i < clump.length; i += 1) {
      const px = clump[i] % cell;
      const py = (clump[i] - px) / cell;
      for (const [nx, ny] of [
        [px - 1, py],
        [px + 1, py],
        [px, py - 1],
        [px, py + 1],
      ]) {
        if (!isArt(nx, ny) || seen[ny * cell + nx]) continue;
        seen[ny * cell + nx] = 1;
        clump.push(ny * cell + nx);
      }
    }
    if (clump.length < MIN_HAND_PIXELS) continue;
    const average = (get: (pixel: number) => number) =>
      Math.round(clump.reduce((sum, pixel) => sum + get(pixel), 0) / clump.length);
    clumps.push({
      x: average((pixel) => pixel % cell),
      y: average((pixel) => Math.floor(pixel / cell)),
    });
  }
  return clumps;
};

/**
 * Names the hands on one frame from a gloves sheet's pixels. Front and back views say left and
 * right. Side views say near and far: a lone hand is the attacking one, or when walking the near
 * one, as the far hand is behind the body. With two, the one furthest forward is attacking.
 */
export const findHands = (data: Uint8ClampedArray, cell: number, frame: Frame): HandLabel[] => {
  const direction = DIRECTIONS[frame.row];
  const clumps = findClumps(data, cell);
  const attacking = getAttackingHand(frame);
  if (direction === "up" || direction === "down") {
    /* Facing the viewer, the character's right hand is on the image's left. */
    const isOnLeft = ({ x }: { x: number }) => x < cell / 2;
    const leftOnLeft = direction === "up";
    return clumps.map((hand) => {
      const isLeft = isOnLeft(hand) === leftOnLeft;
      return {
        ...hand,
        label: isLeft ? "LEFT hand" : "RIGHT hand",
        color: isLeft ? FIRST_COLOR : SECOND_COLOR,
      };
    });
  }
  const forward = direction === "right" ? 1 : -1;
  const sorted = [...clumps].sort((a, b) => (b.x - a.x) * forward);
  const leadIsNear = !attacking || attacking === direction;
  return sorted.slice(0, 2).map((hand, i) => {
    const isNear = (i === 0) === leadIsNear;
    return {
      ...hand,
      label: isNear ? "NEAR hand" : "FAR hand",
      color: isNear ? FIRST_COLOR : SECOND_COLOR,
    };
  });
};

/** Rings each hand and names it, on a canvas enlarged by `scale`. */
export const paintHandLabels = (
  ctx: CanvasRenderingContext2D,
  hands: HandLabel[],
  scale: number,
) => {
  ctx.font = `bold ${FONT_SIZE}px monospace`;
  ctx.textBaseline = "middle";
  hands.forEach(({ x, y, label, color }) => {
    const [cx, cy] = [(x + 0.5) * scale, (y + 0.5) * scale];
    const radius = RING_RADIUS * scale;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    const width = ctx.measureText(label).width + LABEL_GAP * 2;
    const left = Math.min(Math.max(cx - width / 2, 0), ctx.canvas.width - width);
    const top = Math.max(cy - radius - FONT_SIZE * 2, 0);
    ctx.fillStyle = "#000000";
    ctx.fillRect(left, top, width, FONT_SIZE * 1.5);
    ctx.fillStyle = color;
    ctx.fillText(label, left + LABEL_GAP, top + FONT_SIZE * 0.75);
  });
};
