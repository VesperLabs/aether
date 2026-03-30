/**
 * Server snapshot wire format + small ring buffer (replaces @geckos.io/snapshot-interpolation).
 * Collision stays correct on the server; the client only blends between two past authoritative poses.
 */

export type NetSnapshotState = Record<string, unknown[]>;

export type NetSnapshot = {
  id: string;
  time: number;
  state: NetSnapshotState;
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
export function createSnapshot(state: object): NetSnapshot {
  assertEntitiesHaveIds(state);
  return {
    id: newSnapshotId(),
    time: Date.now(),
    state: state as NetSnapshotState,
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
