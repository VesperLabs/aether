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
  buffs?: Record<string, any>;
  triggers?: Array<Trigger>;
  percentStats?: Record<string, number>;
  setName?: string;
  space?: number;
  items?: Array<Item>;
}

interface Trigger {
  event: "onAttackHit" | "onHurt";
  type: "buff" | "spell";
  name: string;
  level: number;
  chance: number;
}

interface Message {
  from?: string;
  type: "chat" | "warning" | "error" | "party" | "success" | "info";
  message: string;
  timestamp?: number;
}

interface Slot {
  item: Item;
  slotName: string;
}

interface PartyInvite {
  inviter: FullCharacterState;
  partyId: string;
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
  expiredSince?: number;
  grabMessage?: boolean;
  isPermanent?: boolean;
}

interface Drop {
  type: string;
  rarity: string;
  key: string;
  chance: integer;
}

interface Door extends Phaser.Types.Tilemaps.TiledObject {}

interface Sign extends Phaser.Types.Tilemaps.TiledObject {
  icon: string;
  subject: string;
  text: string;
}

interface ServerMetrics {
  totalPlayers: number;
  playersOnline: number;
  npcsLoaded: number;
  doorsLoaded: number;
  lootsOnGround: number;
  serverSpawnTime: number;
  upTime: number;
  ping: number;
}

interface ServerScene extends Phaser.Scene {
  doors: Record<string, Door>;
  loots: Record<string, Loot>;
  npcs: Record<string, Character>;
  quests: Record<string, Quest>;
  players: Record<string, ServerPlayer>;
  partyManager: any;
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

type Elements = "earth" | "fire" | "water" | "light" | "physical";

interface Hit {
  type: string;
  isCritical?: boolean;
  amount?: number;
  buffName?: string;
  elements?: Array<Elements>;
  from: string;
  to: string;
}

interface Buff {
  name: string;
  level: number;
  duration: number;
  stats: any;
  spawnTime: any;
  isExpired?: boolean;
  dispelInCombat?: boolean;
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
  kind: string;
  state: any;
  gold: any;
  profile: any;
  equipment: Record<string, Item>;
  inventory: any;
  baseStats: any;
  stats: any;
  quests: Array<PlayerQuest>;
  buffs: Array<Buff>;
  abilities: Record<number, Item>;
  activeItemSlots: Array<string>;
  bodyCenterY: number;
  hitBox: any;
  bodyOffsetY: number;
  doHit(ids, abilitySlot): void;
  addBuff(name, level, shouldCalculateStats: boolean);
  calculateAttackDamage(victim: any);
  calculateSpellDamage(victim: any, abilitySlot: number);
  calculateDamage(victim: any, abilitySlot: number);
  calculateActiveItemSlots(): void;
  calculateStats(shouldHeal?: boolean): void;
  fillHpMp(): void;
  modifyStat(key: string, amount: number);
  assignExp(amount: integer): boolean;
  setDead();
  getPlayerQuestStatus(quest: Quest): PlayerQuest | null;
  getQuests(): Array<PlayerQuest>;
  canCastSpell(abilitySlot: number): boolean;
  checkCastReady(spellName?: string): boolean;
  checkAttackReady(): any;
  getAttackSpCost(count: number): number;
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

interface ServerPlayer extends Character {
  email?: string;
  partyId?: string;
  addQuest(quest: Quest): void;
  completeQuest(quest: Quest): any;
  updateChatQuests(questId: string): Array<PlayerQuest>;
  findEquipmentById(id: string): Slot;
  findAbilityById(id: string): Slot;
  subtractAbilityAtId(id: string, amount: integer);
  deleteAbilityAtId(id: string);
  clearEquipmentSlot(id: string): void;
  clearAbilitySlot(id: string): void;
  subtractInventoryItemAtId(id: string, amount: integer);
  findInventoryItemById(id: string);
  findBagItemById(id: string);
  setBagItem(bagId: string, slot: string, item: Item);
  findBagItemBySlot(bagId: string, slot: string);
  deleteBagItemAtId(id: string);
  deleteInventoryItemAtId(id: string);
  subtractBagItemAtId(id: string, amount: integer);
  addInventoryItem(item: Item): void;
  doAttack(props?: any): void;
  doCast(props?: any): void;
  setDead(): void;
  isInventoryFull(): boolean;
  addNpcKill(npc: Npc): void;
}

interface MapAsset {
  name: string;
  json: string;
}

interface TickCharacterState {
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

interface TickRoomState {
  players: Array<TickCharacterState>;
  npcs: Array<TickCharacterState>;
  spells: Array<Spell>;
  loots: Array<Loot>;
}

interface Spell {
  id: string;
}

interface FullCharacterState {
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
  buffs: Array<Buff>;
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
  hitBoxSize: any;
}

interface RoomState {
  players: Array<FullCharacterState>;
  npcs: Array<FullCharacterState>;
  spells?: Array<Spell>;
  loots: Array<Loot>;
}

interface BuffRoomState {
  players: Array<FullCharacterState>;
  npcs: Array<FullCharacterState>;
}

interface BuffCharacterState {
  id: string;
  socketId: string;
  activeItemSlots: Array<string>;
  buffs: Array<Buff>;
  stats: any;
  state: any;
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
  item?: Array<string>;
  monster?: string;
  keeper?: string;
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
  numCollected?: number;
  numKilled?: number;
}
