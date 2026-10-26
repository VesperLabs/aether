import { Player } from "@/client/views/player";
import { LootItem } from "@/client/views/loot-item";

export function addPlayer(scene, user) {
  const player = new Player(scene, user);
  scene.add.existing(player);
  scene.players.add(player);
  return player;
}

export function removePlayer(scene, socketId) {
  if (!scene.players) return;
  const player = getPlayer(scene, socketId);
  player?.destroy(true);
}

export function resetEntities(scene) {
  scene?.map?.destroy?.(true);
  scene?.players?.destroy?.(true);
  scene?.npcs?.destroy?.(true);
  scene?.loots?.destroy?.(true);
  scene?.doors?.destroy?.(true);
  scene?.signs?.destroy?.(true);
  scene.players = scene.physics.add.group();
  scene.npcs = scene.physics.add.group();
  scene.loots = scene.physics.add.group();
  scene.doors = scene.physics.add.staticGroup();
  scene.signs = scene.physics.add.staticGroup();
}

export function getPlayer(scene, socketId) {
  if (!scene.players) return;
  return scene.players.getChildren().find((player) => socketId === player.socketId);
}

export function getNpc(scene, id) {
  if (!scene.npcs) return;
  return scene.npcs.getChildren().find((npc) => id === npc.id);
}

export function getLoot(scene, id) {
  if (!scene.loots) return;
  return scene.loots.getChildren().find((loot) => id === loot.id);
}

export function addLoot(scene, lootData) {
  const loot = new LootItem(scene, lootData);
  scene.add.existing(loot);
  scene.loots.add(loot);
  return loot;
}

export function addNpc(scene, npcData) {
  const npc = new Player(scene, npcData);
  scene.add.existing(npc);
  scene.npcs.add(npc);
  return npc;
}
