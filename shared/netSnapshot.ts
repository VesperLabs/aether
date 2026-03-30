/**
 * Server snapshot wire format + small ring buffer (replaces @geckos.io/snapshot-interpolation).
 * Collision stays correct on the server; the client only blends between two past authoritative poses.
 */

export type NetSnapshotState = Record<string, unknown[]>;

export type NetSnapshot = {
  id: string;
  time: number;
  /** Monotonic room tick index (for ordering / future delta encoding). */
  seq?: number;
  state: NetSnapshotState;
  /** When true, `state` is a compact delta; client merges onto the previous keyframe. */
  delta?: boolean;
  /** Removed entity ids (compact keys: p / n / l). */
  rm?: { p?: string[]; n?: string[]; l?: string[] };
};

function newSnapshotId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function assertEntitiesHaveIds(state: object): void {
  for (const key of Object.keys(state)) {
    const arr = (state as Record<string, unknown>)[key];
    if (!Array.isArray(arr)) continue;
    for (const e of arr) {
      if (e == null || typeof e !== "object") continue;
      const id = (e as { id?: unknown }).id;
      if (typeof id !== "string" && typeof id !== "number") {
        throw new Error(`createSnapshot: each entity in "${key}" needs a string or number id`);
      }
    }
  }
}

/** One tick payload for a room: { players, npcs, loots, ... } */
export function createSnapshot(state: object, seq?: number): NetSnapshot {
  assertEntitiesHaveIds(state);
  return {
    id: newSnapshotId(),
    time: Date.now(),
    ...(seq !== undefined ? { seq } : {}),
    state: state as NetSnapshotState,
  };
}

export function createDeltaSnapshot(
  stateCompact: Record<string, unknown>,
  rm: { p?: string[]; n?: string[]; l?: string[] } | undefined,
  seq: number,
): NetSnapshot {
  assertEntitiesHaveIds(stateCompact);
  return {
    id: newSnapshotId(),
    time: Date.now(),
    seq,
    delta: true,
    ...(rm ? { rm } : {}),
    state: stateCompact as NetSnapshotState,
  };
}

/** Same behavior as the old geckos Vault: keep last ~120, get() returns newest. */
export class SnapshotVault {
  private _vault: NetSnapshot[] = [];
  private readonly _maxSize = 120;

  add(snapshot: NetSnapshot): void {
    if (this._vault.length > this._maxSize - 1) {
      this._vault.sort((a, b) => a.time - b.time);
      this._vault.shift();
    }
    this._vault.push(snapshot);
  }

  get(): NetSnapshot | undefined {
    if (this._vault.length === 0) return undefined;
    const sorted = [...this._vault].sort((a, b) => b.time - a.time);
    return sorted[0];
  }
}
