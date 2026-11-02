import type { CharClass } from "@/content";

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
  peerId?: string;
  /** Null while a player is between rooms (door, disconnect). */
  room: { name: string } | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: string;
  stats: Opaque;
  state: Record<string, Opaque>;
  equipment: Opaque;
  inventory: Opaque;
  profile: Opaque;
  kind: string;
  /** NPCs only: their opt-in behaviors, so the client can tell aggressive mobs apart. */
  behaviors?: readonly string[];
  charClass?: CharClass;
  npcKills?: Opaque;
  buffs: Opaque[];
  abilities: Opaque;
  activeItemSlots: Opaque[];
  gold: number;
  hitBoxSize?: Opaque;
  getQuests(): Opaque[];
}

/** A whole character, sent on join, login and every `playerUpdate`. */
export interface FullCharacterWire {
  id: string;
  socketId: string;
  peerId?: string;
  roomName: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: string;
  stats: Opaque;
  state: Record<string, Opaque>;
  equipment: Opaque;
  inventory: Opaque;
  profile: Opaque;
  kind: string;
  behaviors?: readonly string[];
  charClass: CharClass;
  npcKills: Opaque;
  buffs: Opaque[];
  quests: Opaque[];
  abilities: Opaque;
  activeItemSlots: Opaque[];
  gold: number;
  hitBoxSize: Opaque;
}

/** The parts of a character that change when buffs do. */
export interface BuffCharacterWire {
  id: string;
  socketId: string;
  state: Record<string, Opaque>;
  stats: Opaque;
  buffs: Opaque[];
  activeItemSlots: Opaque[];
}

export function getFullCharacterState(p: CharacterSyncInput): FullCharacterWire {
  const uid = (p?.socketId || p?.id) as string;
  return {
    id: uid, //required for SI
    socketId: uid,
    peerId: p?.peerId,
    // Undefined for a player between rooms; the client types still expect it set.
    roomName: p?.room?.name as string,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    direction: p?.direction,
    stats: p?.stats,
    state: p?.state,
    equipment: p?.equipment,
    inventory: p?.inventory,
    profile: p?.profile,
    kind: p?.kind,
    behaviors: p?.behaviors,
    charClass: p?.charClass as CharClass,
    npcKills: p?.npcKills,
    buffs: p?.buffs,
    quests: p?.getQuests(),
    abilities: p?.abilities,
    activeItemSlots: p?.activeItemSlots,
    gold: p?.gold,
    hitBoxSize: p?.hitBoxSize,
  };
}

/**
 * Buff changes for one character. Clears the character's `state.hasBuffChanges` flag as a side effect:
 * the change is being sent now, so it is not sent again next tick.
 */
export function getBuffCharacterState(
  p: Pick<CharacterSyncInput, "id" | "socketId" | "state" | "stats" | "buffs" | "activeItemSlots">,
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
    buffs: p?.buffs,
    activeItemSlots: p?.activeItemSlots,
  };
}
