import type { ServerWorld } from "./server-world";
import crypto from "crypto";
import { ItemBuilder } from "@/shared/content";
import { createLoot, expireLoots, isMapLootDue, planMapLootSpawns } from "@/shared/rules/loot";
import type { LootItem, LootSpawn } from "@/shared/rules/loot";

/**
 * Legacy adapter for the loot rules: keeps the loot on the ServerWorld (`world.loots`) and applies
 * what the rules decide. Delete in Phase 4 when the world holds plain data.
 */

export function lootInRoom(world: ServerWorld, roomName: string): Loot[] {
  return Object.values(world.loots).filter((loot) => loot.roomName === roomName);
}

/** Puts a drop on the ground and tells the room. */
export function spawnLoot(world: ServerWorld, roomName: string, spawn: LootSpawn) {
  const loot = createLoot(spawn, { id: crypto.randomUUID(), roomName, now: Date.now() });
  if (!loot) return;
  world.loots[loot.id] = loot as unknown as Loot;
  world.io.to(roomName).emit("lootSpawned", { loot, npcId: spawn.npcId });
}

export function removeLoot(world: ServerWorld, id: string) {
  delete world.loots[id];
}

/** Runs once per tick for a room: respawns map loot and expires old loot. */
export function updateRoomLoot(world: ServerWorld, room: Room) {
  const now = Date.now();
  const state = room.lootState;
  if (isMapLootDue(now, state.lastMapLootSpawn)) {
    state.lastMapLootSpawn = now;
    const spawns = planMapLootSpawns(
      state.mapLootList,
      lootInRoom(world, room.name),
      Math.random,
      (type, rarity, key, amount) =>
        ItemBuilder.buildItem(type, rarity, key, amount) as LootItem | null,
    );
    for (const spawn of spawns) spawnLoot(world, room.name, spawn);
  }
  const { markExpired, remove } = expireLoots(lootInRoom(world, room.name), now);
  for (const id of markExpired) world.loots[id].expiredSince = now;
  for (const id of remove) removeLoot(world, id);
}
