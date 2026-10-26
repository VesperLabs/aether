import crypto from "crypto";
import { ItemBuilder } from "@/shared/content";
import {
  createLoot,
  expireLoots,
  isMapLootDue,
  parseMapLootList,
  planMapLootSpawns,
  LOOT_SPAWN_CYCLE_TIME,
} from "@/shared/rules/loot";
import type { LootItem, LootSpawn, MapLoot } from "@/shared/rules/loot";

/**
 * Legacy adapter for the loot rules: keeps the loot on the ServerScene (`scene.loots`) and applies
 * what the rules decide. Delete in Phase 4 when the world holds plain data.
 */

/** Per-room loot bookkeeping, stored on the Room. */
export interface RoomLootState {
  mapLootList: MapLoot[];
  lastMapLootSpawn: number;
}

export function createRoomLootState(room: Room): RoomLootState {
  return {
    mapLootList: parseMapLootList(room.tileMap?.getObjectLayer("Loots")?.objects as any),
    lastMapLootSpawn: Date.now() - LOOT_SPAWN_CYCLE_TIME,
  };
}

export function lootInRoom(scene: ServerScene, roomName: string): Loot[] {
  return Object.values(scene.loots).filter((loot) => loot.roomName === roomName);
}

/** Puts a drop on the ground and tells the room. */
export function spawnLoot(scene: ServerScene, roomName: string, spawn: LootSpawn) {
  const loot = createLoot(spawn, { id: crypto.randomUUID(), roomName, now: Date.now() });
  if (!loot) return;
  scene.loots[loot.id] = loot as unknown as Loot;
  scene.io.to(roomName).emit("lootSpawned", { loot, npcId: spawn.npcId });
}

export function removeLoot(scene: ServerScene, id: string) {
  delete scene.loots[id];
}

/** Runs once per tick for a room: respawns map loot and expires old loot. */
export function updateRoomLoot(scene: ServerScene, room: Room) {
  const now = Date.now();
  const state: RoomLootState = room.lootState;
  if (isMapLootDue(now, state.lastMapLootSpawn)) {
    state.lastMapLootSpawn = now;
    const spawns = planMapLootSpawns(
      state.mapLootList,
      lootInRoom(scene, room.name),
      Math.random,
      (type, rarity, key, amount) =>
        ItemBuilder.buildItem(type, rarity, key, amount) as LootItem | null,
    );
    for (const spawn of spawns) spawnLoot(scene, room.name, spawn);
  }
  const { markExpired, remove } = expireLoots(lootInRoom(scene, room.name), now);
  for (const id of markExpired) scene.loots[id].expiredSince = now;
  for (const id of remove) removeLoot(scene, id);
}
