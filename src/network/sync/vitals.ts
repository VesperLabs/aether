/**
 * A character's hp, mp and sp with their maximums, as the server has them. Sent with every tick
 * entity so clients show the server's values instead of adding up changes, which could drift.
 * Packed as `[hp, maxHp, mp, maxMp, sp, maxSp]`: the tick only resends an entity when it changes.
 */
export type TickVitals = [number, number, number, number, number, number];

export interface Vitals {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  sp: number;
  maxSp: number;
}

type VitalStats = Partial<Record<keyof Vitals, unknown>> | null | undefined;

const whole = (value: unknown) => (typeof value === "number" ? Math.round(value) : 0);

export function encodeTickVitals(stats: VitalStats): TickVitals {
  return [
    whole(stats?.hp),
    whole(stats?.maxHp),
    whole(stats?.mp),
    whole(stats?.maxMp),
    whole(stats?.sp),
    whole(stats?.maxSp),
  ];
}

export function decodeTickVitals(v: unknown): Vitals | null {
  if (!Array.isArray(v) || v.length !== 6) return null;
  const [hp, maxHp, mp, maxMp, sp, maxSp] = v as TickVitals;
  return { hp, maxHp, mp, maxMp, sp, maxSp };
}
