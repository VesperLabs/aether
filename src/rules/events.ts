/**
 * Every game event and its payload, in one place.
 * Payloads are plain data (ids, numbers, strings), never entity objects, so any feature can
 * react to an event without reaching into another feature's internals.
 */
import type { Box, Shape } from "./movement";

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
  /** Worth no experience (harmless critters). */
  noExp?: boolean;
  roomName: string;
  x: number;
  y: number;
}

/** A character lost hp to another one. NPCs gain threat from it. */
interface CharacterDamagedEvent {
  victimId: string;
  /** A player's id is their socket id, so this finds players and NPCs alike. */
  attackerId: string;
  amount: number;
}

/** A buff ran out on its own (not dispelled, not on death). Its `onExpire` hook runs from this. */
interface BuffExpiredEvent {
  name: string;
  /** Who wore it: a player's socket id or an NPC's id. */
  wearerId: string;
  /** Who put it on them, filed the same way, if anyone. */
  casterId?: string;
  level: number;
}

/** An NPC swung at its target. `count` is which hand (1 or 2). */
interface NpcAttackedEvent {
  npcId: string;
  roomName: string;
  count: number;
  direction: string;
  castAngle: number;
}

/** An NPC cast the spell in one of its ability slots. */
interface NpcCastEvent {
  npcId: string;
  roomName: string;
  abilitySlot: string | number;
  castAngle: number;
}

/** An NPC began winding up an attack or spell that lands in `windupMs`. */
interface NpcWindupStartedEvent {
  npcId: string;
  roomName: string;
  kind: "attack" | "cast";
  /** Socket id of the player it is aimed at. */
  targetId?: string;
  abilitySlot?: string;
  windupMs: number;
}

/** An NPC gave up the fight mid-windup, so it never lands. */
interface NpcWindupCancelledEvent {
  npcId: string;
  roomName: string;
}

/** A dead NPC came back at its spawn point. */
/** An NPC left for a while (outside its actor's `active` times): hidden, not killed. */
interface NpcWentAwayEvent {
  npcId: string;
  roomName: string;
}

interface NpcRespawnedEvent {
  npcId: string;
  roomName: string;
  x: number;
  y: number;
  /** Wall clock time of the respawn. */
  at: number;
}

/** A spell hit someone: the shapes the server compared, for drawing while debugging. */
interface SpellHitShapesEvent {
  roomName: string;
  spell: Shape;
  victim: Box;
}

/** A player was shoved by a hit: their own client plays the shove (see `rules/movement/knockback.ts`). */
interface PlayerKnockedBackEvent {
  socketId: string;
  /** Which way it pushes, in radians. */
  angle: number;
}

export interface GameEvents {
  mobKilled: MobKilledEvent;
  characterDamaged: CharacterDamagedEvent;
  npcAttacked: NpcAttackedEvent;
  npcCast: NpcCastEvent;
  npcWindupStarted: NpcWindupStartedEvent;
  npcWindupCancelled: NpcWindupCancelledEvent;
  npcRespawned: NpcRespawnedEvent;
  npcWentAway: NpcWentAwayEvent;
  /** An owned NPC left far behind appeared beside its owner, in the same room. */
  npcWarped: NpcRespawnedEvent;
  spellHitShapes: SpellHitShapesEvent;
  buffExpired: BuffExpiredEvent;
  playerKnockedBack: PlayerKnockedBackEvent;
}
