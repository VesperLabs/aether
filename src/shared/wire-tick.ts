/**
 * Compact tick snapshot keys — shorter JSON on every room broadcast (~20Hz).
 * Client expands before interpolation / updateState loops.
 */

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
