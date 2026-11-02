/*
 * Where characters stood over the last moment, so a hit can be judged against what its attacker saw
 * (lag compensation): remote characters reach a player late by their latency and render delay.
 */

/** The most a hit may be rewound. Bounds what a client claiming a slow connection can gain. */
export const MAX_REWIND_MS = 200;

/** Ticks kept: comfortably more than `MAX_REWIND_MS` at any sensible tick rate. */
const DEFAULT_CAPACITY = 20;

interface Frame {
  t: number;
  positions: Map<string, { x: number; y: number }>;
}

export function createPoseHistory(capacity = DEFAULT_CAPACITY) {
  const frames: Frame[] = [];

  /** Remembers where everyone is at time `t`. Call once per tick, in time order. */
  function record(t: number, characters: Iterable<{ id: string; x: number; y: number }>) {
    const positions = new Map<string, { x: number; y: number }>();
    for (const c of characters) positions.set(c.id, { x: c.x, y: c.y });
    frames.push({ t, positions });
    if (frames.length > capacity) frames.shift();
  }

  /**
   * Where `id` stood at time `t`, blended between ticks. Undefined when `t` is at or past the newest
   * tick (use where it is now) or the character was not recorded.
   */
  function positionAt(id: string, t: number): { x: number; y: number } | undefined {
    const newest = frames[frames.length - 1];
    if (!newest || t >= newest.t) return undefined;
    let i = frames.length - 1;
    while (i > 0 && frames[i - 1].t > t) i--;
    const after = frames[i].positions.get(id);
    const beforeFrame = frames[i - 1];
    const before = beforeFrame?.positions.get(id);
    /* Not seen yet then (just arrived or teleported): its first spot after */
    if (!after)
      return frames
        .slice(i + 1)
        .find((f) => f.positions.has(id))
        ?.positions.get(id);
    if (!before) return after;
    const u = (t - beforeFrame.t) / (frames[i].t - beforeFrame.t);
    return { x: before.x + (after.x - before.x) * u, y: before.y + (after.y - before.y) * u };
  }

  /** Drops everything recorded for `id`, e.g. after a teleport, so no hit rewinds to before it. */
  function forget(id: string) {
    for (const frame of frames) frame.positions.delete(id);
  }

  return { record, positionAt, forget };
}

export type PoseHistory = ReturnType<typeof createPoseHistory>;

/** How far back to judge a player's hits: their reported view lag, within bounds. */
export function clampRewind(ms: unknown): number {
  return typeof ms === "number" && Number.isFinite(ms)
    ? Math.min(Math.max(ms, 0), MAX_REWIND_MS)
    : 0;
}
