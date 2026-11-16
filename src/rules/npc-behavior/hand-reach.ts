import { getAttackHandOffset } from "@/content";
import { BODY_RADIUS, shapesOverlap, type Shape } from "@/rules/movement";
import { getMeleeSwing, getSwingShape, planSwing } from "@/rules/spells";
import { getCharacterDirection, type CardinalDirection } from "@/rules/world";
import { NPC_SHOT_MARGIN } from "./constants";
import { checkInRange, type Body, type NpcWeaponRanges } from "./range";

/**
 * The melee swing an NPC with hands throws next, as `planSwing` needs it. Swings turn around the
 * swinging hand (where the body shows it while swinging), not the body.
 */
export interface NpcNextSwing {
  race: string;
  action: "attack_right" | "attack_left";
  /** How far the weapon reaches from the body centre, in pixels (`getWeaponRange`). */
  reach: number;
  /** The weapon has its own range stat, so the reach is measured to the hand, then the blade. */
  hasWeaponRange: boolean;
  /** A fist weapon (a katar) uppercuts facing sideways. */
  isUppercut: boolean;
  /** Where the body's middle is, below its position: swings not facing up turn from there. */
  bodyCenterY: number;
  /** The body's size (`profile.scale`); its hands and weapon grow with it. Unset is 1. */
  scale?: number;
}

/**
 * How close an NPC stands to its target, centre to centre: soft collision pushes bodies apart
 * inside `BODY_RADIUS * 2`, so it keeps a little clear of that, where nothing pushes it.
 */
const CONTACT = BODY_RADIUS * 2 + 3;

const FACINGS: readonly CardinalDirection[] = ["up", "right", "down", "left"];

/**
 * How far below its position a body-turned swing pivots facing `direction`, as `getMeleeSwing`
 * puts it: `planSwing` uses it only when there is no hand to turn around.
 */
function getOriginDy(swing: NpcNextSwing, direction: CardinalDirection) {
  const at = { y: 0, bodyCenterY: swing.bodyCenterY, direction, race: swing.race };
  return getMeleeSwing(at, swing.action, () => swing.reach).y;
}

/**
 * Where the next swing turns facing `direction`, from the NPC's position: its hand, as the body
 * shows it then and scaled with the body. The server turns a hand's swing around the caster's
 * position plus this (`getShape` in `server/spell.ts`). Undefined without that hand there.
 */
function getSwingPivot(swing: NpcNextSwing, direction: CardinalDirection) {
  const hand = swing.action === "attack_left" ? "handLeft" : "handRight";
  const drawn = getAttackHandOffset(swing.race, direction, swing.action, hand);
  if (!drawn) return undefined;
  const scale = swing.scale ?? 1;
  return { x: drawn.x * scale, y: drawn.y * scale };
}

/**
 * Whether the next swing, thrown from `at` facing `direction`, would touch the target's body: the
 * same plan and wedge the hit itself uses (`server/spell.ts`), its reach trimmed by the margin for
 * a target on the move.
 */
function swingHits(at: Body, target: Body, swing: NpcNextSwing, direction: CardinalDirection) {
  const dy = getOriginDy(swing, direction);
  const plan = planSwing({
    direction,
    action: swing.action,
    race: swing.race,
    reach: swing.reach,
    hasWeaponRange: swing.hasWeaponRange,
    isPunching: false,
    isUppercut: swing.isUppercut,
    bodyPivotY: dy,
    visibleMs: 0,
    scale: swing.scale,
  });
  /* From the caster's own position, as the server's `getShape` does: the plan's pivot holds the rest */
  const wedge = getSwingShape(plan, at, 0);
  const trimmed: Shape =
    wedge.kind === "sector" ? { ...wedge, radius: wedge.radius * NPC_SHOT_MARGIN } : wedge;
  const body: Shape = { kind: "circle", x: target.x, y: target.y, radius: target.bodySize || 8 };
  return shapesOverlap(trimmed, body);
}

/** The facings to try, the one straight at the target first. */
const facingsToward = (npc: Body, target: Body) => {
  const straight = getCharacterDirection(npc, target);
  return [straight, ...FACINGS.filter((facing) => facing !== straight)];
};

const hasHandSwing = (swing: NpcNextSwing | undefined): swing is NpcNextSwing =>
  !!swing && FACINGS.some((facing) => getSwingPivot(swing, facing));

/**
 * Which way to face to land the next swing from where the NPC stands: straight at the target if
 * that lands, else whichever facing's hand does (a hand off to the side turns it). Straight at the
 * target when none lands, or with no hand to swing.
 */
export function getSwingFacing(
  npc: Body & { weapons?: NpcWeaponRanges | null },
  target: Body,
): CardinalDirection {
  const swing = npc.weapons?.swing;
  const facings = facingsToward(npc, target);
  if (!hasHandSwing(swing)) return facings[0];
  return facings.find((facing) => swingHits(npc, target, swing, facing)) ?? facings[0];
}

/**
 * Close enough to land a melee hit. With a hand to swing, only when some facing's swing would
 * touch the target's body from right here, so it never swings at air; else edge to edge from the
 * body within `attackRange`.
 */
export function isInMeleeReach(
  npc: Body & { weapons?: NpcWeaponRanges | null },
  target: Body | null | undefined,
  attackRange: number,
) {
  const swing = npc.weapons?.swing;
  if (!target || !hasHandSwing(swing)) return !!checkInRange(npc, target, attackRange);
  return FACINGS.some((facing) => swingHits(npc, target, swing, facing));
}

/**
 * Where to stand, from the target, so the next swing lands: for each facing, the spot that puts
 * its hand on the target (moved out to where the bodies touch if that's inside the target, since
 * collision would push it back), kept if the swing lands from there. The nearest one wins, so a
 * hand off to the side has it step round rather than walk into the target. Undefined without a
 * hand to swing, or when no facing lands.
 */
export function getSwingAim(npc: Body & { weapons?: NpcWeaponRanges | null }, target: Body) {
  const swing = npc.weapons?.swing;
  if (!hasHandSwing(swing)) return undefined;
  let best: { x: number; y: number; distance: number } | undefined;
  for (const facing of FACINGS) {
    const pivot = getSwingPivot(swing, facing);
    if (!pivot) continue;
    let aim = { x: -pivot.x, y: -pivot.y };
    const length = Math.hypot(aim.x, aim.y);
    if (length < CONTACT) {
      /* Straight at the target, the side it comes from is the one to stop on */
      const side = length > 1e-6 ? aim : { x: npc.x - target.x, y: npc.y - target.y };
      const sideLength = Math.hypot(side.x, side.y) || 1;
      aim = { x: (side.x / sideLength) * CONTACT, y: (side.y / sideLength) * CONTACT };
    }
    const spot = { x: target.x + aim.x, y: target.y + aim.y };
    if (!swingHits(spot, target, swing, facing)) continue;
    const distance = Math.hypot(spot.x - npc.x, spot.y - npc.y);
    if (!best || distance < best.distance) best = { ...aim, distance };
  }
  return best && { x: best.x, y: best.y };
}
