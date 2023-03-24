interface Item {
  id: string;
  key: string;
  ilvl: number;
  rarity: string;
  stats?: Record<string, number>;
  name: string;
  base: string;
  slot: string;
  texture: string;
  tint?: string;
  attackTint?: string;
  amount?: number;
  type?: string;
  requirements?: Record<string, number>;
  cost?: number;
  effects?: Record<string, any>;
  percentStats?: Record<string, number>;
  setName?: string;
  setBonus?: Record<string, number>;
}

interface Loot {
  id: string;
  roomName: string;
  x: number;
  y: number;
  item: Item;
  dropTime: number;
}

interface Door extends Phaser.Types.Tilemaps.TiledObject {}

interface Scene extends Phaser.Scene {
  doors: Array<Door>;
}

interface Coordinate {
  x: number;
  y: number;
}
