import Loot from "./Loot";
import crypto from "crypto";
class LootManager {
  public scene: Scene;
  public room: Room;
  private lootExpireTime: number;
  public loots: Array<Loot>;
  constructor(scene: Scene, room: Room) {
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
  remove(id: string) {
    const foundIndex = this?.loots?.map((loot) => loot.id).indexOf(id);
    if (foundIndex) this?.loots.splice(foundIndex, 1);
    if (this.scene.loots[id]) delete this.scene.loots[id];
  }
  expireLoots() {
    const now = Date.now();
    const { loots, lootExpireTime } = this;
    for (var i = 0; i < loots.length; i++) {
      if (now - loots[i].dropTime > lootExpireTime) {
        const loot = loots[i];
        this.remove(loot?.id);
      }
    }
  }
}

export default LootManager;
