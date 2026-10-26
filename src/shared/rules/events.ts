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
  partyId?: string;
  /** Characters that share the kill: the killer's party members in the same room, or just the killer. */
  recipientIds: string[];
  mobId: string;
  mobName: string;
  mobLevel: number;
  roomName: string;
  x: number;
  y: number;
}

export interface GameEvents {
  mobKilled: MobKilledEvent;
}

export type GameEventName = keyof GameEvents;
