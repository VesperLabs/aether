import { getAimAngle, getSpell, type CharacterShapeInput } from "@/rules/spells";
import {
  NPC_AIM_LEAD_RATIO,
  NPC_CHASE_LEAD_MAX_MS,
  NPC_CHASE_LEAD_RATIO,
  NPC_SWING_LEAD_MS,
} from "./constants";
import { aimPounce, predictPosition } from "./pounce";

type Mover = { x: number; y: number; vx?: number; vy?: number };

/** Where a melee NPC swings at: a beat ahead of a moving target, so a sidestep isn't a free dodge. */
export const aimNpcSwing = (target: Mover) => predictPosition(target, NPC_SWING_LEAD_MS);

/**
 * Where a chasing NPC heads: part of the way to where its target will be by the time it gets
 * there, so it cuts corners on a circling target instead of trailing behind it.
 */
export function leadNpcChase(self: Mover, target: Mover, walkSpeed: number) {
  if (!walkSpeed) return target;
  const eta = (Math.hypot(target.x - self.x, target.y - self.y) / walkSpeed) * 1000;
  return predictPosition(target, Math.min(NPC_CHASE_LEAD_MAX_MS, eta) * NPC_CHASE_LEAD_RATIO);
}

/**
 * The angle an NPC fires `spellName` at `target`, leading them a little if they are moving. A
 * pounce leads them all the way, to where they will be as it lands.
 */
export function aimNpcShot(
  npc: { x: number; y: number; bodyCenterY: number },
  target: CharacterShapeInput & { vx?: number; vy?: number },
  spellName: string,
): number {
  const spell = getSpell(spellName);
  if (spell.pounces) return aimPounce(npc, target).angle;
  const { delivery } = spell;
  const projectileSpeed = "speed" in delivery ? delivery.speed : 0;
  return getAimAngle(npc, target, { projectileSpeed, ratio: NPC_AIM_LEAD_RATIO });
}
