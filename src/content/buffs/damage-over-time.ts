/** How often, in ms, each damage-over-time stat takes its hp: the tick and the "per second" shown. */
export const DOT_TICK_MS = {
  poisonDamage: 1000,
  bleedDamage: 700,
  burnDamage: 1000,
} as const;

type DotStatName = keyof typeof DOT_TICK_MS;

export const isDotStat = (key: string): key is DotStatName => key in DOT_TICK_MS;
