import type { Hand, WeaponPoses } from "./weapon-pose";

export type HandPlacement = { frame: string; hand: Hand; x: number; y: number };

/** The poses with one hand moved on one frame, everything else as it was. */
export const withPlacement = (poses: WeaponPoses, { frame, hand, x, y }: HandPlacement) => ({
  ...poses,
  [frame]: { ...poses[frame], [hand]: { ...poses[frame]?.[hand], x, y } },
});

/** Whether the points place this hand on any frame: whether the body has it. */
export const hasHandIn = (points: WeaponPoses | null | undefined, hand: Hand) =>
  !!points && Object.values(points).some((frame) => !!frame[hand]);

/**
 * The points with one hand added or taken away. An added hand starts from `from` (the body's own
 * saved points for it, else the human's), frame by frame. Taking the last hand away leaves `null`:
 * no hands at all.
 */
export const withHand = (
  points: WeaponPoses | undefined,
  hand: Hand,
  on: boolean,
  from: WeaponPoses,
): WeaponPoses | null => {
  const frames = Object.keys(from);
  const next = Object.fromEntries(
    frames.map((frame) => {
      const { [hand]: _dropped, ...rest } = points?.[frame] ?? {};
      return [frame, on && from[frame]?.[hand] ? { ...rest, [hand]: from[frame][hand] } : rest];
    }),
  );
  return hasHandIn(next, "left") || hasHandIn(next, "right") ? next : null;
};
