import type { BodyShape } from "@/content";
import type { Hand } from "./weapon-pose";

/**
 * What can be grabbed on the body editor's frame: the hit box's top and sides, the feet's rim, the
 * head line, or a hand point.
 */
export type Handle = "top" | "side" | "feet" | "head" | Hand;

/** A point measured from the feet, in sprite pixels. */
export type FeetPoint = { x: number; y: number };

export const isHand = (handle: Handle): handle is Hand => handle === "left" || handle === "right";

/** The shape with `handle` dragged to `point`: only what that handle controls changes. */
export const dragShape = (
  handle: Exclude<Handle, Hand>,
  shape: BodyShape,
  { x, y }: FeetPoint,
): Partial<BodyShape> => {
  if (handle === "head") return { headY: Math.min(0, Math.round(y)) };
  if (handle === "feet") return { feetRadius: Math.max(1, Math.round(Math.hypot(x, y))) };
  if (handle === "side") {
    return { hitBox: { ...shape.hitBox, width: Math.max(1, Math.round(Math.abs(x) * 2)) } };
  }
  /* The box stands on the bottom of the feet, so its top is that far up */
  return {
    hitBox: { ...shape.hitBox, height: Math.max(1, Math.round(shape.feetRadius - y)) },
  };
};

/** The shape with `handle` nudged by an arrow key: up raises the top and head, right widens. */
export const nudgeShape = (
  handle: Exclude<Handle, Hand>,
  shape: BodyShape,
  { x, y }: FeetPoint,
): Partial<BodyShape> => {
  if (handle === "head") return { headY: Math.min(0, shape.headY + y) };
  if (handle === "feet") return { feetRadius: Math.max(1, shape.feetRadius + (x || -y)) };
  if (handle === "side") {
    return { hitBox: { ...shape.hitBox, width: Math.max(1, shape.hitBox.width + (x || -y) * 2) } };
  }
  return { hitBox: { ...shape.hitBox, height: Math.max(1, shape.hitBox.height - (y || -x)) } };
};
