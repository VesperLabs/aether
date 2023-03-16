import crypto from "crypto";
class Loot {
  constructor(loot) {
    this.id = loot?.id || crypto.randomUUID();
    this.roomName = loot?.roomName;
    this.x = loot.x;
    this.y = loot.y;
    this.item = loot.item;
    this.dropTime = Date.now();
  }
}

export default Loot;
