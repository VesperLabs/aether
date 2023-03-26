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

interface Drop {
  type: string;
  rarity: string;
  key: string;
  chance: integer;
}

interface Door extends Phaser.Types.Tilemaps.TiledObject {}

interface Scene extends Phaser.Scene {
  doors: Record<string, Door>;
  loots: Record<string, Loot>;
  npcs: Record<string, Npc>;
  players: Record<string, Player>;
  io: any;
}

interface Coordinate {
  x: number;
  y: number;
}

interface Room {
  scene: Scene;
  name: string;
  tileMap: Phaser.Tilemaps.Tilemap;
  collideLayer: Phaser.Tilemaps.TilemapLayer;
  doors: Phaser.Physics.Arcade.Group;
  colliders: Array<any>;
}

interface Character extends Phaser.GameObjects.Sprite {
  startingCoords: Coordinate;
  socketId: string;
  id: string;
  isHero: boolean;
  roomName: string;
  room: Room;
  action: string;
  direction: string;
  currentSpeed: number;
  nextPath: Coordinate;
  body: Phaser.Physics.Arcade.Body;
  vx: any;
  vy: any;
  kind: any;
  state: any;
  gold: any;
  profile: any;
  equipment: any;
  inventory: any;
  baseStats: any;
  stats: any;
}

interface KeeperData {
  dialogues?: any;
  quests?: any;
  shop?: any;
}

interface Npc extends Character {
  drops: Array<Drop>;
  talkingIds: Array<string>;
}

interface Player extends Character {}
