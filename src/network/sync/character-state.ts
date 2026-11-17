import type { CharClass } from "@/content";
import type { SavedCompanion } from "@/rules/capture";
import type { Habitat } from "@/rules/movement";

// oxlint-disable-next-line typescript/no-explicit-any
type Opaque = any; // equipment, stats, buffs ... get exact types when their rules move into rules

/*
 * Packs characters (players and npcs) and ground loot into the objects the server sends to clients.
 * Every function takes plain data (the fields it reads), never the server scene or a class instance,
 * so the wire format can be tested and reused without a running game.
 */

/** What the packers read from a player or npc. The server passes its character objects as they are. */
export interface CharacterSyncInput {
  id?: string;
  /** Players only; npcs use `id` on the wire. */
  socketId?: string;
  /** Number standing in for the id on the binary pose wire, see `net-ids.ts`. */
  nid?: number;
  peerId?: string;
  /** Null while a player is between rooms (door, disconnect). */
  room: { name: string } | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: string;
  stats: Opaque;
  /** Dual-wielding only: the stats of the left hand's swings (its weapon's damage, speed, crit). */
  offHandStats?: Opaque;
  state: Record<string, Opaque>;
  equipment: Opaque;
  inventory: Opaque;
  profile: Opaque;
  /** "player" or "npc". What an NPC does comes from its parts, like `talks`, never its kind. */
  kind: string;
  /** NPCs only: attacks on sight, so the client can tell aggressive mobs apart. */
  aggressive?: boolean;
  /** NPCs only: players can talk to it (it has `dialogues`). */
  talks?: boolean;
  habitat?: Habitat;
  charClass?: CharClass;
  npcKills?: Opaque;
  buffs: Opaque[];
  abilities: Opaque;
  activeItemSlots: Opaque[];
  gold: number;
  /** Players only: the companions they caught and keep. */
  companions?: SavedCompanion[];
  getQuests(): Opaque[];
}

/** A whole character, sent on join, login and every `playerUpdate`. */
export interface FullCharacterWire {
  id: string;
  socketId: string;
  /** Net id: maps binary poses back to this character. */
  nid: number;
  peerId?: string;
  roomName: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: string;
  stats: Opaque;
  /** Dual-wielding only: the stats of the left hand's swings (its weapon's damage, speed, crit). */
  offHandStats?: Opaque;
  state: Record<string, Opaque>;
  equipment: Opaque;
  inventory: Opaque;
  profile: Opaque;
  kind: string;
  aggressive?: boolean;
  talks?: boolean;
  habitat?: Habitat;
  charClass: CharClass;
  npcKills: Opaque;
  buffs: Opaque[];
  quests: Opaque[];
  abilities: Opaque;
  activeItemSlots: Opaque[];
  gold: number;
  /** Your own character only: the companions you caught and keep. */
  companions?: SavedCompanion[];
}

/** The parts of a character that change when buffs do. */
export interface BuffCharacterWire {
  id: string;
  socketId: string;
  state: Record<string, Opaque>;
  stats: Opaque;
  /** Dual-wielding only: the stats of the left hand's swings (its weapon's damage, speed, crit). */
  offHandStats?: Opaque;
  buffs: Opaque[];
  activeItemSlots: Opaque[];
}

/**
 * A character as anyone may see it: how it looks, moves and fights, never what it carries. Its
 * bag, gold, quests and kills are left empty, and its quests are never even read. NPCs and
 * spectators get this.
 */
export function getPublicCharacterState(p: CharacterSyncInput): FullCharacterWire {
  const uid = (p?.socketId || p?.id) as string;
  return {
    id: uid, //required for SI
    socketId: uid,
    nid: p?.nid as number,
    /* Only room mates get it (`getRoomMateState`); kept here so the wire's keys stay in order */
    peerId: undefined,
    // Undefined for a player between rooms; the client types still expect it set.
    roomName: p?.room?.name as string,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    direction: p?.direction,
    stats: p?.stats,
    offHandStats: p?.offHandStats,
    state: p?.state,
    equipment: p?.equipment,
    inventory: [],
    profile: p?.profile,
    kind: p?.kind,
    aggressive: p?.aggressive,
    talks: p?.talks,
    habitat: p?.habitat,
    charClass: p?.charClass as CharClass,
    npcKills: {},
    buffs: p?.buffs,
    quests: [],
    abilities: p?.abilities,
    activeItemSlots: p?.activeItemSlots,
    gold: 0,
  };
}

/** Another player in your room: public, plus their `peerId` so nearby players can video chat. */
export function getRoomMateState(p: CharacterSyncInput): FullCharacterWire {
  return { ...getPublicCharacterState(p), peerId: p?.peerId };
}

/** Your own character, whole: its bag, gold, quests and kills too. Only ever sent to its player. */
export function getFullCharacterState(p: CharacterSyncInput): FullCharacterWire {
  return {
    ...getRoomMateState(p),
    inventory: p?.inventory,
    npcKills: p?.npcKills,
    quests: p?.getQuests(),
    gold: p?.gold,
    companions: p?.companions,
  };
}

/**
 * Buff changes for one character. Clears the character's `state.hasBuffChanges` flag as a side effect:
 * the change is being sent now, so it is not sent again next tick.
 */
export function getBuffCharacterState(
  p: Pick<
    CharacterSyncInput,
    "id" | "socketId" | "state" | "stats" | "offHandStats" | "buffs" | "activeItemSlots"
  >,
): BuffCharacterWire {
  const uid = (p?.socketId || p?.id) as string;
  if (p?.state) {
    // no longer need to send this to client
    p.state.hasBuffChanges = false;
  }
  return {
    id: uid,
    socketId: uid,
    state: p?.state,
    stats: p?.stats,
    offHandStats: p?.offHandStats,
    buffs: p?.buffs,
    activeItemSlots: p?.activeItemSlots,
  };
}
