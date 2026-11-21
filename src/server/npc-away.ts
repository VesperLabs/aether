import { actors, getMapByName, isActorId, type ActiveTimes, type ActorDefinition } from "@/content";
import { hourAt, isActive, mapSeason, seasonAt } from "@/rules/seasons";
import type { System } from "@/rules/world";
import type { Npc } from "./npc";
import type { ServerWorld } from "./server-world";

/** When an NPC's actor is about; owned ones (pets) go wherever their owner does. */
function activeTimesOf(npc: Npc): ActiveTimes | undefined {
  if (npc.state.ownerId || !isActorId(npc.name)) return;
  return (actors[npc.name] as ActorDefinition).active;
}

/**
 * Away is dead without the dying: out of reach and hidden, with no kill, loot or exp. One killed
 * before it goes stays dead and comes back whole with the rest.
 */
function sendAway(world: ServerWorld, npc: Npc) {
  npc.state.isAway = true;
  if (npc.state.isDead) return;
  npc.setDead();
  world.events.emit("npcWentAway", { npcId: npc.id, roomName: npc.room.name });
}

/** Back at its spawn, through the respawn every client already plays. */
function bringBack(npc: Npc) {
  npc.state.isAway = false;
  npc.state.isDead = true;
  npc.state.deadTime = -Infinity;
  npc.tryRespawn();
}

/**
 * Sends actors away outside their `active` times (butterflies at night and in fall and winter) and
 * brings them back when their time comes round, by their map's season. Runs before NPCs update,
 * which skip anyone away, so nothing respawns them early.
 */
export const keepActorsToTheirTimes: System<ServerWorld> = (world) => {
  const now = world.now();
  const worldSeason = seasonAt(now, world.calendar);
  const hour = hourAt(now, world.calendar);
  for (const npc of Object.values(world.npcs)) {
    const active = activeTimesOf(npc);
    if (!active || !npc.room) continue;
    const season = mapSeason(getMapByName(npc.room.name)?.seasons, worldSeason);
    const about = isActive(active, season, hour);
    if (!about && !npc.state.isAway) sendAway(world, npc);
    else if (about && npc.state.isAway) bringBack(npc);
  }
};
