import { isActorId } from "@/content";
import { entitiesInRoom, type Point } from "@/rules/world";
import { getFullCharacterState } from "@/network/sync";
import {
  canTame,
  catchNpc,
  companionsOf,
  makeCompanion,
  releaseNpc,
  removeNpc,
} from "@/server/companions";
import { spawnNpc } from "@/server/game-world";
import type { Npc } from "@/server/npc";
import type { PlayerInRoom } from "@/server/player-room";
import type { ServerWorld } from "@/server/server-world";
import { parseInteger, subcommands, type Cheat } from "./cheat";

const MAX_SPAWNS = 20;
/** How far from the player, in pixels, spawned NPCs appear. */
const SPAWN_DISTANCE = 48;
/** How close an NPC must be to tame it. */
const TAME_RANGE = 160;

/** Places `count` of an actor in a ring around the player and shows them to the room. */
function spawnAround(world: ServerWorld, player: PlayerInRoom, actor: string, count: number) {
  const spawned: Npc[] = [];
  for (let i = 0; i < count; i++) {
    /* Spread them in a ring so they don't stack on one spot */
    const angle = (i / count) * Math.PI * 2;
    const npc = spawnNpc(world, player.room, {
      name: actor,
      x: player.x + Math.cos(angle) * SPAWN_DISTANCE,
      y: player.y + Math.sin(angle) * SPAWN_DISTANCE,
      properties: [{ name: "isCheatSpawned", value: true }],
    });
    if (!npc) continue;
    world.io.to(player.roomName).emit("npcJoin", getFullCharacterState(npc));
    spawned.push(npc);
  }
  return spawned;
}

/** `/npc spawn <actor> [count]`: any actor, a crab or a shopkeeper alike. */
const spawn: Cheat = (ctx, player, [actor, countArg], reply) => {
  if (!actor || !isActorId(actor)) return reply.error("Usage: /npc spawn <actor> [count]");
  const count = parseInteger(countArg) ?? 1;
  if (count < 1 || count > MAX_SPAWNS) {
    return reply.error(`Spawn between 1 and ${MAX_SPAWNS} at a time.`);
  }
  spawnAround(ctx.world, player, actor, count);
  reply.info(`Spawned ${count} ${actor}.`);
};

/** `/npc despawn`: removes the NPCs cheats spawned in this room. */
const despawn: Cheat = (ctx, player, _args, reply) => {
  const spawned = entitiesInRoom(ctx.world.npcs, player.roomName).filter(
    (n) => n.state?.isCheatSpawned,
  );
  for (const npc of spawned) removeNpc(npc);
  reply.info(`Removed ${spawned.length} spawned NPCs.`);
};

/** Spawns `actor` at `at` as the player's companion. Undefined if it can't be tamed (it talks). */
function spawnCompanion(world: ServerWorld, player: PlayerInRoom, actor: string, at: Point) {
  const npc = spawnNpc(world, player.room, { name: actor, ...at });
  if (!npc) return;
  if (!canTame(npc)) {
    delete world.npcs[npc.id];
    world.netIds.release(npc.id);
    return;
  }
  makeCompanion(npc, player);
  world.io.to(player.roomName).emit("npcJoin", getFullCharacterState(npc));
  return npc;
}

/**
 * `/npc tame [actor]`: catches the nearest wild NPC (of that actor, if named). You get a copy; the
 * wild one drops and respawns at its spot, so the map never runs out.
 */
const tame: Cheat = (ctx, player, [actor], reply) => {
  const distance = (n: Npc) => Math.hypot(n.x - player.x, n.y - player.y);
  const nearest = entitiesInRoom(ctx.world.npcs, player.roomName)
    .filter((n) => canTame(n) && (!actor || n.name === actor) && distance(n) <= TAME_RANGE)
    .sort((a, b) => distance(a) - distance(b))[0];
  if (!nearest) return reply.error(`No tameable ${actor ?? "NPC"} close enough.`);
  const pet = spawnCompanion(ctx.world, player, nearest.name, { x: nearest.x, y: nearest.y });
  if (!pet) return reply.error(`Could not tame ${nearest.name}.`);
  catchNpc(nearest);
  reply.info(`${pet.profile?.userName ?? pet.name} is now your companion.`);
};

/** `/npc summon <actor>`: a new companion at your side. */
const summon: Cheat = (ctx, player, [actor], reply) => {
  if (!actor || !isActorId(actor)) return reply.error("Usage: /npc summon <actor>");
  const pet = spawnCompanion(ctx.world, player, actor, {
    x: player.x + SPAWN_DISTANCE,
    y: player.y,
  });
  if (!pet) return reply.error(`${actor} can't be a companion.`);
  reply.info(`Summoned ${pet.profile?.userName ?? actor}.`);
};

/** `/npc dismiss`: sends every companion away. */
const dismiss: Cheat = (ctx, player, _args, reply) => {
  const pets = companionsOf(ctx.world, player.socketId);
  for (const npc of pets) releaseNpc(npc);
  reply.info(`Dismissed ${pets.length} companion${pets.length === 1 ? "" : "s"}.`);
};

/** `/npc list`: your companions. */
const list: Cheat = (ctx, player, _args, reply) => {
  const pets = companionsOf(ctx.world, player.socketId);
  if (pets.length === 0) return reply.info("No companions.");
  reply.info(
    pets
      .map((n) => `${n.profile?.userName ?? n.name} (${n.stats.hp}/${n.stats.maxHp} hp)`)
      .join(", "),
  );
};

/** `/npc <spawn|despawn|tame|summon|dismiss|list> ...`: place NPCs and own them. */
export const NPC_CHEATS: Record<string, Cheat> = {
  npc: subcommands("npc", { spawn, despawn, tame, summon, dismiss, list }),
};
