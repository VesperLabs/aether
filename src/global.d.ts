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

interface Message {
  from?: string;
  type: "chat" | "warning" | "error" | "party" | "success" | "info" | "muted";
  message: string;
  timestamp?: number;
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

type Room = import("@/rules/world").RoomData;

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

type CharClass = "warrior" | "rogue" | "mage" | "cleric";

interface UserSettings {
  playMusic: boolean;
  showMinimap: boolean;
  videoChat: boolean;
  charLevels: boolean;
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

interface PlayerQuest {
  questId: string;
  isCompleted?: boolean;
  isReady?: boolean;
  rewards?: Record<string, any>;
  objectives?: Array<PlayerQuestObjective>;
}

interface KeeperData {
  dialogues?: any;
  quests?: any;
  shop?: any;
  home?: Coordinate;
}

/** Injected by Vite at build time: `package.json` version plus the short commit, e.g. "v1.2.0 (abc1234)". */
declare const __APP_VERSION__: string;
