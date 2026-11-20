import { getPublicCharacterState } from "@/network/sync";
import { findOpenSpot } from "@/rules/movement";
import { mergeBehaviors } from "@/rules/npc-behavior";
import type { GameEventBus, Point, RoomData, System } from "@/rules/world";
import { isAlly } from "./allegiance-adapter";
import { findCharacter } from "./find-character";
import type { Npc } from "./npc";
import type { Player } from "./player";
import type { ServerWorld } from "./server-world";

/*
 * Owned NPCs: ones a player owns, of two kinds. A *pet* was caught: it has a slot and is saved
 * (`server/pets`, marked by `state.petId`). A *follower* was made yours by an admin: temporary, no
 * slot. Either way owning only sets `state.ownerId`, which puts it on its owner's side
 * (`rules/allegiance`), makes it follow them, and has it join their fights.
 */

/** A pet: caught, in its owner's slots and saved. */
export const isPet = (npc: Npc) => !!npc.state?.petId;
/** A follower: owned, but only for now (an admin's), never saved. */
export const isFollower = (npc: Npc) => !!npc.state?.ownerId && !isPet(npc);

/** An owned NPC further than this from its owner (or in another room) appears on them. */
const CATCH_UP_DISTANCE = 480;
/**
 * An owned NPC that has tried to follow for this long, in ms, without getting anywhere is wedged:
 * it appears beside its owner instead of pushing at the wall.
 */
const STUCK_MS = 2000;
/** Moving less than this many pixels over `STUCK_MS` counts as getting nowhere. */
const STUCK_MOVE = 12;
/** Closer than this to its owner it is where it wants to be, not stuck. */
const NEAR_OWNER = 80;
/** Where each owned NPC last made headway, and when. */
const headway = new WeakMap<Npc, { x: number; y: number; at: number }>();

/** Has `npc` been trying to reach its owner and not moving for `STUCK_MS`? */
function isWedged(npc: Npc, owner: Player, now: number) {
  const last = headway.get(npc);
  const idle = !!npc.state.lockedPlayerId || !(npc.vx || npc.vy);
  const isClose = Math.hypot(npc.x - owner.x, npc.y - owner.y) <= NEAR_OWNER;
  if (idle || isClose || !last || Math.hypot(npc.x - last.x, npc.y - last.y) > STUCK_MOVE) {
    headway.set(npc, { x: npc.x, y: npc.y, at: now });
    return false;
  }
  return now - last.at >= STUCK_MS;
}

/** Least threat an owned NPC takes from its owner's fight, so even weak hits pull it in. */
const MIN_ASSIST_THREAT = 10;
/**
 * Owned NPCs draw this much more threat per point of damage than players, so they pull foes off
 * their owner the way a tank does, even ones that hit far softer than they do.
 */
const OWNED_THREAT_MULTIPLIER = 4;

/** The threat a hit of `amount` from `attackerId` is worth: more from an owned NPC. */
export function threatOfHit(world: ServerWorld, attackerId: string, amount: number) {
  return world.npcs[attackerId]?.state.ownerId ? amount * OWNED_THREAT_MULTIPLIER : amount;
}

/** Every NPC `ownerId` owns. */
function ownedBy(world: ServerWorld, ownerId: string): Npc[] {
  return Object.values(world.npcs).filter((npc) => npc.state.ownerId === ownerId);
}

/**
 * Any living NPC nobody owns yet can be taken, keepers included (an admin can). What a ball may
 * catch is `isCatchable`, on top of this.
 */
export const canOwn = (npc: Npc) => !npc.state.ownerId && !npc.state.isDead;

/**
 * Makes a fresh NPC belong to `owner`: it appears on them, stops picking fights, follows them and
 * fights for them.
 */
export function makeOwned(npc: Npc, owner: Player) {
  npc.state.ownerId = owner.socketId;
  npc.state.isResetting = false;
  /* It follows its owner (its leader now) instead of guarding a post, and only fights their fights */
  npc.behaviors = mergeBehaviors(npc.behaviors, { guard: false, fight: { starts: "whenHit" } });
  /* A swimmer follows its owner onto land; fliers keep flying */
  if (npc.habitat === "water") npc.habitat = "land";
  npc.threat = {};
  npc.setLockedPlayerId(null);
  /* Yours now, it no longer talks, sells or gives quests: a caught keeper is just a companion */
  npc.talks = false;
  npc.services = {};
  npc.talkingIds = [];
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
    .emit("assignDamage", [
      { type: "death", isCaught: true, amount: 0, from: npc.id, to: npc.id },
    ] as Hit[]);
}

/** Takes an NPC out of the world and off its room's screens. */
export function removeNpc(npc: Npc) {
  const { world } = npc;
  delete world.npcs[npc.id];
  world.netIds.release(npc.id);
  world.io.to(npc.room.name).emit("npcRemove", npc.id);
}

/**
 * Puts an NPC at `to`, or the nearest spot its body fits (a big body put in its owner's narrow
 * corridor would wedge again), telling both rooms when it changes room.
 */
function moveNpc(npc: Npc, room: RoomData, to: Point) {
  const { io } = npc.world;
  const from = npc.room.name;
  npc.room = room;
  npc.roomName = room.name;
  const spot = findOpenSpot(npc.movementMap(), to, npc.bodySize);
  npc.x = spot.x;
  npc.y = spot.y;
  npc.vx = 0;
  npc.vy = 0;
  if (from === room.name) return;
  io.to(from).emit("npcRemove", npc.id);
  io.to(room.name).emit("npcJoin", getPublicCharacterState(npc));
}

/**
 * Brings a player's owned NPCs to them right away, e.g. as they go through a door, so they are
 * in the room state the player loads instead of joining a scene that isn't ready yet.
 */
export function bringOwned(world: ServerWorld, owner: Player) {
  const room = owner.roomName ? world.rooms[owner.roomName] : undefined;
  if (!room) return;
  for (const npc of ownedBy(world, owner.socketId)) {
    if (!npc.state.isDead) moveNpc(npc, room, { x: owner.x, y: owner.y });
  }
}

/**
 * Keeps owned NPCs with their owners: one left behind (another room, or far away) appears on
 * its owner, and one whose owner left the game leaves with them, as does anything an admin
 * spawned (`/npc spawn`) once they leave. Runs before rooms are indexed.
 */
export const keepOwnedNear: System<ServerWorld> = (world) => {
  for (const npc of Object.values(world.npcs)) {
    const { spawnedBy } = npc.state;
    if (typeof spawnedBy === "string" && !world.players[spawnedBy]) {
      removeNpc(npc);
      continue;
    }
    if (!npc.state.ownerId) continue;
    const owner = world.players[npc.state.ownerId];
    if (!owner) {
      removeNpc(npc);
      continue;
    }
    const room = owner.roomName ? world.rooms[owner.roomName] : undefined;
    if (!room || npc.state.isDead) continue;
    if (npc.room.name !== room.name) {
      moveNpc(npc, room, { x: owner.x, y: owner.y });
    } else if (
      Math.hypot(npc.x - owner.x, npc.y - owner.y) > CATCH_UP_DISTANCE ||
      isWedged(npc, owner, world.now())
    ) {
      /* Same room: screens dissolve it out where it was and in beside its owner, not snap it */
      moveNpc(npc, room, { x: owner.x, y: owner.y });
      headway.delete(npc);
      const { x, y } = npc;
      world.events.emit("npcWarped", { npcId: npc.id, roomName: room.name, x, y, at: world.now() });
    }
  }
};

/**
 * Owned NPCs join their owner's fights: whoever the owner hurts, and whoever hurts the owner, gains
 * threat with each of the owner's NPCs in the room.
 */
export function subscribeOwnedNpcs(bus: GameEventBus, world: ServerWorld) {
  return bus.on("characterDamaged", ({ victimId, attackerId, amount }) => {
    const attacker = findCharacter(world, attackerId);
    const victim = findCharacter(world, victimId);
    if (!attacker || !victim || isAlly(world, attacker, victim)) return;
    const assist = (ownerId: string, foeId: string) => {
      for (const pet of ownedBy(world, ownerId)) {
        if (pet.room.name !== victim.room?.name) continue;
        /* At least enough to act on: a 1-damage hit's threat would fade before the next tick */
        pet.addThreat(foeId, Math.max(amount, MIN_ASSIST_THREAT));
      }
    };
    if (attacker.kind === "player") assist(attackerId, victimId);
    if (victim.kind === "player") assist(victimId, attackerId);
    /* A companion fights for its owner: its foe resents the owner too, so killing it isn't the end */
    const ownerId = world.npcs[attackerId]?.state.ownerId;
    if (ownerId && world.npcs[victimId]) {
      world.npcs[victimId].addThreat(ownerId, Math.max(amount, MIN_ASSIST_THREAT));
    }
  });
}
