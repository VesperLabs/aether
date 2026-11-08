import { getFullCharacterState } from "@/network/sync";
import type { GameEventBus, Point, RoomData, System } from "@/rules/world";
import { isAlly } from "./allegiance-adapter";
import { findCharacter } from "./find-character";
import type { Npc } from "./npc";
import type { Player } from "./player";
import type { ServerWorld } from "./server-world";

/*
 * Companions: NPCs a player owns. Any NPC can be one; owning it only sets `state.ownerId`, which puts
 * it on its owner's side (`rules/allegiance`), makes it follow them, and has it join their fights.
 */

/** A companion further than this from its owner (or in another room) appears on them. */
const CATCH_UP_DISTANCE = 480;
/** Least threat a companion takes from its owner's fight, so even weak hits pull it in. */
const MIN_ASSIST_THREAT = 10;

/** Every NPC `ownerId` owns. */
function companionsOf(world: ServerWorld, ownerId: string): Npc[] {
  return Object.values(world.npcs).filter((npc) => npc.state.ownerId === ownerId);
}

/**
 * Any living NPC nobody owns yet can be tamed, keepers included. What a player may catch in play (a
 * pokeball won't take a keeper) is that item's own rule, on top of this.
 */
export const canTame = (npc: Npc) => !npc.state.ownerId && !npc.state.isDead;

/**
 * Makes a fresh NPC belong to `owner`: it appears on them, stops picking fights, follows them and
 * fights for them.
 */
export function makeCompanion(npc: Npc, owner: Player) {
  npc.state.ownerId = owner.socketId;
  /* Companions think with their follow-and-fight behaviors, not a planning mind. */
  npc.mind = undefined;
  npc.state.isStatic = false;
  npc.state.isResetting = false;
  npc.behaviors = [...(npc.behaviors ?? []).filter((b) => b !== "aggressive"), "follow"];
  npc.threat = {};
  npc.setLockedPlayerId(null);
  /* Appears on its owner, out of whatever wall or water it was caught in */
  if (owner.room) moveNpc(npc, owner.room, { x: owner.x, y: owner.y });
}

/**
 * Takes a wild NPC out of the fight as if caught: it drops (no exp, no loot) and respawns at its
 * spot as usual, so taming never empties the map. The caller gives the owner a copy.
 */
export function catchNpc(npc: Npc) {
  npc.setDead();
  npc.stats.hp = 0;
  npc.world.io
    .to(npc.room.name)
    .emit("assignDamage", [{ type: "death", amount: 0, from: npc.id, to: npc.id }] as Hit[]);
}

/** Takes an NPC out of the world and off its room's screens. */
export function removeNpc(npc: Npc) {
  const { world } = npc;
  delete world.npcs[npc.id];
  world.netIds.release(npc.id);
  world.io.to(npc.room.name).emit("npcRemove", npc.id);
}

/** Puts an NPC somewhere else, telling both rooms when it changes room. */
function moveNpc(npc: Npc, room: RoomData, to: Point) {
  const { io } = npc.world;
  const from = npc.room.name;
  npc.x = to.x;
  npc.y = to.y;
  npc.vx = 0;
  npc.vy = 0;
  if (from === room.name) return;
  npc.room = room;
  npc.roomName = room.name;
  io.to(from).emit("npcRemove", npc.id);
  io.to(room.name).emit("npcJoin", getFullCharacterState(npc));
}

/**
 * Brings a player's companions to them right away, e.g. as they go through a door, so they are
 * in the room state the player loads instead of joining a scene that isn't ready yet.
 */
export function bringCompanions(world: ServerWorld, owner: Player) {
  const room = owner.roomName ? world.rooms[owner.roomName] : undefined;
  if (!room) return;
  for (const npc of companionsOf(world, owner.socketId)) {
    if (!npc.state.isDead) moveNpc(npc, room, { x: owner.x, y: owner.y });
  }
}

/**
 * Keeps companions with their owners: one left behind (another room, or far away) appears on
 * its owner, and one whose owner left the game leaves with them. Runs before rooms are indexed.
 */
export const keepCompanionsNear: System<ServerWorld> = (world) => {
  for (const npc of Object.values(world.npcs)) {
    if (!npc.state.ownerId) continue;
    const owner = world.players[npc.state.ownerId];
    if (!owner) {
      removeNpc(npc);
      continue;
    }
    const room = owner.roomName ? world.rooms[owner.roomName] : undefined;
    if (!room || npc.state.isDead) continue;
    const isAway = npc.room.name !== room.name;
    if (isAway || Math.hypot(npc.x - owner.x, npc.y - owner.y) > CATCH_UP_DISTANCE) {
      moveNpc(npc, room, { x: owner.x, y: owner.y });
    }
  }
};

/**
 * Companions join their owner's fights: whoever the owner hurts, and whoever hurts the owner, gains
 * threat with each of the owner's companions in the room.
 */
export function subscribeCompanions(bus: GameEventBus, world: ServerWorld) {
  return bus.on("characterDamaged", ({ victimId, attackerId, amount }) => {
    const attacker = findCharacter(world, attackerId);
    const victim = findCharacter(world, victimId);
    if (!attacker || !victim || isAlly(world, attacker, victim)) return;
    const assist = (ownerId: string, foeId: string) => {
      for (const pet of companionsOf(world, ownerId)) {
        if (pet.room.name !== victim.room?.name) continue;
        /* At least enough to act on: a 1-damage hit's threat would fade before the next tick */
        pet.addThreat(foeId, Math.max(amount, MIN_ASSIST_THREAT));
      }
    };
    if (attacker.kind === "player") assist(attackerId, victimId);
    if (victim.kind === "player") assist(victimId, attackerId);
  });
}
