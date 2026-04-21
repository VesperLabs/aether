/**
 * Delta encoding for tick snapshots.
 *
 * `diffTickStates` compares the server's last emitted snapshot against the next one and
 * produces a compact patch (changed entities + removed ids). `mergeTickDelta` applies a
 * patch onto the client's running baseline. `compactTickDeltaForWire` drops empty buckets
 * so idle ticks send almost nothing.
 */

import { expandTickState, type TickStateExpanded } from "./tickState";

export type TickRmCompact = { p?: string[]; n?: string[]; l?: string[] };

function compactRm(rm: { p: string[]; n: string[]; l: string[] }): TickRmCompact | undefined {
  const o: TickRmCompact = {};
  if (rm.p.length) o.p = rm.p;
  if (rm.n.length) o.n = rm.n;
  if (rm.l.length) o.l = rm.l;
  return Object.keys(o).length ? o : undefined;
}

function mergeBucket(
  bucket: unknown[],
  delta: unknown[],
  rmIds: string[] | undefined,
): unknown[] {
  const map = new Map((bucket ?? []).map((e: { id: unknown }) => [String(e.id), e]));
  for (const id of rmIds ?? []) map.delete(id);
  for (const e of delta ?? []) {
    if (e && typeof e === "object" && e !== null && "id" in e) {
      map.set(String((e as { id: unknown }).id), e);
    }
  }
  return [...map.values()];
}

/** Only non-empty buckets (smaller JSON on delta ticks). */
export function compactTickDeltaForWire(delta: TickStateExpanded): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (delta.players.length) o.p = delta.players;
  if (delta.npcs.length) o.n = delta.npcs;
  if (delta.loots.length) o.l = delta.loots;
  return o;
}

export function mergeTickDelta(
  base: TickStateExpanded,
  deltaState: Record<string, unknown>,
  rm?: TickRmCompact,
): TickStateExpanded {
  const dd = expandTickState(deltaState);
  return {
    players: mergeBucket(base.players, dd.players, rm?.p),
    npcs: mergeBucket(base.npcs, dd.npcs, rm?.n),
    loots: mergeBucket(base.loots, dd.loots, rm?.l),
  };
}

/**
 * Field-wise compare for the tick-lite shape (id/d/x/y/vx/vy + nested `state`).
 * `JSON.stringify` was a hot path on busy rooms — this avoids allocating a string for every
 * unchanged entity every tick, and only pays the stringify cost for the small `state` object.
 */
function tickEntityEquals(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (a === b) return true;
  if (a.d !== b.d) return false;
  if (a.x !== b.x) return false;
  if (a.y !== b.y) return false;
  if (a.vx !== b.vx) return false;
  if (a.vy !== b.vy) return false;
  if (
    (a as { expiredSince?: unknown }).expiredSince !==
    (b as { expiredSince?: unknown }).expiredSince
  ) {
    return false;
  }
  const sa = a.state;
  const sb = b.state;
  if (sa === sb) return true;
  if (!sa || !sb) return false;
  return JSON.stringify(sa) === JSON.stringify(sb);
}

export function diffTickStates(
  prev: TickStateExpanded,
  next: TickStateExpanded,
): { delta: TickStateExpanded; rm: TickRmCompact | undefined; isEmpty: boolean } {
  const delta: TickStateExpanded = { players: [], npcs: [], loots: [] };
  const rmAcc = { p: [] as string[], n: [] as string[], l: [] as string[] };

  const bucketToRm: Record<keyof TickStateExpanded, keyof typeof rmAcc> = {
    players: "p",
    npcs: "n",
    loots: "l",
  };

  (["players", "npcs", "loots"] as const).forEach((bucket) => {
    const prevArr = prev[bucket];
    const nextArr = next[bucket];
    const prevMap = new Map(prevArr.map((e: { id: unknown }) => [String(e.id), e]));
    const nextMap = new Map(nextArr.map((e: { id: unknown }) => [String(e.id), e]));

    for (const id of prevMap.keys()) {
      if (!nextMap.has(id)) rmAcc[bucketToRm[bucket]].push(id);
    }
    for (const [id, eNext] of nextMap) {
      const ePrev = prevMap.get(id);
      if (!ePrev) {
        delta[bucket].push(eNext);
        continue;
      }
      if (
        !tickEntityEquals(
          ePrev as Record<string, unknown>,
          eNext as Record<string, unknown>,
        )
      ) {
        delta[bucket].push(eNext);
      }
    }
  });

  const rm = compactRm(rmAcc);
  const isEmpty =
    delta.players.length === 0 &&
    delta.npcs.length === 0 &&
    delta.loots.length === 0 &&
    !rm;

  return { delta, rm, isEmpty };
}
