import type { ServerWorld } from "@/server/world/server-world";
import { ItemBuilder } from "@/content";
import { createLoot, expireLoots, isMapLootDue, planMapLootSpawns } from "@/rules/loot";
import type { LootItem, LootSpawn } from "@/rules/loot";

/**
 * Legacy adapter for the loot rules: keeps the loot on the ServerWorld (`world.loots`) and applies
 * what the rules decide. Delete in Phase 4 when the world holds plain data.
 */

function lootInRoom(world: ServerWorld, roomName: string): Loot[] {
  return Object.values(world.loots).filter((loot) => loot.roomName === roomName);
}

/** Puts a drop on the ground and tells the room. */
export function spawnLoot(world: ServerWorld, roomName: string, spawn: LootSpawn) {
  const loot = createLoot(spawn, { id: world.dice.newId(), roomName, now: world.now() });
  if (!loot) return;
  // The rules type the item loosely; the spawner always hands it a built item.
  const placed = loot as unknown as Loot;
  world.loots[loot.id] = placed;
  world.io.to(roomName).emit("lootSpawned", { loot: placed, npcId: spawn.npcId });
}

export function removeLoot(world: ServerWorld, id: string) {
  delete world.loots[id];
}

/** Runs once per tick for a room: respawns map loot and expires old loot. */
export function updateRoomLoot(world: ServerWorld, room: Room) {
  const now = world.now();
  const state = room.lootState;
  if (isMapLootDue(now, state.lastMapLootSpawn)) {
    state.lastMapLootSpawn = now;
    const spawns = planMapLootSpawns(
      state.mapLootList,
      lootInRoom(world, room.name),
      world.rng,
      (type, rarity, key, amount) =>
        ItemBuilder.buildItem(world.dice, type, rarity, key, amount) as LootItem | null,
    );
    for (const spawn of spawns) spawnLoot(world, room.name, spawn);
  }
  const { markExpired, remove } = expireLoots(lootInRoom(world, room.name), now);
  for (const id of markExpired) {
    world.loots[id].expiredSince = now;
    world.io.to(room.name).emit("lootExpired", id);
  }
  for (const id of remove) removeLoot(world, id);
}
