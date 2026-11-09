import WEAPON_ATLAS from "../../../public/assets/atlas/weapon.json";

/** Where a hand is, in pixels from the character's position, in one animation frame. */
export interface HandOffset {
  x: number;
  y: number;
}

type FrameHands = Record<string, { left?: HandOffset; right?: HandOffset }>;

const OFFSETS = WEAPON_ATLAS.offsets as Record<string, FrameHands>;

/**
 * Where the swinging hand is in a race's attack frame (`up-attack_right` and so on), as the client
 * draws it from the same `weapon.json`. Undefined for races without hand frames.
 */
export function getAttackHandOffset(
  race: string | undefined,
  direction: string | undefined,
  action: string,
  hand: "handLeft" | "handRight",
): HandOffset | undefined {
  const frame = OFFSETS[race ?? ""]?.[`${direction}-${action}`];
  const offset = hand === "handLeft" ? frame?.left : frame?.right;
  return offset ? { x: offset.x, y: offset.y } : undefined;
}
