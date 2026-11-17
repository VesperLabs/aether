import { getBody, type FrameHands, type HandOffset } from "../bodies/bodies";

/** A race's hand poses on one frame (`down-stand`, `up-attack_right`); undefined without hands. */
export function getFrameHands(race: string | undefined, frame: string): FrameHands | undefined {
  const { hands } = getBody(race);
  return hands && Object.hasOwn(hands, frame) ? hands[frame] : undefined;
}

/**
 * Where the swinging hand is while it swings, from the same points the client draws it at: in the
 * attack frame (`up-attack_right` and so on), or the standing one for a body that has no attack
 * animations and shows that instead. Undefined for races without hand points.
 */
export function getAttackHandOffset(
  race: string | undefined,
  direction: string | undefined,
  action: string,
  hand: "handLeft" | "handRight",
): HandOffset | undefined {
  const shown = getBody(race).attackAnims ? action : "stand";
  const frame = getFrameHands(race, `${direction}-${shown}`);
  const offset = hand === "handLeft" ? frame?.left : frame?.right;
  return offset ? { x: offset.x, y: offset.y } : undefined;
}
