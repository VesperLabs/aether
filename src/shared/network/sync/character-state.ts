import type { CharClass } from "@/shared/content";
import { pickTickStateLite } from "./tick-state";
import { encodeWireDirection } from "./net-wire";

// oxlint-disable-next-line typescript/no-explicit-any
type Opaque = any; // equipment, stats, buffs ... get exact types when their rules move into shared/rules

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
  room: { name: string };
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
  charClass: CharClass;
  npcKills: Opaque;
  buffs: Opaque[];
  quests: Opaque[];
  abilities: Opaque;
  activeItemSlots: Opaque[];
  gold: number;
  hitBoxSize: Opaque;
}

/** A character on the room tick: position, facing and the few state flags clients animate from. */
export interface TickCharacterWire {
  id: string;
  /** Facing as a number, see `encodeWireDirection`. */
  d: number;
  state: Record<string, unknown>;
  x: number;
  y: number;
  vx: number;
  vy: number;
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

/** Ground loot on the tick: just enough for the client to find and expire it. */
export interface LootTickWire {
  id: string;
  expiredSince?: number;
}

export function getFullCharacterState(p: CharacterSyncInput): FullCharacterWire {
  const uid = (p?.socketId || p?.id) as string;
  return {
    id: uid, //required for SI
    socketId: uid,
    peerId: p?.peerId,
    roomName: p?.room?.name,
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

/** Tick loot: client only needs id + expiredSince (destroy when both match). Full props come from spawn / heroInit. */
export function getLootTickWire(l: { id: string; expiredSince?: number | null }): LootTickWire {
  const o: LootTickWire = { id: l.id };
  if (l.expiredSince != null) o.expiredSince = l.expiredSince;
  return o;
}

/** Only the fields the client's `Player.updateState` uses, not the whole state blob (huge JSON every tick). */
export function getTickStateLite(p: Pick<CharacterSyncInput, "state">): Record<string, unknown> {
  return pickTickStateLite(p?.state);
}

export function getTickCharacterState(
  p: Pick<CharacterSyncInput, "id" | "socketId" | "direction" | "state" | "x" | "y"> & {
    vx?: number;
    vy?: number;
  },
): TickCharacterWire {
  const uid = (p?.socketId || p?.id) as string;
  const vx = p?.vx ?? 0;
  const vy = p?.vy ?? 0;
  return {
    id: uid, //required for SI (same as socketId for players; omit duplicate key on wire)
    /* room omitted: snapshot is already scoped to one room; saves bytes per entity per tick */
    d: encodeWireDirection(p?.direction),
    state: getTickStateLite(p),
    /* Floats: rounding broke small velocities (→0) and stepped positions for snapshot interpolation */
    x: p?.x ?? 0,
    y: p?.y ?? 0,
    vx,
    vy,
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
