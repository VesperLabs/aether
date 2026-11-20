import type Phaser from "phaser";
import { Player } from "@/client/views/player";
import type { CharacterArgs } from "@/client/views/character";
import { LootItem } from "@/client/views/loot-item";
import type { FullCharacterWire, LootMessage } from "@/network";
import type { SceneMain } from "./main-scene";
import { rememberNetId } from "@/client/net/net-ids";

export function addPlayer(scene: SceneMain, user: CharacterArgs) {
  rememberNetId(user);
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
  scene.physics.world.colliders.destroy();
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

type Group = Phaser.Physics.Arcade.Group;
type IdKey = "socketId" | "id";

/** Each group's characters by id, so a lookup is not a search: poses look up every character every frame. */
const indexes = new WeakMap<Group, Map<string, Player>>();

/** The character in `group` whose `key` is `id`. The index is rebuilt only when it is out of date. */
function lookUp(group: Group, key: IdKey, id: string) {
  const found = indexes.get(group)?.get(id);
  if (found?.active && found[key] === id && group.contains(found)) return found;
  const index = new Map<string, Player>();
  for (const child of group.getChildren() as Player[]) {
    const childId = child[key];
    if (childId) index.set(childId, child);
  }
  indexes.set(group, index);
  return index.get(id);
}

export function getPlayer(scene: SceneMain, socketId: string | undefined) {
  if (!scene.players || !socketId) return;
  return lookUp(scene.players, "socketId", socketId);
}

export function getNpc(scene: SceneMain, id: string | null | undefined) {
  if (!scene.npcs || !id) return;
  return lookUp(scene.npcs, "id", id);
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
  rememberNetId(npcData);
  const npc = new Player(scene, npcData);
  scene.add.existing(npc);
  scene.npcs.add(npc);
  return npc;
}
