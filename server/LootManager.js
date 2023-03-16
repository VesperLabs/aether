import Loot from "./Loot.js";
import ItemBuilder from "./ItemBuilder.js";

class LootManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.loots = [];
  }
  spawnLoot({ x, y, item }) {
    if (!x || !y || !item) return;
    const loot = new Loot({ x, y, item });
    this.loots.push(loot);
    this.scene.io.to(this?.room?.name).emit("lootSpawned", loot);
  }
  expireLoots() {
    const now = Date.now();
    const expiredLoots = [];
    for (const loot of this.loots) {
      if (now - loot.dropTime > this.lootExpireTime) {
        expiredLoots.push(loot);
        this.loots.splice(i, 1);
      }
    }
    return expiredLoots;
  }
  deleteLootAtId(id) {
    for (const loot of this.loots) {
      if (loot?.id == id) {
        this.loots.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  getAllLoots() {
    return this.loots;
  }
}

export default LootManager;
