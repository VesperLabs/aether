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
  requirements?: Record<string, any>;
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
  type: "buff" | "spell" | "debuff";
  name: string;
  level: number;
  chance: number;
}

interface Message {
  from?: string;
  type: "chat" | "warning" | "error" | "party" | "success" | "info" | "muted";
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
  serverTime: string;
  upTime: number;
  ping: number;
}

interface Coordinate {
  x: number;
  y: number;
}

type Room = import("@/shared/rules/world").RoomData;

type Elements = "earth" | "fire" | "water" | "light" | "physical" | "holy";

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
  stats: Record<string, any>;
  percentStats?: Record<string, any>;
  spawnTime: any;
  isExpired?: boolean;
  dispelInCombat?: boolean;
  dispelOnHit?: boolean;
  dispelBeforeAttack?: boolean;
  dispelAfterAttack?: boolean;
}

interface Character {
  x: number;
  y: number;
  world?: ServerWorld;
  update?(time: number, delta: number): void;
  /** Phaser container methods, used by the client's sprites. */
  add?(...args: any[]): any;
  bringToTop?(...args: any[]): any;
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
  hitBoxSize: { width: number; height: number };
  bodySize: number;
  bodyOffsetY: number;
  doHit(ids: Array<string>, abilitySlot: number): void;
  addBuff(args: AddBuffArgs);
  calculateAttackDamage(victim: any, abilitySlot: number);
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
  getAbilityDetails(abilitySlot: number);
  getAttackSpCost(count: number): number;
}

type CharClass = "warrior" | "rogue" | "mage" | "cleric";

interface Npc extends Character {
  name?: string;
  drops: Array<Drop>;
  talkingIds: Array<string>;
  keeperData: KeeperData;
  setDead(): void;
}

interface UserSettings {
  playMusic: boolean;
  showMinimap: boolean;
  videoChat: boolean;
  charLevels: boolean;
}

interface Spell {
  id: string;
}

interface SpawnPoint {
  x: number;
  y: number;
  roomName: string;
}

interface FullCharacterState {
  id: string;
  socketId: string;
  peerId?: string;
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
  keeperData?: KeeperData;
}

interface Quest {
  id: string;
  name: string;
  dialogues: any;
  rewards: Record<string, any>;
  objectives: Array<QuestObjective>;
}

interface QuestObjective {
  id: number;
  questId: string;
  type: string;
  item?: Array<string>;
  monster?: string;
  keeper?: string;
  amount?: integer;
}
interface PlayerQuest {
  questId: string;
  isCompleted?: boolean;
  isReady?: boolean;
  rewards?: Record<string, any>;
  objectives?: Array<PlayerQuestObjective>;
}

interface PlayerQuestObjective {
  objectiveId: number;
  questId: string;
  isReady?: boolean;
  numCollected?: number;
  numKilled?: number;
}
interface AddBuffArgs {
  name: string;
  level: number;
  caster: Character;
  shouldCalculateStats?: boolean;
}

interface KeeperData {
  dialogues?: any;
  quests?: any;
  shop?: any;
  home?: Coordinate;
}
