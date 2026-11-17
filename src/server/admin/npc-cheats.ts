import { actors, findItemKey, getBody, isActorId } from "@/content";
import { entitiesInRoom } from "@/rules/world";
import { EMPTY_HAND, SPAWN_SIDES } from "@/network";
import { getPublicCharacterState } from "@/network/sync";
import { catchAsOwned } from "@/server/catching";
import { canOwn, isFollower, isPet, makeOwned, removeNpc } from "@/server/owned-npcs";
import { canKeepPet, PETS_FULL } from "@/server/pets";
import { findCharacter } from "@/server/find-character";
import { spawnNpc } from "@/server/game-world";
import type { Npc } from "@/server/npc";
import type { PlayerInRoom } from "@/server/player-room";
import type { ServerWorld } from "@/server/server-world";
import { parseInteger, subcommands, type Cheat } from "./cheat";

/*
 * `/npc` cheats: place NPCs and make them yours. A *follower* is temporary (`spawn ... follower`,
 * `follow`): it follows and fights for you, isn't saved, and `clear` removes it. A *pet* is caught
 * (`catch`, as a ball does): it goes in your pet slots and is saved (`server/pets`).
 */

const MAX_SPAWNS = 20;
/** How far from the player, in pixels, spawned NPCs appear. */
const SPAWN_DISTANCE = 48;
/** How close an NPC must be to take it as a follower or catch it. */
const REACH = 160;

const SPAWN_USAGE = "Usage: /npc spawn <actor> [wild|follower] [count] [right hand] [left hand]";
/** What a spawn can be handed: anything held. */
const HELD_TYPES = ["weapon", "ranged", "shield"];
const HANDS = ["handRight", "handLeft"] as const;

/** Places one actor and shows it to the room, marked as this player's spawn. */
function place(
  world: ServerWorld,
  player: PlayerInRoom,
  actor: string,
  { x, y }: { x: number; y: number },
  equipment: Record<string, string>,
) {
  const npc = spawnNpc(world, player.room, {
    name: actor,
    x,
    y,
    equipment,
    properties: [
      { name: "isCheatSpawned", value: true },
      { name: "spawnedBy", value: player.socketId },
    ],
  });
  if (!npc) return;
  world.io.to(player.roomName).emit("npcJoin", getPublicCharacterState(npc));
  return npc;
}

/**
 * `/npc spawn <actor> [wild|pet] [count] [right hand] [left hand]`: any actor, a crab or a
 * shopkeeper alike. `follower` makes them your followers; the count defaults to 1. Weapons, shields or
 * bows go in the hands over the actor's own; `none` leaves a hand as it is. Slots left off take
 * their defaults.
 */
const spawn: Cheat = (ctx, player, [actor, side = "wild", countArg = "1", ...hands], reply) => {
  if (!actor || !isActorId(actor)) return reply.error(SPAWN_USAGE);
  if (!(SPAWN_SIDES as readonly string[]).includes(side.toLowerCase())) {
    return reply.error(SPAWN_USAGE);
  }
  const isFollower = side.toLowerCase() === "follower";
  const count = parseInteger(countArg);
  if (count === undefined || hands.length > HANDS.length) return reply.error(SPAWN_USAGE);
  const equipment: Record<string, string> = {};
  for (const [i, name] of hands.entries()) {
    if (name.toLowerCase() === EMPTY_HAND) continue;
    const item = findItemKey(name);
    if (!item || !HELD_TYPES.includes(item.type)) {
      return reply.error(`${name} is not a weapon, shield or bow. ${SPAWN_USAGE}`);
    }
    equipment[HANDS[i]] = item.key;
  }
  if (count < 1 || count > MAX_SPAWNS) {
    return reply.error(`Spawn between 1 and ${MAX_SPAWNS} at a time.`);
  }
  const spawned: Npc[] = [];
  for (let i = 0; i < count; i++) {
    /* Spread them in a ring so they don't stack on one spot */
    const angle = (i / count) * Math.PI * 2;
    const x = player.x + Math.cos(angle) * SPAWN_DISTANCE;
    const y = player.y + Math.sin(angle) * SPAWN_DISTANCE;
    const npc = place(ctx.world, player, actor, { x, y }, equipment);
    if (npc) spawned.push(npc);
  }
  if (isFollower) for (const npc of spawned) makeOwned(npc, player);
  reply.info(`Spawned ${count} ${actor}${isFollower ? " as your followers" : ""}.`);
  const body = getBody(actors[actor].profile.race);
  const handless = HANDS.filter((hand) => equipment[hand] && !body[hand]);
  if (handless.length > 0) {
    reply.info(
      `${actor} has no ${handless.map((hand) => (hand === "handLeft" ? "left" : "right")).join(" or ")} hand, so it can't use what it holds there. Place it in the Sprites page's body window.`,
    );
  }
};

/** The nearest wild NPC within reach (of that actor, if named). */
function nearestWild(world: ServerWorld, player: PlayerInRoom, actor?: string) {
  const distance = (n: Npc) => Math.hypot(n.x - player.x, n.y - player.y);
  return entitiesInRoom(world.npcs, player.roomName)
    .filter((n) => canOwn(n) && (!actor || n.name === actor) && distance(n) <= REACH)
    .sort((a, b) => distance(a) - distance(b))[0];
}

/**
 * `/npc follow [actor]`: the nearest wild NPC (of that actor, if named) follows you, for now. You
 * get a copy, which dissolves in at your feet; the wild one drops and respawns at its spot.
 */
const follow: Cheat = (ctx, player, [actor], reply) => {
  const nearest = nearestWild(ctx.world, player, actor);
  if (!nearest) return reply.error(`No wild ${actor ?? "NPC"} close enough.`);
  const follower = catchAsOwned(ctx.world, player, nearest, [
    { name: "isCheatSpawned", value: true },
    { name: "spawnedBy", value: player.socketId },
  ]);
  if (!follower) return reply.error(`Could not take ${nearest.name}.`);
  reply.info(`${follower.profile?.userName ?? follower.name} follows you.`);
};

/**
 * `/npc catch [actor]`: catches the nearest wild NPC (of that actor, if named) as a pet, exactly as
 * a ball's catch does: into your pet slots, saved.
 */
const catchPet: Cheat = (ctx, player, [actor], reply) => {
  if (!canKeepPet(player)) return reply.error(PETS_FULL);
  const nearest = nearestWild(ctx.world, player, actor);
  if (!nearest) return reply.error(`No wild ${actor ?? "NPC"} close enough.`);
  const pet = catchAsOwned(ctx.world, player, nearest, [], { asPet: true });
  if (!pet) return reply.error(`Could not catch ${nearest.name}.`);
  reply.info(`Caught ${pet.profile?.userName ?? pet.name}.`);
};

/** Everything a player spawned or owns, anywhere in the world. */
function yours(world: ServerWorld, player: PlayerInRoom) {
  return Object.values(world.npcs).filter(
    (npc) => npc.state.spawnedBy === player.socketId || npc.state.ownerId === player.socketId,
  );
}

/** One line about an NPC: who it is, what it is to you, and what it is doing right now. */
function describe(world: ServerWorld, npc: Npc) {
  const name = npc.profile?.userName ?? npc.name;
  const side = isPet(npc) ? "pet" : isFollower(npc) ? "follower" : npc.talks ? "peaceful" : "wild";
  const target = findCharacter(world, npc.state.lockedPlayerId);
  const doing = npc.state.isDead
    ? "dead"
    : `${npc.state.behavior ?? "idle"}${target ? ` ${target.profile?.userName ?? target.id}` : ""}`;
  return `${name} (${side}, ${npc.stats.hp}/${npc.stats.maxHp} hp, ${npc.room.name}): ${doing}`;
}

/** `/npc list`: what you spawned, your pets and followers, and what each is doing. */
const list: Cheat = (ctx, player, _args, reply) => {
  const npcs = yours(ctx.world, player);
  if (npcs.length === 0) return reply.info("You have no spawned NPCs, pets or followers.");
  reply.info(npcs.map((npc) => describe(ctx.world, npc)).join("\n"));
};

/** `/npc clear`: removes what you spawned and your followers. Pets stay (`/pet away`). */
const clear: Cheat = (ctx, player, _args, reply) => {
  const npcs = yours(ctx.world, player).filter((npc) => !isPet(npc));
  for (const npc of npcs) removeNpc(npc);
  reply.info(`Removed ${npcs.length} NPC${npcs.length === 1 ? "" : "s"}.`);
};

/** `/npc <spawn|follow|catch|list|clear> ...`: place NPCs, make them yours, see what they're up to. */
export const NPC_CHEATS: Record<string, Cheat> = {
  npc: subcommands("npc", { spawn, follow, catch: catchPet, list, clear }),
};
