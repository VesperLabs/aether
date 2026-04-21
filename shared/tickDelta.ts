import { encodeWireDirection } from "./netWire";
import { pickTickStateLite } from "./tickState";
import { expandTickState, type TickStateExpanded } from "./wireTick";

export type { TickStateExpanded } from "./wireTick";
export { expandTickState } from "./wireTick";

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
      if (JSON.stringify(ePrev) !== JSON.stringify(eNext)) {
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

/** Baseline for delta merge — same wire shape as tick snapshots (heroInit uses full character objects). */
export function heroInitToTickExpanded(args: {
  players?: unknown[];
  npcs?: unknown[];
  loots?: unknown[];
}): TickStateExpanded {
  const players = (args.players ?? []).map((raw: Record<string, unknown>) => ({
    id: raw.socketId ?? raw.id,
    d: encodeWireDirection(raw.direction as string),
    state: pickTickStateLite(raw.state as Record<string, unknown>),
    x: raw.x,
    y: raw.y,
    vx: (raw.vx as number) ?? 0,
    vy: (raw.vy as number) ?? 0,
  }));

  const npcs = (args.npcs ?? []).map((raw: Record<string, unknown>) => ({
    id: raw.id,
    d: encodeWireDirection(raw.direction as string),
    state: pickTickStateLite(raw.state as Record<string, unknown>),
    x: raw.x,
    y: raw.y,
    vx: (raw.vx as number) ?? 0,
    vy: (raw.vy as number) ?? 0,
  }));

  const loots = (args.loots ?? []).map((raw: Record<string, unknown>) => {
    const o: { id: string; expiredSince?: number } = { id: String(raw.id) };
    if (raw.expiredSince != null) o.expiredSince = raw.expiredSince as number;
    return o;
  });

  return { players, npcs, loots };
}
