/*
 * Capture: a thrown ball (the `pokeball` spell) puts its target in the `capturing` debuff, and
 * when that runs out the thrower may catch it. These rules only roll; the server does the taming.
 */

/** Item bases a player can throw. Each flies as the spell of the same name (`content/spells`). */
const THROWABLE_BASES = ["pokeball", "greatball", "ultraball", "masterball"];

export const isThrowable = (base: string | undefined) => THROWABLE_BASES.includes(base as string);

/** What catching reads from a character. */
interface CatchTarget {
  isPlayer: boolean;
  ownerId?: string | null;
  isDead?: boolean;
  /** False on actors the game needs, like keepers. */
  catchable?: boolean;
}

/** Can a ball catch it? Only a living, wild NPC not marked `catchable: false`; balls pass the rest. */
export const isCatchable = ({ isPlayer, ownerId, isDead, catchable }: CatchTarget) =>
  !isPlayer && !ownerId && !isDead && catchable !== false;

/**
 * The chance a ball catches what it hit, 0 to 1, by the level of `capturing` it put on it: Poké,
 * Great, Ultra, Master. The same for every NPC, for now.
 */
const CATCH_CHANCES = [0.5, 0.65, 0.8, 1];

/** The catch chance of a `capturing` at `level`, clamped to the balls there are. */
export const getCatchChance = (level = 1) =>
  CATCH_CHANCES[Math.min(Math.max(1, Math.floor(level)), CATCH_CHANCES.length) - 1];

/** Whether a ball that hit catches its target. `random` is the world's dice, in [0, 1). */
export const rollCatch = (random: () => number, level?: number) => random() < getCatchChance(level);
