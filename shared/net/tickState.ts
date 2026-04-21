/**
 * Per-tick entity shape shared by server emit and client apply.
 *
 * Two wire forms:
 * - Expanded: `{ players, npcs, loots }` (used in-memory on both sides).
 * - Compact:  `{ p, n, l }` (shorter keys on the wire).
 *
 * `pickTickStateLite` is the tiny subset of `Character.state` sent on every tick.
 * `heroInitToTickExpanded` adapts the full-character `heroInit` payload into the same
 * expanded tick shape so delta merges have a valid baseline on connect / room change.
 */

import { encodeWireDirection } from "./direction";

export type TickStateExpanded = {
  players: unknown[];
  npcs: unknown[];
  loots: unknown[];
};

export type TickStateCompact = {
  p: unknown[];
  n: unknown[];
  l: unknown[];
};

export function compactTickState(state: TickStateExpanded): TickStateCompact {
  return { p: state.players, n: state.npcs, l: state.loots };
}

export function expandTickState(
  state: Record<string, unknown> & Partial<TickStateExpanded> & Partial<TickStateCompact>,
): TickStateExpanded {
  if (Array.isArray(state.players)) {
    return {
      players: state.players,
      npcs: Array.isArray(state.npcs) ? state.npcs : [],
      loots: Array.isArray(state.loots) ? state.loots : [],
    };
  }
  return {
    players: (state.p as unknown[]) ?? [],
    npcs: (state.n as unknown[]) ?? [],
    loots: (state.l as unknown[]) ?? [],
  };
}

/**
 * Subset of `Character.state` sent on every tick — must match server `getTickStateLite` and
 * the client `updateState` merge in `Player` / `Npc`.
 */
export function pickTickStateLite(
  s: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!s) return {};
  return {
    lockedPlayerId: s.lockedPlayerId,
    bubbleMessage: s.bubbleMessage,
    doHpRegen: s.doHpRegen,
    doBuffPoison: s.doBuffPoison,
    doHpBuffRegen: s.doHpBuffRegen,
    doMpRegen: s.doMpRegen,
    doSpRegen: s.doSpRegen,
    lastCombat: s.lastCombat,
    lastAngle: s.lastAngle,
    isAiming: s.isAiming,
    isHoldingAttack: s.isHoldingAttack,
  };
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
