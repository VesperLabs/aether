import WEAPON_ATLAS from "../../../public/assets/atlas/weapon.json";
import BODIES from "../bodies/bodies.json";

/** Where a hand is, in pixels from the character's position, in one animation frame. */
export interface HandOffset {
  x: number;
  y: number;
}

type FrameHands = Record<string, { left?: HandOffset; right?: HandOffset }>;

const OFFSETS = WEAPON_ATLAS.offsets as Record<string, FrameHands>;

/** How a hand holds its weapon on one frame: its point, and how the weapon turns there. */
interface HandPose extends HandOffset {
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
}

/** A race's hand poses on one frame (`down-stand`, `up-attack_right`); undefined without hands. */
export function getFrameHands(race: string | undefined, frame: string) {
  if (!hasHandPoints(race)) return undefined;
  const hands = OFFSETS[race as string];
  return Object.hasOwn(hands, frame)
    ? (hands[frame] as { left?: HandPose; right?: HandPose })
    : undefined;
}

/** Whether a race's hand points are placed, for either hand. */
function hasHandPoints(race: string | undefined) {
  return !!race && Object.hasOwn(OFFSETS, race);
}

/**
 * Whether a race has this hand: its points place it on some frame. A body can have one hand, the
 * other, both or neither.
 */
export function hasHand(race: string | undefined, hand: "left" | "right") {
  if (!hasHandPoints(race)) return false;
  return Object.values(OFFSETS[race as string]).some((frame) => !!frame[hand]);
}

/** Bodies that have attack animations; read from the data, as `bodies.ts` imports this file. */
const ATTACK_ANIMS = BODIES as Record<string, { attackAnims?: boolean }>;

/**
 * Where the swinging hand is while it swings, as the client draws it from the same `weapon.json`:
 * in the attack frame (`up-attack_right` and so on), or the standing one for a body that has no
 * attack animations and shows that instead. Undefined for races without hand points.
 */
export function getAttackHandOffset(
  race: string | undefined,
  direction: string | undefined,
  action: string,
  hand: "handLeft" | "handRight",
): HandOffset | undefined {
  const shown = ATTACK_ANIMS[race ?? ""]?.attackAnims ? action : "stand";
  const frame = OFFSETS[race ?? ""]?.[`${direction}-${shown}`];
  const offset = hand === "handLeft" ? frame?.left : frame?.right;
  return offset ? { x: offset.x, y: offset.y } : undefined;
}
