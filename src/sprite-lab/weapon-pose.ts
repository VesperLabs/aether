import { DIRECTIONS } from "@/ui";
import { sortForDirection, type StackedSheet } from "./frame-stack";
import { getAttackingHand } from "./hand-guide";
import type { Frame } from "./lab-state";

export const HANDS = ["right", "left"] as const;
export type Hand = (typeof HANDS)[number];

/** Where a hand holds its weapon on one frame, from the body's middle (`weapon.json`). */
export type WeaponPose = {
  x: number;
  y: number;
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
};
export type WeaponPoses = Record<string, Record<Hand, WeaponPose>>;

/** The game draws the body this far above the point weapons are placed from. */
const BODY_OFFSET_Y = 14;

/** A sheet's columns, as the animations in `80x80.json` name them. */
const COLUMN_NAMES = ["stand", "walk.000", "walk.001", "walk.002", "attack_right", "attack_left"];

/** The frame's key in `weapon.json`; undefined off the animated part of the sheet. */
export const getPoseName = ({ column, row }: Frame) => {
  const direction = DIRECTIONS[row];
  const name = COLUMN_NAMES[column];
  return direction && name ? `${direction}-${name}` : undefined;
};

/** The hand a frame is most likely being tuned for: its attacking one, or else the right. */
export const getStartHand = (frame: Frame) =>
  HANDS.find((hand) => hand === getAttackingHand(frame)) ?? "right";

/** The ring drawn round a hand point in place of the weapon, in preview pixels. */
const POINT_RADIUS = 3;
const POINT_COLOR = "#ff4d4d";

/** One frame of the character, with the weapon in its place in the stack, or a ring at its point. */
export const paintWeaponFrame = (
  ctx: CanvasRenderingContext2D,
  {
    stack,
    weapon,
    hand,
    pose,
    frame: { column, row },
    cell,
    size,
    pointOnly,
  }: {
    stack: StackedSheet[];
    weapon: HTMLCanvasElement | null;
    hand: Hand;
    pose: WeaponPose;
    frame: Frame;
    cell: number;
    /** The canvas, larger than a cell so long weapons fit. */
    size: number;
    /** Draws a ring round the hand point instead of the weapon. */
    pointOnly?: boolean;
  },
) => {
  const slot = hand === "left" ? "handLeft" : "handRight";
  const margin = (size - cell) / 2;
  const { x, y, flipX, flipY, rotation = 0 } = pose;
  const held = weapon && !pointOnly ? [{ layer: slot, image: weapon }] : [];
  const layers = [...stack, ...held];
  sortForDirection(DIRECTIONS[row], layers).forEach(({ layer, image }) => {
    if (layer !== slot) {
      ctx.drawImage(image, column * cell, row * cell, cell, cell, margin, margin, cell, cell);
      return;
    }
    ctx.save();
    ctx.translate(size / 2 + x, size / 2 + y + BODY_OFFSET_Y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  });
  if (pointOnly) {
    ctx.save();
    ctx.strokeStyle = POINT_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(size / 2 + x + 0.5, size / 2 + y + BODY_OFFSET_Y + 0.5, POINT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};
