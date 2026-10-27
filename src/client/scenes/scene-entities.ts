import { Player } from "@/client/views/player";
import type { CharacterArgs } from "@/client/views/character";
import { LootItem } from "@/client/views/loot-item";
import type { FullCharacterWire, LootMessage } from "@/network";
import type { SceneMain } from "./main-scene";

export function addPlayer(scene: SceneMain, user: CharacterArgs) {
  const player = new Player(scene, user);
  scene.add.existing(player);
  scene.players.add(player);
  return player;
}

export function removePlayer(scene: SceneMain, socketId: string) {
  if (!scene.players) return;
  const player = getPlayer(scene, socketId);
  player?.destroy();
}

export function resetEntities(scene: SceneMain) {
  scene?.map?.destroy?.();
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

export function getPlayers(scene: SceneMain) {
  return (scene.players?.getChildren() ?? []) as Player[];
}

export function getNpcs(scene: SceneMain) {
  return (scene.npcs?.getChildren() ?? []) as Player[];
}

export function getPlayer(scene: SceneMain, socketId: string | undefined) {
  if (!scene.players) return;
  return getPlayers(scene).find((player) => socketId === player.socketId);
}

export function getNpc(scene: SceneMain, id: string | null | undefined) {
  if (!scene.npcs) return;
  return getNpcs(scene).find((npc) => id === npc.id);
}

export function getLoot(scene: SceneMain, id: string) {
  if (!scene.loots) return;
  return (scene.loots.getChildren() as LootItem[]).find((loot) => id === loot.id);
}

export function addLoot(scene: SceneMain, lootData: LootMessage) {
  const loot = new LootItem(scene, lootData);
  scene.add.existing(loot);
  scene.loots.add(loot);
  return loot;
}

export function addNpc(scene: SceneMain, npcData: FullCharacterWire) {
  const npc = new Player(scene, npcData);
  scene.add.existing(npc);
  scene.npcs.add(npc);
  return npc;
}
