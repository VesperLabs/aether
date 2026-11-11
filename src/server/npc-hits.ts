import type { AbilitySlot } from "@/rules/spells";
import { canHitPlayer } from "@/rules/spells";
import type { Hand } from "@/rules/combat";
import { entitiesInRoom } from "@/rules/world";
import { isAlly } from "./allegiance-adapter";
import type { ServerCharacter } from "./character";
import type { Npc } from "./npc";

/**
 * Damages (or, for holy, heals) everyone an NPC's attack or spell hit: foes need "enemy", its own side
 * "ally", itself "self". A companion's kills count as its owner's: exp, loot and quest progress.
 */
export function applyNpcHits(npc: Npc, ids: string[], abilitySlot?: AbilitySlot, hand?: Hand) {
  const { world, room } = npc;
  const roomName = room.name;
  const allowedTargets = npc.getAbilityDetails(abilitySlot).spell.targets;
  const victims = [
    ...entitiesInRoom(world.players, roomName),
    ...entitiesInRoom(world.npcs, roomName),
  ] as ServerCharacter[];

  const hitList: Hit[] = [];
  const kills: Npc[] = [];
  for (const victim of victims) {
    if (!ids.includes(victim.id)) continue;
    const isSelf = victim.id === npc.id;
    const isPartyMember = !isSelf && isAlly(world, npc, victim);
    if (!canHitPlayer({ allowedTargets, isSelf, isPartyMember })) continue;
    const newHits = npc.calculateDamage(victim, abilitySlot, hand);
    if (victim.kind === "npc" && newHits.some((hit) => hit.type === "death")) {
      kills.push(victim as Npc);
    }
    hitList.push(...newHits);
  }

  const owner = npc.owner();
  if (owner && kills.length > 0) owner.creditKills(kills, hitList);

  world.io.to(roomName).emit("assignDamage", hitList);
}
