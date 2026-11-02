import type { ServerWorld } from "./server-world";
import { moveBodyFreely, moveBodyThroughMap } from "@/rules/movement";
import type { Frame, System } from "@/rules/world";
import { encodeRoomPoses, takeChangedStatuses } from "@/network";
import { getBuffRoomState } from "@/server/net/room-sync";
import { updateRoomLoot } from "./loot-adapter";
import { expireSpells } from "./spell-adapter";
import { indexRooms } from "./room-index";

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
  for (const room of Object.values(world.rooms)) {
    /* Simulate first so what is sent matches what clients see on the next frame (loot expiry, spawns). */
    updateRoomLoot(world, room);
    expireSpells(world, room);

    const roomClients = io.sockets.adapter.rooms.get(room.name)?.size ?? 0;
    if (roomClients === 0) {
      /* Whoever joins next gets everything in heroInit, so start the statuses over. */
      room.sentStatuses.clear();
      continue;
    }

    const hasBuffChanges = [...Object.values(world.players), ...Object.values(world.npcs)].some(
      (n: { room?: { name?: string } | null; state?: { hasBuffChanges?: boolean } }) =>
        n?.room?.name === room.name && n?.state?.hasBuffChanges,
    );
    if (hasBuffChanges) io.to(room.name).emit("buffUpdate", getBuffRoomState(world, room.name));

    io.to(room.name).emit("poses", encodeRoomPoses(world, room.name, now));
    const statuses = takeChangedStatuses(world, room.name, room.sentStatuses);
    if (statuses) io.to(room.name).emit("statuses", statuses);
  }
};

/** Remembers where every character stood this tick, for judging later hits by what attackers saw. */
const recordPoses: System<ServerWorld> = (world) => {
  const now = world.now();
  for (const room of Object.values(world.rooms)) {
    const here = (c: { room?: { name?: string } | null }) => c.room?.name === room.name;
    room.poseHistory.record(now, [
      ...Object.values(world.players).filter(here),
      ...Object.values(world.npcs).filter(here),
    ]);
  }
};

/** The systems the server runs every tick, in order. */
export const serverSystems: Array<System<ServerWorld>> = [
  moveNpcs,
  moveSpells,
  indexRooms,
  updateEntities,
  recordPoses,
  updateRooms,
];
