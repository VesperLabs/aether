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
  grabMessage?: boolean;
  isPermanent?: boolean;

  constructor(loot?: {
    id?: string;
    roomName: string;
    x: number;
    y: number;
    item: Item;
    texture?: string; //custom texture for how it shows on map
    grabMessage?: boolean;
    isPermanent?: boolean;
  }) {
    this.id = loot?.id || crypto.randomUUID();
    this.roomName = loot?.roomName;
    this.x = loot.x;
    this.y = loot.y;
    this.item = loot.item;
    this.dropTime = new Date().getTime();
    this.texture = loot?.texture;
    this.grabMessage = loot?.grabMessage;
    this.isPermanent = loot?.isPermanent;
  }
}

export default Loot;
