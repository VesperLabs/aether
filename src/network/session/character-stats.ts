import { getSelf, type ClientCharacter, type ClientState } from "./client-state";

const statsCache = new WeakMap<ClientCharacter, Record<string, any>>();
const withVitalsCache = new WeakMap<ClientCharacter, ClientCharacter>();

/**
 * A character's stats with the latest vitals (hp, mp, sp and maximums) laid over them. Cached per
 * record, which the client state replaces on change, so the same record gives the same object.
 */
export function statsOf(c: ClientCharacter): Record<string, any> {
  if (!c.vitals) return c.stats;
  const cached = statsCache.get(c);
  if (cached) return cached;
  const stats = { ...c.stats, ...c.vitals };
  statsCache.set(c, stats);
  return stats;
}

/** The character with `stats` read through `statsOf`, for views that only read `stats`. */
export function withVitals(c: ClientCharacter): ClientCharacter {
  if (!c.vitals) return c;
  const cached = withVitalsCache.get(c);
  if (cached) return cached;
  const out = { ...c, stats: statsOf(c) };
  withVitalsCache.set(c, out);
  return out;
}

/** The hero with its latest vitals, once `heroInit` has arrived. */
export function selfWithVitals(state: ClientState): ClientCharacter | undefined {
  const self = getSelf(state);
  return self && withVitals(self);
}

/** The room's players, the hero among them, with their latest vitals. */
export function playersWithVitals(state: ClientState): ClientCharacter[] {
  return [...state.players.values()].map(withVitals);
}
