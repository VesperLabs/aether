/**
 * Client snapshot buffer + linear blend between two authoritative server ticks.
 *
 * - Vault is kept sorted by snapshot time (insert on add). Interpolation uses binary search — no
 *   full sort on every frame (that was a major hot path: 2× per frame at 60fps).
 * - Real collision is server-side Phaser; the client only displays interpolated poses.
 */

import { DEFAULT_SERVER_FPS } from "../../shared/constants";
import { expandTickState, mergeTickDelta } from "../../shared/tickDelta";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {object} options
 * @param {number} [options.serverFps]
 * @param {number} [options.bufferTicks] — delay = (1000/fps)*ticks
 * @param {number} [options.maxSnapshots]
 */
export function createNetInterpolator(options = {}) {
  const serverFps = options.serverFps ?? DEFAULT_SERVER_FPS;
  const bufferTicks = options.bufferTicks ?? 2;
  const maxSnapshots = options.maxSnapshots ?? 120;
  const extraBufferMs = options.extraBufferMs ?? 0;
  const bufferMs = (1000 / serverFps) * bufferTicks + extraBufferMs;

  let timeOffset = -1;
  const vault = [];
  /** Authoritative merged tick state (delta ticks apply on top). */
  let lastMergedState = null;

  /** Hard resync only on large drift (tab sleep, reconnect); smooth small jitter from RTT spikes. */
  const CLOCK_HARD_RESYNC_MS = 400;
  const CLOCK_SMOOTH = 0.22;

  function insertSnapshotSorted(snapshot) {
    const t = snapshot.time;
    let lo = 0;
    let hi = vault.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (vault[mid].time <= t) lo = mid + 1;
      else hi = mid;
    }
    vault.splice(lo, 0, snapshot);
    while (vault.length > maxSnapshots) {
      vault.shift();
    }
  }

  function addSnapshot(snapshot) {
    if (!snapshot?.time) return;
    let expanded;
    if (snapshot.delta) {
      if (!lastMergedState) return;
      expanded = mergeTickDelta(lastMergedState, snapshot.state, snapshot.rm);
    } else {
      expanded = expandTickState(snapshot.state);
    }
    lastMergedState = JSON.parse(JSON.stringify(expanded));
    const normalized = { ...snapshot, state: expanded };

    const timeNow = Date.now();
    const ts = snapshot.time;
    if (timeOffset === -1) {
      timeOffset = timeNow - ts;
    } else {
      const o = timeNow - ts;
      const drift = o - timeOffset;
      if (Math.abs(drift) > CLOCK_HARD_RESYNC_MS) {
        timeOffset = o;
      } else {
        timeOffset += drift * CLOCK_SMOOTH;
      }
    }
    insertSnapshotSorted(normalized);
  }

  function seedFromHeroInit(expanded) {
    vault.length = 0;
    timeOffset = -1;
    lastMergedState = JSON.parse(JSON.stringify(expanded));
  }

  /**
   * Largest index i with vault[i].time <= serverTime (vault sorted ascending by time).
   */
  function rightmostLeq(serverTime) {
    let lo = -1;
    let hi = vault.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (vault[mid].time <= serverTime) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /**
   * @param {"players" | "npcs"} key
   * @returns {null | {
   *   state: object[],
   *   olderId: string,
   *   newerId: string,
   *   olderTime: number,
   *   newerTime: number
   * }}
   */
  function interpolateEntityList(key) {
    if (timeOffset === -1 || vault.length < 2) return null;

    const serverTime = Date.now() - timeOffset - bufferMs;
    if (serverTime < vault[0].time) return null;

    const i = rightmostLeq(serverTime);
    if (i < 0 || i >= vault.length - 1) return null;

    const older = vault[i];
    const newer = vault[i + 1];
    const t0 = older.time;
    const t1 = newer.time;
    const dur = t1 - t0;
    if (dur <= 0) return null;

    let u = (serverTime - t0) / dur;
    u = Math.max(0, Math.min(1, u));

    const olderArr = older.state[key] || [];
    const newerArr = newer.state[key] || [];
    const out = [];

    for (const e1 of newerArr) {
      const e0 = olderArr.find((e) => e.id === e1.id);
      if (!e0) {
        out.push({ ...e1 });
        continue;
      }

      const x0 = e0.x ?? 0;
      const y0 = e0.y ?? 0;
      const x1 = e1.x ?? 0;
      const y1 = e1.y ?? 0;
      const vx0 = e0.vx ?? 0;
      const vy0 = e0.vy ?? 0;
      const vx1 = e1.vx ?? 0;
      const vy1 = e1.vy ?? 0;

      out.push({
        ...e1,
        x: lerp(x0, x1, u),
        y: lerp(y0, y1, u),
        vx: lerp(vx0, vx1, u),
        vy: lerp(vy0, vy1, u),
      });
    }

    return {
      state: out,
      olderId: older.id,
      newerId: newer.id,
      olderTime: older.time,
      newerTime: newer.time,
    };
  }

  return { addSnapshot, interpolateEntityList, seedFromHeroInit };
}
