import { isActorId } from "@/content";
import { entitiesInRoom } from "@/rules/world";
import { getFullCharacterState } from "@/network/sync";
import { canTame, catchNpc, makeCompanion, removeNpc } from "@/server/companions";
import { findCharacter } from "@/server/find-character";
import { spawnNpc } from "@/server/game-world";
import type { Npc } from "@/server/npc";
import type { PlayerInRoom } from "@/server/player-room";
import type { ServerWorld } from "@/server/server-world";
import { parseInteger, subcommands, type Cheat } from "./cheat";

/*
 * `/npc` cheats: four verbs over one idea. Anything you `spawn` or `tame` is yours to `list` and
 * `clear`; whether it fights for you is the `pet` word on spawn (or taming it).
 */

const MAX_SPAWNS = 20;
/** How far from the player, in pixels, spawned NPCs appear. */
const SPAWN_DISTANCE = 48;
/** How close an NPC must be to tame it. */
const TAME_RANGE = 160;

const SPAWN_USAGE = "Usage: /npc spawn <actor> [pet] [count]";

/** Places one actor and shows it to the room, marked as this player's spawn. */
function place(world: ServerWorld, player: PlayerInRoom, actor: string, x: number, y: number) {
  const npc = spawnNpc(world, player.room, {
    name: actor,
    x,
    y,
    properties: [
      { name: "isCheatSpawned", value: true },
      { name: "spawnedBy", value: player.socketId },
    ],
  });
  if (!npc) return;
  world.io.to(player.roomName).emit("npcJoin", getFullCharacterState(npc));
  return npc;
}

/**
 * `/npc spawn <actor> [pet] [count]`: any actor, a crab or a shopkeeper alike. With `pet` they are
 * your companions. The count comes last and defaults to 1.
 */
const spawn: Cheat = (ctx, player, [actor, ...args], reply) => {
  if (!actor || !isActorId(actor)) return reply.error(SPAWN_USAGE);
  const isPet = args[0]?.toLowerCase() === "pet";
  const [countArg, ...rest] = isPet ? args.slice(1) : args;
  const count = countArg === undefined ? 1 : parseInteger(countArg);
  if (count === undefined || rest.length > 0) return reply.error(SPAWN_USAGE);
  if (count < 1 || count > MAX_SPAWNS) {
    return reply.error(`Spawn between 1 and ${MAX_SPAWNS} at a time.`);
  }
  const spawned: Npc[] = [];
  for (let i = 0; i < count; i++) {
    /* Spread them in a ring so they don't stack on one spot */
    const angle = (i / count) * Math.PI * 2;
    const x = player.x + Math.cos(angle) * SPAWN_DISTANCE;
    const y = player.y + Math.sin(angle) * SPAWN_DISTANCE;
    const npc = place(ctx.world, player, actor, x, y);
    if (npc) spawned.push(npc);
  }
  if (isPet) for (const npc of spawned) makeCompanion(npc, player);
  reply.info(`Spawned ${count} ${actor}${isPet ? " as your companions" : ""}.`);
};

/**
 * `/npc tame [actor]`: catches the nearest wild NPC (of that actor, if named). You get a copy, which
 * dissolves in at your feet; the wild one drops and respawns at its spot, so the map never runs out.
 */
const tame: Cheat = (ctx, player, [actor], reply) => {
  const distance = (n: Npc) => Math.hypot(n.x - player.x, n.y - player.y);
  const nearest = entitiesInRoom(ctx.world.npcs, player.roomName)
    .filter((n) => canTame(n) && (!actor || n.name === actor) && distance(n) <= TAME_RANGE)
    .sort((a, b) => distance(a) - distance(b))[0];
  if (!nearest) return reply.error(`No tameable ${actor ?? "NPC"} close enough.`);
  const pet = place(ctx.world, player, nearest.name, player.x, player.y);
  if (!pet) return reply.error(`Could not tame ${nearest.name}.`);
  makeCompanion(pet, player);
  catchNpc(nearest);
  reply.info(`${pet.profile?.userName ?? pet.name} is now your companion.`);
};

/** Everything a player spawned or owns, anywhere in the world. */
function yours(world: ServerWorld, player: PlayerInRoom) {
  return Object.values(world.npcs).filter(
    (npc) => npc.state.spawnedBy === player.socketId || npc.state.ownerId === player.socketId,
  );
}

/** One line about an NPC: who it is, whose side, and what it is doing right now. */
function describe(world: ServerWorld, npc: Npc) {
  const name = npc.profile?.userName ?? npc.name;
  const side = npc.state.ownerId ? "yours" : npc.talks ? "peaceful" : "wild";
  const target = findCharacter(world, npc.state.lockedPlayerId);
  const plan = npc.mind?.memory.plan;
  const doing = npc.state.isDead
    ? "dead"
    : npc.mind
      ? `${npc.mind.memory.strategy ?? "thinking"} → ${plan?.steps[plan.step]?.task ?? "-"}`
      : `${npc.state.behavior ?? "idle"}${target ? ` ${target.profile?.userName ?? target.id}` : ""}`;
  return `${name} (${side}, ${npc.stats.hp}/${npc.stats.maxHp} hp, ${npc.room.name}): ${doing}`;
}

/** `/npc list`: what you spawned and your companions, and what each is doing. */
const list: Cheat = (ctx, player, _args, reply) => {
  const npcs = yours(ctx.world, player);
  if (npcs.length === 0) return reply.info("You have no spawned NPCs or companions.");
  reply.info(npcs.map((npc) => describe(ctx.world, npc)).join("\n"));
};

/** `/npc clear`: removes what you spawned and your companions. */
const clear: Cheat = (ctx, player, _args, reply) => {
  const npcs = yours(ctx.world, player);
  for (const npc of npcs) removeNpc(npc);
  reply.info(`Removed ${npcs.length} NPC${npcs.length === 1 ? "" : "s"}.`);
};

/** `/npc <spawn|tame|list|clear> ...`: place NPCs, own them, and see what they are up to. */
export const NPC_CHEATS: Record<string, Cheat> = {
  npc: subcommands("npc", { spawn, tame, list, clear }),
};
