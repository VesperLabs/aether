import { ITEM_CATALOG } from "@/content";

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

/** Can a ball catch it? Only a living, wild NPC not marked `catchable: false`. The rest still struggle, then break free. */
export const isCatchable = ({ isPlayer, ownerId, isDead, catchable }: CatchTarget) =>
  !isPlayer && !ownerId && !isDead && catchable !== false;

/**
 * The chance a ball catches what it hit, 0 to 1, by the level of `capturing` it put on it: Poké,
 * Great, Ultra, Master. Each ball's `catchChance` stat, so its tooltip shows the real odds. The
 * same for every NPC, for now.
 */
const CATCH_CHANCES = Object.values(ITEM_CATALOG)
  .filter((item) => isThrowable(item.base))
  .map((item) => ({
    level: (item.buffs as { capturing?: number } | undefined)?.capturing ?? 1,
    chance: ((item.stats as { catchChance?: number } | undefined)?.catchChance ?? 0) / 100,
  }))
  .sort((a, b) => a.level - b.level)
  .map(({ chance }) => chance);

/** The catch chance of a `capturing` at `level`, clamped to the balls there are. */
export const getCatchChance = (level = 1) =>
  CATCH_CHANCES[Math.min(Math.max(1, Math.floor(level)), CATCH_CHANCES.length) - 1];

/** Whether a ball that hit catches its target. `random` is the world's dice, in [0, 1). */
export const rollCatch = (random: () => number, level?: number) => random() < getCatchChance(level);

/** How many caught companions a player can keep at once. */
export const MAX_COMPANIONS = 1;

/** A caught companion as saved on its owner's account: the actor it is a copy of. */
export interface SavedCompanion {
  /** Ties the saved entry to the companion out in the world (its `state.keptId`). */
  id: string;
  name: string;
  /** Put away: saved, but not out with its owner. */
  isAway?: boolean;
}
