import crypto from "crypto";

class Loot {
  id: string;
  roomName?: string;
  x: number;
  y: number;
  item: Item;
  dropTime: number;

  constructor(loot?: { id?: string; roomName?: string; x: number; y: number; item: Item }) {
    this.id = loot?.id || crypto.randomUUID();
    this.roomName = loot?.roomName;
    this.x = loot.x;
    this.y = loot.y;
    this.item = loot.item;
    this.dropTime = Date.now();
  }
}

export default Loot;
