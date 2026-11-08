import type { ServerWorld } from "./server-world";
import {
  MAX_PUSH_SPEED,
  getSeparationPush,
  moveBodyFreely,
  moveBodyThroughMap,
  nudgeBodyThroughMap,
} from "@/rules/movement";
import { groupByRoom, type Frame, type System } from "@/rules/world";
import { encodeRoomPoses, takeChangedStatuses } from "@/network";
import { getBuffRoomState } from "@/server/net/room-sync";
import { updateRoomLoot } from "./loot-adapter";
import { expireSpells } from "./spell-adapter";
import { countRoomClients, getRoomIndex, indexRooms } from "./room-index";
import { keepCompanionsNear } from "./companions";
import { endTickTimer, startTickTimer } from "./tick-health";

/** A long stall (debugger, GC) must not teleport things across the map. */
const MAX_STEP_MS = 100;

/** Moves NPCs along their velocity, stopped by the walls and the map edge. */
const moveNpcs: System<ServerWorld> = (world, { delta }) => {
  const seconds = Math.min(delta, MAX_STEP_MS) / 1000;
  for (const npc of Object.values(world.npcs)) {
    if (!npc.room || npc.state?.isDead) continue;
    moveBodyThroughMap(npc.room.map, npc, seconds);
  }
};

/** How far around an NPC to look for bodies it overlaps: two body radii, with room to spare. */
const SEPARATION_RANGE = 24;

/** Eases overlapping NPCs apart, and out from under players. Players are never pushed: the client owns their movement. */
const separateNpcs: System<ServerWorld> = (world, { delta }) => {
  const maxPush = (MAX_PUSH_SPEED * Math.min(delta, MAX_STEP_MS)) / 1000;
  for (const npc of Object.values(world.npcs)) {
    if (!npc.room || npc.state?.isDead) continue;
    const index = getRoomIndex(world, npc.room.name);
    const npcs = index.npcs.near(npc, SEPARATION_RANGE);
    const players = index.players
      .near(npc, SEPARATION_RANGE)
      .map((player) => ({ id: player.id, x: player.x, y: player.y, isFixed: true }));
    const push = getSeparationPush(npc, [...npcs, ...players], undefined, maxPush);
    if (push.x || push.y) nudgeBodyThroughMap(npc.room.map, npc, push);
  }
};

/** Flies spells along their velocity. They ignore walls. */
const moveSpells: System<ServerWorld> = (world, { delta }) => {
  const seconds = Math.min(delta, MAX_STEP_MS) / 1000;
  for (const spell of Object.values(world.spells)) {
    if (spell.stickToCaster || spell.state.isExpired) continue;
    moveBodyFreely(spell, { x: spell.velocityX, y: spell.velocityY }, seconds);
  }
};

/** Runs the per-tick logic of every player, NPC and spell (AI, regen, buffs, collisions). */
const updateEntities: System<ServerWorld> = (world, { time, delta, now }) => {
  for (const player of Object.values(world.players)) player.update?.(time, delta);
  for (const npc of Object.values(world.npcs)) npc.update?.(time, delta, now);
  for (const spell of Object.values(world.spells)) spell.update();
};

/** Loot, finished spells, and sending each room's poses and changed statuses to the clients in it. */
const updateRooms: System<ServerWorld> = (world: ServerWorld, { now }: Frame) => {
  const { io } = world;
  /* One pass over everyone, not one per room */
  const roomsWithBuffChanges = new Set<string>();
  for (const c of [...Object.values(world.players), ...Object.values(world.npcs)]) {
    if (c?.state?.hasBuffChanges && c.room?.name) roomsWithBuffChanges.add(c.room.name);
  }
  for (const room of Object.values(world.rooms)) {
    /* Simulate first so what is sent matches what clients see on the next frame (loot expiry, spawns). */
    updateRoomLoot(world, room);
    expireSpells(world, room);

    if (countRoomClients(world, room.name) === 0) {
      /* Whoever joins next gets everything in heroInit, so start the statuses over. */
      room.sentStatuses.clear();
      continue;
    }

    if (roomsWithBuffChanges.has(room.name))
      io.to(room.name).emit("buffUpdate", getBuffRoomState(world, room.name));

    io.to(room.name).emit("poses", encodeRoomPoses(world, room.name, now));
    const statuses = takeChangedStatuses(world, room.name, room.sentStatuses);
    if (statuses) io.to(room.name).emit("statuses", statuses);
  }
};

/** Remembers where every character stood this tick, for judging later hits by what attackers saw. */
const recordPoses: System<ServerWorld> = (world) => {
  const now = world.now();
  const roomNames = Object.keys(world.rooms);
  const players = groupByRoom(world.players, roomNames);
  const npcs = groupByRoom(world.npcs, roomNames);
  for (const room of Object.values(world.rooms)) {
    room.poseHistory.record(now, [...players[room.name], ...npcs[room.name]]);
  }
};

/** The systems the server runs every tick, in order. */
export const serverSystems: Array<System<ServerWorld>> = [
  startTickTimer,
  moveNpcs,
  moveSpells,
  keepCompanionsNear,
  indexRooms,
  separateNpcs,
  updateEntities,
  recordPoses,
  updateRooms,
  endTickTimer,
];
