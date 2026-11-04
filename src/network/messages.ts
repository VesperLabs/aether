import type { BuffCharacterWire, FullCharacterWire } from "./sync/character-state";
import type { RoomStatuses } from "./sync/statuses";
import type { Box, Shape } from "@/rules/movement";
import type { Party, PartyUpdatePayload } from "@/rules/party";

/*
 * Everything the server sends to clients.
 */

/** Ground loot, as the server world keeps it. */
export type LootMessage = Loot;

interface RoomStateMessage {
  players: FullCharacterWire[];
  npcs: FullCharacterWire[];
  loots: LootMessage[];
}

/**
 * What a chat line is, which sets its color. Pick by what it means to the player:
 * - `chat`: a player talking (has `from`)
 * - `party`: party chat, invites and joins
 * - `system`: the game telling you something (spawn point set, a command's answer)
 * - `reward`: something good happened to you (level up, loot)
 * - `error`: what you tried didn't work
 */
export type ChatMessageType = "chat" | "party" | "system" | "reward" | "error";

/** One chat line. `message` is plain text, never HTML: anything rich gets its own field. */
export interface ChatMessage {
  from?: string;
  type: ChatMessageType;
  message: string;
  /** An item shown after the text, in its rarity's color ("Found [Crab Claw] x3"). */
  item?: { name: string; rarity: string; amount?: number };
  timestamp?: number;
}

/** A party, as the party rules keep it. */
export type PartyMessage = Party;

export interface HitMessage {
  type: string;
  isCritical?: boolean;
  /** Taken from `from` and given to `to` by an attack's steal stats. */
  isDrain?: boolean;
  amount?: number;
  buffName?: string;
  elements?: string[];
  from: string;
  to: string;
}

interface UserSettingsMessage {
  playMusic: boolean;
  showMinimap: boolean;
  videoChat: boolean;
  charLevels: boolean;
  screenShake: boolean;
}

export interface ServerToClientEvents {
  /* Auth */
  formError: (payload: { error: string }) => void;
  formSuccess: (payload: { success: string; email?: string }) => void;
  /** Sent after a login with "Remember me": the client keeps it for `tokenLogin`. */
  loginToken: (payload: { token: string }) => void;
  /** The remembered login was refused (expired, password changed): forget it. */
  loginTokenRejected: () => void;
  /** First message after login, respawn and door travel: the whole room. */
  heroInit: (
    state: RoomStateMessage & {
      socketId: string;
      userSettings?: UserSettingsMessage;
      /** Sent on login: whether cheat chat commands are on. */
      cheats?: boolean;
    },
    meta?: { isLogin?: boolean; isRespawn?: boolean },
  ) => void;

  /* World */
  /** Every character's position in the room, every tick. Each stands alone: see `network/sync/poses`. */
  poses: (poses: ArrayBuffer) => void;
  /** Characters whose state flags or vitals changed this tick. */
  statuses: (statuses: RoomStatuses) => void;
  playerJoin: (
    player: FullCharacterWire,
    meta?: { isLogin?: boolean; isRespawn?: boolean; lastTeleport?: number },
  ) => void;
  /** A character left the room or the game. */
  remove: (socketId: string) => void;
  /** The server rejected the hero's reported position: snap back to this one. */
  positionCorrection: (position: { x: number; y: number }) => void;
  /** A hit shoved the hero along `angle` (radians): play the knockback. */
  knockedBack: (payload: { angle: number }) => void;
  playerUpdate: (player: FullCharacterWire, meta?: { didLevel?: boolean }) => void;
  buffUpdate: (payload: {
    /** Buff changes from the tick, or whole characters when a party member levels. */
    players?: Array<BuffCharacterWire | FullCharacterWire>;
    npcs?: BuffCharacterWire[];
    playerIdsThatLeveled?: string[];
  }) => void;
  lootSpawned: (payload: { loot: LootMessage; npcId?: string | null }) => void;
  /** Ground loot timed out: clients remove it. */
  lootExpired: (id: string) => void;
  lootGrabbed: (payload: {
    socketId: string;
    loot: LootMessage;
    player: FullCharacterWire;
  }) => void;
  keeperDataUpdate: (payload: {
    npcId: string;
    keeperData: KeeperData;
    playerQuests: FullCharacterWire["quests"];
  }) => void;
  respawnNpc: (payload: { id: string; x: number; y: number; respawnTime: number }) => void;
  /** An NPC appeared after the room was sent (a cheat spawned it). */
  npcJoin: (npc: FullCharacterWire) => void;
  /** An NPC left the world for good. */
  npcRemove: (id: string) => void;
  /** Debug only: the shapes the server compared when a spell hit. */
  spellHitShapes: (payload: { spell: Shape; victim: Box }) => void;

  /* Combat */
  playerAttack: (payload: {
    socketId: string;
    count?: number | null;
    direction?: string | null;
    castAngle?: number | null;
    abilitySlot?: number | string | null;
  }) => void;
  /** Another player started a dodge roll along `angle` (radians). */
  playerDodge: (payload: { socketId: string; angle: number }) => void;
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
  /** An NPC began winding up; its attack or spell lands in `windupMs`. */
  npcWindup: (payload: {
    id: string;
    kind: "attack" | "cast";
    targetId?: string;
    abilitySlot?: string;
    windupMs: number;
  }) => void;
  npcWindupCancelled: (payload: { id: string }) => void;
  npcCastSpell: (payload: {
    id: string;
    abilitySlot?: number | string;
    castAngle?: number;
  }) => void;
  /** A player's hp, mp or sp changed by `amount`. The total itself comes with the tick (`v`). */
  modifyPlayerStat: (payload: { socketId: string; type: string; amount: number }) => void;
  assignDamage: (hits: HitMessage[]) => void;

  /* Social */
  /** Chat and system messages. Called without a payload when there is nothing to say. */
  message: (message?: ChatMessage) => void;
  partyInvite: (payload: { inviter: FullCharacterWire; partyId: string }) => void;
  partyUpdate: (payload: PartyUpdatePayload) => void;

  /* Settings and video chat */
  updateUserSetting: (payload: { name: string; value: unknown }) => void;
  connectPeer: (payload: { peerId: string; socketId: string }) => void;
}
