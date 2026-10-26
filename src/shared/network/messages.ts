import type { NetSnapshot } from "./sync/net-snapshot";

/*
 * Everything the server sends to clients. Character, loot and quest states are still the loose
 * objects the server builds today; they get exact types when their rules move into shared/rules.
 */

/** A character (player or npc) as the server serializes it. */
export interface CharacterMessage {
  id: string;
  socketId?: string;
  peerId?: string;
  roomName: string;
  direction: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  // oxlint-disable-next-line typescript/no-explicit-any
  [key: string]: any;
}

export interface LootMessage {
  id: string;
  roomName: string;
  x: number;
  y: number;
  expiredSince?: number;
  // oxlint-disable-next-line typescript/no-explicit-any
  [key: string]: any;
}

export interface RoomStateMessage {
  players: CharacterMessage[];
  npcs: CharacterMessage[];
  loots: LootMessage[];
}

export interface ChatMessage {
  from?: string;
  type: "chat" | "warning" | "error" | "party" | "success" | "info" | "muted";
  message: string;
  timestamp?: number;
}

export interface PartyMessage {
  id: string;
  socketRoom: string;
  // oxlint-disable-next-line typescript/no-explicit-any
  [key: string]: any;
}

export interface HitMessage {
  type: string;
  isCritical?: boolean;
  amount?: number;
  buffName?: string;
  elements?: string[];
  from: string;
  to: string;
}

export interface UserSettingsMessage {
  playMusic: boolean;
  showMinimap: boolean;
  videoChat: boolean;
  charLevels: boolean;
}

export interface ServerToClientEvents {
  /* Auth */
  formError: (payload: { error: string }) => void;
  formSuccess: (payload: { success: string; email?: string }) => void;
  /** First message after login, respawn and door travel: the whole room. */
  heroInit: (
    state: RoomStateMessage & { socketId: string; userSettings?: UserSettingsMessage },
    meta?: { isLogin?: boolean },
  ) => void;

  /* World */
  /** Room tick: a keyframe or a delta, see `network/sync`. */
  update: (snapshot: NetSnapshot) => void;
  playerJoin: (
    player: CharacterMessage,
    meta?: { isLogin?: boolean; isRespawn?: boolean; lastTeleport?: number },
  ) => void;
  /** A character left the room or the game. */
  remove: (socketId: string) => void;
  playerUpdate: (player: CharacterMessage, meta?: { didLevel?: boolean }) => void;
  buffUpdate: (payload: {
    players?: CharacterMessage[];
    npcs?: CharacterMessage[];
    playerIdsThatLeveled?: string[];
  }) => void;
  lootSpawned: (payload: { loot: LootMessage; npcId: string | null }) => void;
  lootGrabbed: (payload: { socketId: string; loot: LootMessage; player: CharacterMessage }) => void;
  keeperDataUpdate: (payload: {
    npcId: string;
    // oxlint-disable-next-line typescript/no-explicit-any
    keeperData: any;
    // oxlint-disable-next-line typescript/no-explicit-any
    playerQuests: any;
  }) => void;
  respawnNpc: (payload: { id: string; x: number; y: number; respawnTime: number }) => void;

  /* Combat */
  playerAttack: (payload: {
    socketId: string;
    count?: number | null;
    direction?: string | null;
    castAngle?: number | null;
    abilitySlot?: number | string | null;
  }) => void;
  playerCastSpell: (payload: {
    socketId: string;
    abilitySlot?: number | string | null;
    castAngle?: number | null;
  }) => void;
  npcAttack: (payload: {
    id: string;
    count?: number;
    direction?: string;
    castAngle?: number;
  }) => void;
  npcCastSpell: (payload: {
    id: string;
    abilitySlot?: number | string;
    castAngle?: number;
  }) => void;
  modifyPlayerStat: (payload: { socketId: string; type: string; amount: number }) => void;
  assignDamage: (hits: HitMessage[]) => void;

  /* Social */
  /** Chat and system messages. Called without a payload when there is nothing to say. */
  message: (message?: ChatMessage) => void;
  partyInvite: (payload: { inviter: CharacterMessage; partyId: string }) => void;
  partyUpdate: (payload: {
    party: PartyMessage | null;
    message?: string;
    partyId?: string;
  }) => void;

  /* Settings and video chat */
  updateUserSetting: (payload: { name: string; value: unknown }) => void;
  connectPeer: (payload: { peerId: string; socketId: string }) => void;
}
