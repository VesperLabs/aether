import type { BodyData, HandPose } from "@/content";
import { DIRECTIONS } from "@/ui";
import { sortForDirection, type StackedSheet } from "./frame-stack";
import type { Frame } from "./lab-state";

export const HANDS = ["right", "left"] as const;
export type Hand = (typeof HANDS)[number];

/** Where a hand holds its weapon on one frame, from the body's feet (its file's `hands`). */
export type WeaponPose = HandPose;
/** A body's hand points by frame, as its file has them (`hands`). */
export type WeaponPoses = NonNullable<BodyData["hands"]>;

/** A sheet's columns, as the animations in `80x80.json` name them. */
const COLUMN_NAMES = ["stand", "walk.000", "walk.001", "walk.002", "attack_right", "attack_left"];

/** The frame's key in `weapon.json`; undefined off the animated part of the sheet. */
export const getPoseName = ({ column, row }: Frame) => {
  const direction = DIRECTIONS[row];
  const name = COLUMN_NAMES[column];
  return direction && name ? `${direction}-${name}` : undefined;
};

/**
 * One frame of the character on a canvas `size` wide, with the frame in the middle and `weapon` in
 * each hand that has a pose, each in its place in the stack.
 */
export const paintBodyFrame = (
  ctx: CanvasRenderingContext2D,
  {
    stack,
    weapon,
    poses,
    frame: { column, row },
    cell,
    size,
    spriteAboveFeet,
  }: {
    stack: StackedSheet[];
    weapon: HTMLCanvasElement | null;
    poses: Partial<Record<Hand, WeaponPose>>;
    frame: Frame;
    cell: number;
    size: number;
    /** How far the sprite is drawn above the feet, which hand points are measured from. */
    spriteAboveFeet: number;
  },
) => {
  const margin = (size - cell) / 2;
  const held = weapon
    ? HANDS.flatMap((hand) => {
        const pose = poses[hand];
        return pose
          ? [{ layer: hand === "left" ? "handLeft" : "handRight", image: weapon, pose }]
          : [];
      })
    : [];
  const layers: { layer: string; image: HTMLCanvasElement; pose?: WeaponPose }[] = [
    ...stack,
    ...held,
  ];
  sortForDirection(DIRECTIONS[row], layers).forEach(({ image, pose }) => {
    if (!pose) {
      ctx.drawImage(image, column * cell, row * cell, cell, cell, margin, margin, cell, cell);
      return;
    }
    const { x, y, flipX, flipY, rotation = 0 } = pose;
    ctx.save();
    ctx.translate(size / 2 + x, size / 2 + y + spriteAboveFeet);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  });
};
