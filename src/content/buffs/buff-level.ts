import type { BuffDefinition } from "./buff-types";

/** What a buff does at one level: its duration and stats, with every per-level step added in. */
interface BuffAtLevel {
  duration: number;
  stats: Record<string, number>;
  percentStats: Record<string, number>;
}

const grow = (
  base: Readonly<Record<string, unknown>> = {},
  step: Readonly<Record<string, unknown>> = {},
  levels: number,
) => {
  const out: Record<string, number> = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(step)])) {
    out[key] = Number(base[key] ?? 0) + Number(step[key] ?? 0) * levels;
  }
  return out;
};

/**
 * A buff at `level`: level 1 is its definition, and each level past it adds `perLevel` once.
 * The game and the tooltips both read buffs through this, so they never disagree.
 */
export function buffAtLevel(buff: BuffDefinition, level: number): BuffAtLevel {
  const levels = Math.max(1, level) - 1;
  return {
    duration: Number(buff.duration ?? 0) + Number(buff.perLevel?.duration ?? 0) * levels,
    stats: grow(buff.stats, buff.perLevel?.stats, levels),
    percentStats: grow(buff.percentStats, buff.perLevel?.percentStats, levels),
  };
}

/** Whether a buff gets stronger or longer with level. */
export const growsWithLevel = (buff: BuffDefinition | undefined): boolean => !!buff?.perLevel;
