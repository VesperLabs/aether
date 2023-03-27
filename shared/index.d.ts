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

interface Slot {
  item: Item;
  slotName: string;
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

interface ServerScene extends Phaser.Scene {
  doors: Record<string, Door>;
  loots: Record<string, Loot>;
  npcs: Record<string, Npc>;
  players: Record<string, Player>;
  roomManager: RoomManager;
  spells: any;
  db: any;
  io: any;
}

interface Coordinate {
  x: number;
  y: number;
}

interface RoomManager {
  scene: ServerScene;
  rooms: Record<string, Room>;
}

interface Room {
  scene: ServerScene;
  name: string;
  tileMap: Phaser.Tilemaps.Tilemap;
  collideLayer: Phaser.Tilemaps.TilemapLayer;
  doors: Phaser.Physics.Arcade.Group;
  colliders: Array<any>;
}

interface Hit {
  type: string;
  isCritical: boolean;
  amount: number;
  from: string;
  to: string;
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
  equipment: Record<string, Item>;
  inventory: any;
  baseStats: any;
  stats: any;
  calculateStats(): void;
  calculateDamage(victim: Character | CharacterState): Hit;
  modifyStat(key: string, amount: number);
  setDead();
}

interface KeeperData {
  dialogues?: any;
  quests?: any;
  shop?: any;
}

interface Npc extends Character {
  drops: Array<Drop>;
  talkingIds: Array<string>;
  keeperData: KeeperData;
  setDead(): void;
}

interface Player extends Character {
  email: string;
  findEquipmentById(id: string): Slot;
  clearEquipmentSlot(id: string): void;
  subtractInventoryItemAtId(id: string, amount: integer);
  findInventoryItemById(id: string);
  deleteInventoryItemAtId(id: string);
  addInventoryItem(item: Item): void;
  setDead(): void;
  isInventoryFull(): boolean;
}

interface MapAsset {
  name: string;
  json: string;
}

interface Spell {
  id: string;
}

interface TrimmedCharacterState {
  id: string;
  socketId: string;
  roomName: string;
  direction: string;
  state: any;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface TrimmedRoomState {
  players: Array<TrimmedCharacterState>;
  npcs: Array<TrimmedCharacterState>;
  spells: Array<Spell>;
  loots: Array<Loot>;
}

interface CharacterState {
  id: string;
  socketId: string;
  roomName: string;
  direction: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  stats: any;
  state: any;
  equipment: Record<string, Item>;
  inventory: any;
  profile: any;
  kind: string;
  gold: integer;
}

interface RoomState {
  players: Array<CharacterState>;
  npcs: Array<CharacterState>;
  spells: Array<Spell>;
  loots: Array<Loot>;
}
