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
  mpCost?: number;
  effects?: Record<string, any>;
  percentStats?: Record<string, number>;
  setName?: string;
  setBonus?: Record<string, number>;
}

interface Message {
  from?: string;
  type: "chat" | "warning" | "error";
  message: string;
}

interface Slot {
  item: Item;
  slotName: string;
}

interface BuildItem extends Array<any> {
  0?: string;
  1?: string;
  2?: string;
  3?: number;
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
  npcs: Record<string, Character>;
  quests: Record<string, Quest>;
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
  spellManager: any;
  playerManager: any;
  npcManager: any;
  lootManager: any;
  findPath(startCoords: Coordinate, targetCoords: Coordinate);
}

interface Hit {
  type: string;
  isCritical: boolean;
  amount: number;
  from: string;
  to: string;
}

interface Character extends Phaser.GameObjects.Container {
  startingCoords?: Coordinate;
  socketId?: string;
  id?: string;
  isHero: boolean;
  roomName: string;
  charClass?: CharClass;
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
  quests: Array<PlayerQuest>;
  abilities: Record<number, Item>;
  activeItemSlots: Array<string>;
  calculateDamage(victim: any);
  calculateSpellDamage(victim: any, abilitySlot: any);
  calculateActiveItemSlots(): void;
  calculateStats(): void;
  modifyStat(key: string, amount: number);
  assignExp(amount: integer): boolean;
  setDead();
  getPlayerQuestStatus(quest: Quest): PlayerQuest | null;
  getQuests(): Array<PlayerQuest>;
  canCastSpell(abilitySlot: number): boolean;
}

type CharClass = "warrior" | "rogue" | "mage" | "cleric";

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
  dropLoot(magicFind: number): void;
}

interface Player extends Character {
  email?: string;
  addQuest(quest: Quest): void;
  completeQuest(quest: Quest): any;
  findEquipmentById(id: string): Slot;
  findAbilityById(id: string): Slot;
  clearEquipmentSlot(id: string): void;
  clearAbilitySlot(id: string): void;
  subtractInventoryItemAtId(id: string, amount: integer);
  findInventoryItemById(id: string);
  deleteInventoryItemAtId(id: string);
  addInventoryItem(item: Item): void;
  setDead(): void;
  isInventoryFull(): boolean;
  addNpcKill(npc: Npc): void;
}

interface MapAsset {
  name: string;
  json: string;
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

interface Spell {
  id: string;
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
  abilities: Record<number, Item>;
  profile: any;
  kind: string;
  charClass: CharClass;
  npcKills: Record<string, integer>;
  quests: Array<PlayerQuest>;
  activeItemSlots: Array<string>;
  gold: integer;
}

interface RoomState {
  players: Array<CharacterState>;
  npcs: Array<CharacterState>;
  spells: Array<Spell>;
  loots: Array<Loot>;
}

interface Quest {
  id: string;
  name: string;
  dialogues: any;
  rewards: Record<string, any>;
  objectives: Array<QuestObjective>;
}

interface QuestObjective {
  id: string;
  questId: string;
  type: string;
  target: Array<string> | string;
  amount: integer;
}
interface PlayerQuest {
  questId: string;
  isCompleted?: boolean;
  isReady?: boolean;
  rewards?: Record<string, any>;
  objectives?: Array<PlayerQuestObjective>;
}

interface PlayerQuestObjective {
  objectiveId: string;
  questId: string;
  isReady?: boolean;
}
