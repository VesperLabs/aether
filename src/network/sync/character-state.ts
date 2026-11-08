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
  state: Record<string, Opaque>;
  equipment: Opaque;
  inventory: Opaque;
  profile: Opaque;
  /** "player" or "npc". What an NPC does comes from its parts, like `talks`, never its kind. */
  kind: string;
  /** NPCs only: their opt-in behaviors, so the client can tell aggressive mobs apart. */
  behaviors?: readonly string[];
  /** NPCs only: players can talk to it (it has `dialogues`). */
  talks?: boolean;
  charClass?: CharClass;
  npcKills?: Opaque;
  buffs: Opaque[];
  abilities: Opaque;
  activeItemSlots: Opaque[];
  gold: number;
  hitBoxSize?: Opaque;
  bodySize?: number;
  bodyCenterY?: number;
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
  state: Record<string, Opaque>;
  equipment: Opaque;
  inventory: Opaque;
  profile: Opaque;
  kind: string;
  behaviors?: readonly string[];
  talks?: boolean;
  charClass: CharClass;
  npcKills: Opaque;
  buffs: Opaque[];
  quests: Opaque[];
  abilities: Opaque;
  activeItemSlots: Opaque[];
  gold: number;
  hitBoxSize: Opaque;
  /** Feet radius: sets unarmed reach and where hit boxes stand. */
  bodySize: number;
  /** Where its body's middle sits above its feet; melee swings turn around it. */
  bodyCenterY: number;
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
    nid: p?.nid as number,
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
    talks: p?.talks,
    charClass: p?.charClass as CharClass,
    npcKills: p?.npcKills,
    buffs: p?.buffs,
    quests: p?.getQuests(),
    abilities: p?.abilities,
    activeItemSlots: p?.activeItemSlots,
    gold: p?.gold,
    hitBoxSize: p?.hitBoxSize,
    bodySize: p?.bodySize as number,
    bodyCenterY: p?.bodyCenterY as number,
  };
}

/** A character as anonymous observers see it: how it looks and acts, nothing it owns or knows. */
export function getPublicCharacterState(p: CharacterSyncInput): FullCharacterWire {
  return {
    ...getFullCharacterState(p),
    peerId: undefined,
    inventory: [],
    gold: 0,
    quests: [],
    npcKills: {},
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
