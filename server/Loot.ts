import crypto from "crypto";

class Loot implements Loot {
  id: string;
  roomName: string;
  x: number;
  y: number;
  item: Item;
  dropTime: number;
  expiredSince?: number;
  texture?: string;

  constructor(loot?: {
    id?: string;
    roomName: string;
    x: number;
    y: number;
    item: Item;
    texture?: string; //custom texture for how it shows on map
  }) {
    this.id = loot?.id || crypto.randomUUID();
    this.roomName = loot?.roomName;
    this.x = loot.x;
    this.y = loot.y;
    this.item = loot.item;
    this.dropTime = Date.now();
    this.texture = loot?.texture;
  }
}

export default Loot;
