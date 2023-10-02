import Loot from "./Loot";
import crypto from "crypto";
import { randomNumber } from "./utils";
import { ItemBuilder } from "../shared";

const LOOT_EXPIRE_TIME = 600000; //10min;
const LOOT_BUFFER_DELETE_TIME = 2000;
const LOOT_SPAWN_CYCLE_TIME = 300000; //5min;
interface CreateLoot {
  x: number;
  y: number;
  item: Item;
  npcId?: string;
  texture?: string;
  grabMessage?: boolean;
  isPermanent?: boolean;
}

function initiateMapLootList(tileMap) {
  const lootObjects = tileMap?.getObjectLayer("Loots")?.objects;
  if (!lootObjects) return [];

  return lootObjects?.reduce((acc, loot: Phaser.Types.Tilemaps.TiledObject) => {
    const items = JSON.parse(loot?.properties?.[0]?.value);
    acc.push({ id: loot?.id, x: loot?.x, y: loot?.y, items });
    return acc;
  }, []);
}

class LootManager {
  public scene: ServerScene;
  public room: Room;
  public mapLootList: Array<any>;
  public loots: Array<Loot>;
  public lastMapLootSpawn: number;
  constructor(scene: ServerScene, room: Room) {
    this.scene = scene;
    this.room = room;
    this.loots = [];
    this.lastMapLootSpawn = Date.now() - LOOT_SPAWN_CYCLE_TIME;
    this.mapLootList = initiateMapLootList(this.room.tileMap);
  }
  create(lootSpawn: CreateLoot) {
    const { x, y, item, npcId, texture, grabMessage = true, isPermanent } = lootSpawn ?? {};
    /* Optional npcId to to drop locally on an npc. */
    if (!x || !y || !item) return;
    const { scene, room } = this;
    const id = crypto.randomUUID();
    scene.loots[id] = new Loot({
      id,
      x,
      y,
      roomName: room?.name,
      item,
      texture,
      grabMessage,
      isPermanent,
    });
    this.loots.push(scene.loots[id]);
    this.scene.io.to(room?.name).emit("lootSpawned", { loot: scene.loots[id], npcId });
  }
  remove(id: string) {
    const foundIndex = this?.loots?.map((loot) => loot.id).indexOf(id);
    if (foundIndex > -1) this?.loots.splice(foundIndex, 1);
    if (this.scene.loots[id]) delete this.scene.loots[id];
  }
  expireLoots() {
    const now = Date.now();
    const { loots } = this;
    for (const loot of loots) {
      const isExpired = now - loot.dropTime > LOOT_EXPIRE_TIME;
      if (isExpired) {
        if (!loot?.expiredSince && !loot?.isPermanent) loot.expiredSince = now;
      }
      if (loot.expiredSince) {
        // give the loot update bit of time to hit all users before we wipe it from the server
        if (now - loot.expiredSince > LOOT_BUFFER_DELETE_TIME) {
          this.remove(loot?.id);
        }
      }
    }
  }
  spawnMapLoots() {
    const now = Date.now();
    const readyToSpawn = now - this.lastMapLootSpawn > LOOT_SPAWN_CYCLE_TIME;
    // skip if we aren't ready to spawn on this map yet
    if (!readyToSpawn) return;
    this.lastMapLootSpawn = now;
    for (const mapLoot of this.mapLootList) {
      // do not spawn if there is already a perm loot here
      if (this.loots.find((l) => l?.x === mapLoot.x && l?.y === mapLoot.y && l?.isPermanent)) {
        continue;
      }

      // turn the arrays to items, pick which to spawn
      const mapItems = mapLoot?.items;
      let runners = [];
      for (const mapItem of mapItems) {
        if (randomNumber(1, mapItem.chance) === 1) {
          // decide how many to spawn randomly.
          const amount = randomNumber(mapItem?.amount?.[0], mapItem?.amount?.[1]);
          const item = ItemBuilder.buildItem(mapItem?.type, mapItem?.rarity, mapItem?.key, amount);
          runners.push(item);
        }
      }

      let item = null;
      for (const runner of runners) {
        item = runner;
        /* Preferences */
        if (runner.rarity == "unique") break;
        if (runner.rarity == "set") break;
        if (runner.rarity == "rare") break;
        if (runner.rarity == "magic") break;
        if (runner.type !== "stackable") break;
      }

      if (item) {
        /* TODO: Send all at once instead of many updates */
        this.create({
          x: mapLoot?.x,
          y: mapLoot?.y,
          texture: "loot-anim-sparkle",
          isPermanent: true,
          item,
        });
      }
    }
  }
}

export default LootManager;
