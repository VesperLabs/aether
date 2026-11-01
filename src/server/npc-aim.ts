import { NPC_AIM_LEAD_RATIO } from "@/rules/npc-behavior";
import { getAimAngle, resolveSpellDetails } from "@/rules/spells";
import type { Npc } from "./npc";
import type { Player } from "./player";

/** The angle an NPC fires `spellName` at `target`, leading them a little if they are moving. */
export function aimNpcShot(npc: Npc, target: Player, spellName: string): number {
  const projectileSpeed = resolveSpellDetails(spellName).details?.spellSpeed ?? 0;
  return getAimAngle(npc, target, { projectileSpeed, ratio: NPC_AIM_LEAD_RATIO });
}
