/**
 * Every game event and its payload, in one place.
 * Payloads are plain data (ids, numbers, strings), never entity objects, so any feature can
 * react to an event without reaching into another feature's internals.
 */

/** A mob died. Handled by stats (experience) now; loot and quests will subscribe later. */
export interface MobKilledEvent {
  /** Who landed the killing blow. */
  killerId: string;
  killerLevel: number;
  killerMagicFind: number;
  /** The killer's party, if any. */
  partyId?: string | null;
  /** Characters that share the kill: the killer's party members in the same room, or just the killer. */
  recipientIds: string[];
  mobId: string;
  mobName: string;
  mobLevel: number;
  roomName: string;
  x: number;
  y: number;
}

/** A character lost hp to another one. NPCs gain threat from it. */
export interface CharacterDamagedEvent {
  victimId: string;
  attackerId: string;
  /** Players are looked up by socket id; unset for NPC attackers. */
  attackerSocketId?: string;
  amount: number;
}

/** An NPC swung at its target. `count` is which hand (1 or 2). */
export interface NpcAttackedEvent {
  npcId: string;
  roomName: string;
  count: number;
  direction: string;
  castAngle: number;
}

/** An NPC cast the spell in one of its ability slots. */
export interface NpcCastEvent {
  npcId: string;
  roomName: string;
  abilitySlot: string | number;
  castAngle: number;
}

/** An NPC began winding up an attack or spell that lands in `windupMs`. */
export interface NpcWindupStartedEvent {
  npcId: string;
  roomName: string;
  kind: "attack" | "cast";
  /** Socket id of the player it is aimed at. */
  targetId?: string;
  abilitySlot?: string;
  windupMs: number;
}

/** A dead NPC came back at its spawn point. */
export interface NpcRespawnedEvent {
  npcId: string;
  roomName: string;
  x: number;
  y: number;
  /** Wall clock time of the respawn. */
  at: number;
}

export interface GameEvents {
  mobKilled: MobKilledEvent;
  characterDamaged: CharacterDamagedEvent;
  npcAttacked: NpcAttackedEvent;
  npcCast: NpcCastEvent;
  npcWindupStarted: NpcWindupStartedEvent;
  npcRespawned: NpcRespawnedEvent;
}

export type GameEventName = keyof GameEvents;
