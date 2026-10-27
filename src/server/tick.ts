import type { ServerWorld } from "./server-world";
import { moveBodyFreely, moveBodyThroughMap } from "@/rules/movement";
import type { Frame, System } from "@/rules/world";
import {
  createDeltaSnapshot,
  createSnapshot,
  compactTickDeltaForWire,
  compactTickState,
  diffTickStates,
  type TickStateExpanded,
} from "@/network";
import { SNAPSHOT_KEYFRAME_INTERVAL } from "@/network";
import { getBuffRoomState, getTickRoomState } from "@/server/net/room-sync";
import { updateRoomLoot } from "./loot-adapter";
import { expireSpells } from "./spell-adapter";

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
const updateEntities: System<ServerWorld> = (world, { time, delta }) => {
  for (const player of Object.values(world.players)) player.update?.(time, delta);
  for (const npc of Object.values(world.npcs)) npc.update?.(time, delta);
  for (const spell of Object.values(world.spells)) spell.update();
};

/** Loot, finished spells, and sending each room's state to the clients in it. */
const updateRooms: System<ServerWorld> = (world: ServerWorld, _frame: Frame) => {
  const { io } = world;
  for (const room of Object.values(world.rooms)) {
    /* Simulate first so snapshots match what clients see on the next frame (loot expiry, spawns). */
    updateRoomLoot(world, room);
    expireSpells(world, room);

    room.snapshotSeq += 1;

    const roomClients = io.sockets.adapter.rooms.get(room.name)?.size ?? 0;

    const hasBuffChanges = [...Object.values(world.players), ...Object.values(world.npcs)].some(
      (n: { room?: { name?: string } | null; state?: { hasBuffChanges?: boolean } }) =>
        n?.room?.name === room.name && n?.state?.hasBuffChanges,
    );
    if (hasBuffChanges && roomClients > 0) {
      io.to(room.name).emit("buffUpdate", getBuffRoomState(world, room.name));
    }

    if (roomClients === 0) {
      room.lastEmittedSnapshot = null;
      continue;
    }

    const expanded = getTickRoomState(world, room.name);

    const isKeyframe =
      room.snapshotSeq % SNAPSHOT_KEYFRAME_INTERVAL === 0 || room.lastEmittedSnapshot === null;

    if (isKeyframe) {
      const snapshot = createSnapshot(compactTickState(expanded), room.snapshotSeq);
      room.lastEmittedSnapshot = structuredClone(expanded);
      io.to(room.name).emit("update", snapshot);
      continue;
    }

    const { delta, rm, isEmpty } = diffTickStates(
      room.lastEmittedSnapshot as TickStateExpanded,
      expanded,
    );
    if (isEmpty) continue;
    room.lastEmittedSnapshot = structuredClone(expanded);
    const snap = createDeltaSnapshot(compactTickDeltaForWire(delta), rm, room.snapshotSeq);
    io.to(room.name).emit("update", snap);
  }
};

/** The systems the server runs every tick, in order. */
export const serverSystems: Array<System<ServerWorld>> = [
  moveNpcs,
  moveSpells,
  updateEntities,
  updateRooms,
];
