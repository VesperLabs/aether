import { getAimAngle, getSpell, type CharacterShapeInput } from "@/rules/spells";
import { NPC_AIM_LEAD_RATIO } from "./constants";

/** The angle an NPC fires `spellName` at `target`, leading them a little if they are moving. */
export function aimNpcShot(
  npc: { x: number; y: number; bodyCenterY: number },
  target: CharacterShapeInput & { vx?: number; vy?: number },
  spellName: string,
): number {
  const { delivery } = getSpell(spellName);
  const projectileSpeed = "speed" in delivery ? delivery.speed : 0;
  return getAimAngle(npc, target, { projectileSpeed, ratio: NPC_AIM_LEAD_RATIO });
}
