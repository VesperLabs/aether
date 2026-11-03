/** What the ambient runner remembers between polls. */
export interface AmbientState {
  /** When a human was last seen online, in ms; undefined if none since bots last left. */
  lastHumanAt?: number;
}

export interface AmbientPolicy {
  /** Bots to keep in while humans play. */
  count: number;
  /** How long bots stay after the last human leaves, in ms. */
  graceMs: number;
}

/**
 * How many bots should be online, given the humans online now (undefined when the server could
 * not be reached). Bots come in with the first human and leave `graceMs` after the last one.
 */
export function decideBots(
  state: AmbientState,
  humans: number | undefined,
  now: number,
  { count, graceMs }: AmbientPolicy,
): { state: AmbientState; desired: number } {
  if (humans === undefined) return { state: {}, desired: 0 };
  if (humans > 0) return { state: { lastHumanAt: now }, desired: count };
  const { lastHumanAt } = state;
  if (lastHumanAt !== undefined && now - lastHumanAt < graceMs) return { state, desired: count };
  return { state: {}, desired: 0 };
}

/** Delay before the next poll: `pollMs` while the server answers, doubling up to `maxMs` while it doesn't. */
export const nextPollDelay = (failures: number, pollMs: number, maxMs: number) =>
  Math.min(maxMs, pollMs * 2 ** failures);
