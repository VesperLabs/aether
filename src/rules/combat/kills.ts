import type { MobKilledEvent } from "../events";

/** The killer's side of a kill. */
export interface KillerInput {
  id: string;
  level: number;
  magicFind: number;
  partyId?: string | null;
}

/** The parts of a slain mob that a kill event carries. */
export interface SlainMob {
  id: string;
  name: string;
  stats: { level: number };
  x: number;
  y: number;
}

/**
 * One `mobKilled` event per slain mob. The caller reads the killer's level once, so a level-up
 * part way through the kills doesn't change what later kills are worth.
 */
export function mobKilledEvents(
  killer: KillerInput,
  recipientIds: string[],
  roomName: string,
  mobs: readonly SlainMob[],
): MobKilledEvent[] {
  return mobs.map((mob) => ({
    killerId: killer.id,
    killerLevel: killer.level,
    killerMagicFind: killer.magicFind,
    partyId: killer.partyId,
    recipientIds,
    mobId: mob.id,
    mobName: mob.name,
    mobLevel: mob.stats.level,
    roomName,
    x: mob.x,
    y: mob.y,
  }));
}
