import Loot from "./Loot.js";
import crypto from "crypto";
class LootManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.lootExpireTime = 300000; //5min;
    this.loots = [];
  }
  create({ x, y, item, npcId }) {
    /* Optional npcId to to drop locally on an npc. */
    if (!x || !y || !item) return;
    const { scene, room } = this;
    const id = crypto.randomUUID();
    scene.loots[id] = new Loot({ id, x, y, roomName: room?.name, item });
    this.loots.push(scene.loots[id]);
    this.scene.io.to(room?.name).emit("lootSpawned", { loot: scene.loots[id], npcId });
  }
  expireLoots() {
    const now = Date.now();
    const { loots, lootExpireTime, scene } = this;
    for (var i = 0; i < loots.length; i++) {
      if (now - loots[i].dropTime > lootExpireTime) {
        const loot = loots[i];
        if (loots[i]) loots.splice(i, 1);
        if (scene.loots[loot?.id]) delete scene.loots[loot?.id];
      }
    }
  }
  remove(id) {
    const { scene, room } = this;
    room.removeLoot(scene.loots[id]);
  }
}

export default LootManager;
